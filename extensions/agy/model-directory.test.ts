import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AgyModelDirectory,
  parseAgyModelDirectory,
  setAgyModelDirectoryRunnerForTests,
} from "./model-directory.js";

describe("AgyModelDirectory", () => {
  beforeEach(() => {
    setAgyModelDirectoryRunnerForTests(undefined);
  });

  it("parses CRLF output, ignores non-Gemini models, and chooses numeric latest versions", () => {
    expect(
      parseAgyModelDirectory(
        [
          "gemini-3.9-flash-low",
          "gemini-3.10-flash-low",
          "gemini-3.10-flash-medium",
          "gemini-3.10-flash-high",
          "gemini-3.10-flash-high",
          "gemini-3.4-pro-low",
          "gemini-3.4-pro-high",
          "claude-sonnet-4-6",
          "gpt-5.6",
          "",
        ].join("\r\n"),
      ),
    ).toEqual([
      {
        id: "flash",
        name: "Gemini Flash (auto: gemini-3.10-flash)",
        resolvedModelId: "gemini-3.10-flash-medium",
        thinkingLevels: ["low", "medium", "high"],
        thinkingModels: {
          low: "gemini-3.10-flash-low",
          medium: "gemini-3.10-flash-medium",
          high: "gemini-3.10-flash-high",
        },
      },
      {
        id: "pro",
        name: "Gemini Pro (auto: gemini-3.4-pro)",
        resolvedModelId: "gemini-3.4-pro-high",
        thinkingLevels: ["low", "high"],
        thinkingModels: {
          low: "gemini-3.4-pro-low",
          high: "gemini-3.4-pro-high",
        },
      },
    ]);
  });

  it("preserves human-readable model names exactly as executable variants", () => {
    expect(
      parseAgyModelDirectory(
        [
          "Gemini 3.6 Flash (Low)",
          "Gemini 3.6 Flash (Medium)",
          "Gemini 3.6 Flash (High)",
          "Gemini 3.1 Pro (Low)",
          "Gemini 3.1 Pro (High)",
        ].join("\n"),
      ),
    ).toEqual([
      {
        id: "flash",
        name: "Gemini Flash (auto: Gemini 3.6 Flash)",
        resolvedModelId: "Gemini 3.6 Flash (Medium)",
        thinkingLevels: ["low", "medium", "high"],
        thinkingModels: {
          low: "Gemini 3.6 Flash (Low)",
          medium: "Gemini 3.6 Flash (Medium)",
          high: "Gemini 3.6 Flash (High)",
        },
      },
      {
        id: "pro",
        name: "Gemini Pro (auto: Gemini 3.1 Pro)",
        resolvedModelId: "Gemini 3.1 Pro (High)",
        thinkingLevels: ["low", "high"],
        thinkingModels: {
          low: "Gemini 3.1 Pro (Low)",
          high: "Gemini 3.1 Pro (High)",
        },
      },
    ]);
  });

  it("uses only variants reported by agy and shares one in-flight discovery", async () => {
    const runner = vi.fn(async () => ({
      stdout: ["gemini-4.2-flash-low", "gemini-4.2-flash-high"].join("\n"),
      stderr: "",
      exitCode: 0,
      signal: null,
    }));
    setAgyModelDirectoryRunnerForTests(runner);
    const directory = new AgyModelDirectory();

    await Promise.all([directory.prepare(), directory.prepare()]);

    expect(runner).toHaveBeenCalledTimes(1);
    expect(directory.resolveExecutionModel("flash", "minimal")).toBe("gemini-4.2-flash-low");
    expect(directory.resolveExecutionModel("flash", "medium")).toBe("gemini-4.2-flash-high");
    expect(directory.resolveExecutionModel("flash", "high")).toBe("gemini-4.2-flash-high");
  });

  it("fails clearly when agy discovery fails or returns no supported models", async () => {
    setAgyModelDirectoryRunnerForTests(async () => ({
      stdout: "",
      stderr: "not authenticated",
      exitCode: 1,
      signal: null,
    }));
    await expect(new AgyModelDirectory().prepare()).rejects.toThrow(
      "agy models failed with code 1: not authenticated",
    );

    setAgyModelDirectoryRunnerForTests(async () => ({
      stdout: "claude-sonnet-4-6\n",
      stderr: "",
      exitCode: 0,
      signal: null,
    }));
    await expect(new AgyModelDirectory().prepare()).rejects.toThrow(
      "agy models returned no supported Gemini Flash/Pro variants",
    );
  });

  it("uses a persisted dynamic snapshot when live discovery is temporarily unavailable", async () => {
    setAgyModelDirectoryRunnerForTests(async () => {
      throw new Error("agy models timed out");
    });
    const fallback = {
      id: "flash",
      name: "Gemini Flash (cached)",
      resolvedModelId: "gemini-8.2-flash",
      thinkingLevels: ["low", "medium", "high"],
      thinkingModels: {
        low: "gemini-8.2-flash-low",
        medium: "gemini-8.2-flash-medium",
        high: "gemini-8.2-flash-high",
      },
    };
    const directory = new AgyModelDirectory();

    await expect(directory.prepare({ fallbackModels: [fallback] })).resolves.toEqual([fallback]);
    expect(directory.resolveExecutionModel("flash", "high", { fallbackModels: [fallback] })).toBe(
      "gemini-8.2-flash-high",
    );
  });
});
