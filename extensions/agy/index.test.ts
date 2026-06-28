// Agy tests cover provider registration and CLI stream behavior.
import type { Model } from "openclaw/plugin-sdk/llm";
import { createTestPluginApi } from "openclaw/plugin-sdk/plugin-test-api";
import { describe, expect, it, vi } from "vitest";
import plugin from "./index.js";
import {
  buildAgyCliArgs,
  createAgyStreamFn,
  formatAgyPrompt,
  readAgyPluginConfig,
  stripOpenClawToolingSections,
} from "./stream.js";

function collectProviderRegistration(pluginConfig: Record<string, unknown> = {}) {
  const registerProvider = vi.fn();
  const registerCliBackend = vi.fn();
  plugin.register(
    createTestPluginApi({
      id: "agy",
      name: "Agy",
      source: "test",
      config: {},
      pluginConfig,
      runtime: {} as never,
      registerProvider,
      registerCliBackend,
    }),
  );
  expect(registerProvider).toHaveBeenCalledTimes(1);
  return {
    provider: registerProvider.mock.calls[0]?.[0] as Record<string, unknown>,
    cliBackend: registerCliBackend.mock.calls[0]?.[0] as Record<string, unknown>,
  };
}

const testModel = {
  id: "gemini-3.5-flash",
  name: "Gemini 3.5 Flash",
  api: "openai-completions",
  provider: "agy",
  baseUrl: "cli://agy",
  reasoning: true,
  input: ["text", "image"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 200_000,
  maxTokens: 32_000,
} satisfies Model;

describe("agy provider", () => {
  it("registers a cli-backed provider without requiring an api key", async () => {
    const { provider, cliBackend } = collectProviderRegistration();

    expect(provider.id).toBe("agy");
    expect(provider.label).toBe("Agy CLI");
    expect(cliBackend).toMatchObject({
      id: "agy",
      modelProvider: "agy",
      nativeToolMode: "always-on",
      config: {
        command: "agy",
        args: ["--print-timeout", "10m", "--print", "{prompt}"],
        output: "text",
        input: "arg",
        modelAliases: {
          flash: "gemini-3.5-flash",
          pro: "gemini-3.1-pro",
        },
        sessionMode: "none",
        imageArg: "@",
        imagePathScope: "workspace",
        systemPromptTransport: "prompt-prefix",
      },
    });
    expect(provider.resolveSyntheticAuth).toEqual(expect.any(Function));
    expect((provider.resolveSyntheticAuth as () => unknown)()).toEqual({
      apiKey: "agy-cli",
      source: "agy-cli",
      mode: "token",
    });

    const auth = provider.auth as Array<{ run: () => Promise<unknown> }>;
    await expect(auth[0]?.run()).resolves.toMatchObject({
      defaultModel: "agy/gemini-3.5-flash",
      profiles: [],
      configPatch: {
        models: {
          providers: {
            agy: {
              baseUrl: "cli://agy",
              apiKey: "agy-cli",
              models: [
                expect.objectContaining({
                  id: "gemini-3.5-flash",
                  name: "Gemini 3.5 Flash",
                  reasoning: true,
                }),
                expect.objectContaining({
                  id: "gemini-3.1-pro",
                  name: "Gemini 3.1 Pro",
                  reasoning: true,
                }),
              ],
            },
          },
        },
        agents: {
          defaults: {
            models: {
              "agy/gemini-3.5-flash": { agentRuntime: { id: "agy" } },
              "agy/gemini-3.1-pro": { agentRuntime: { id: "agy" } },
            },
          },
        },
      },
    });
  });

  it("exposes Gemini thinking profiles and maps thinking to agy model variants", () => {
    const { provider, cliBackend } = collectProviderRegistration();
    const resolveThinkingProfile = provider.resolveThinkingProfile as (ctx: {
      modelId: string;
    }) => { levels: Array<{ id: string }>; defaultLevel?: string };

    expect(resolveThinkingProfile({ modelId: "gemini-3.5-flash" })).toMatchObject({
      defaultLevel: "adaptive",
      levels: [
        { id: "off" },
        { id: "minimal" },
        { id: "low" },
        { id: "medium" },
        { id: "adaptive" },
        { id: "high" },
      ],
    });
    expect(resolveThinkingProfile({ modelId: "gemini-3.1-pro" })).toMatchObject({
      defaultLevel: "adaptive",
      levels: [{ id: "off" }, { id: "low" }, { id: "adaptive" }, { id: "high" }],
    });

    const resolveExecutionArgs = cliBackend.resolveExecutionArgs as (ctx: {
      baseArgs: string[];
      modelId: string;
      thinkingLevel?: "low" | "medium" | "high" | "adaptive";
    }) => readonly string[];
    expect(
      resolveExecutionArgs({
        baseArgs: ["--print", "{prompt}"],
        modelId: "gemini-3.5-flash",
        thinkingLevel: "medium",
      }),
    ).toEqual(["--model", "gemini-3.5-flash-medium", "--print", "{prompt}"]);
    expect(
      resolveExecutionArgs({
        baseArgs: ["--print", "{prompt}"],
        modelId: "gemini-3.1-pro",
        thinkingLevel: "high",
      }),
    ).toEqual(["--model", "gemini-3.1-pro-high", "--print", "{prompt}"]);
  });

  it("filters OpenClaw system prompts for the CLI backend transport", () => {
    const { cliBackend } = collectProviderRegistration();
    const transformSystemPrompt = cliBackend.transformSystemPrompt as (ctx: {
      provider: string;
      modelId: string;
      modelDisplay: string;
      systemPrompt: string;
    }) => string;
    const transformed = transformSystemPrompt({
      provider: "agy",
      modelId: "gemini-3.5-flash",
      modelDisplay: "Gemini 3.5 Flash",
      systemPrompt: [
        "You are an assistant.",
        "",
        "## Tooling",
        "Call OpenClaw JSON tools.",
        "",
        "## Skills",
        "<available_skills>large skill list</available_skills>",
        "",
        "## Safety",
        "Stay safe.",
      ].join("\n"),
    });

    expect(transformed).toContain("Use agy's native tools");
    expect(transformed).toContain("You are an assistant.");
    expect(transformed).toContain("## Safety\nStay safe.");
    expect(transformed).not.toContain("Call OpenClaw JSON tools.");
    expect(transformed).not.toContain("<available_skills>");
  });

  it("caps filtered system prompts before sending them through agy CLI", () => {
    const { cliBackend } = collectProviderRegistration();
    const transformSystemPrompt = cliBackend.transformSystemPrompt as (ctx: {
      provider: string;
      modelId: string;
      modelDisplay: string;
      systemPrompt: string;
    }) => string;
    const transformed = transformSystemPrompt({
      provider: "agy",
      modelId: "gemini-3.5-flash",
      modelDisplay: "Gemini 3.5 Flash",
      systemPrompt: ["Intro", "x".repeat(60_000), "Tail"].join("\n"),
    });

    expect(transformed.length).toBeLessThan(25_000);
    expect(transformed).toContain("Intro");
    expect(transformed).toContain("Tail");
    expect(transformed).toContain("truncated for agy CLI transport");
  });

  it("formats visible OpenClaw context into a single agy prompt with filtered system prompt", () => {
    const prompt = formatAgyPrompt({
      systemPrompt: ["Be direct.", "", "## Tooling", "Use OpenClaw tool JSON."].join("\n"),
      messages: [
        { role: "user", content: "hello", timestamp: 1 },
        {
          role: "assistant",
          content: [{ type: "text", text: "hi" }],
          api: "openai-completions",
          provider: "agy",
          model: "default",
          usage: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
          },
          stopReason: "stop",
          timestamp: 2,
        },
        {
          role: "toolResult",
          toolCallId: "tool-1",
          toolName: "read_file",
          content: [{ type: "text", text: "file text" }],
          isError: false,
          timestamp: 3,
        },
      ],
    });

    expect(prompt).toContain("System:\n");
    expect(prompt).toContain("Use agy's native tools");
    expect(prompt).toContain("Be direct.");
    expect(prompt).not.toContain("Use OpenClaw tool JSON.");
    expect(prompt).toContain("User:\nhello");
    expect(prompt).toContain("Assistant:\nhi");
    expect(prompt).toContain("Tool result (read_file):\nfile text");
  });

  it("can include or omit OpenClaw system prompt when explicitly configured", () => {
    expect(
      formatAgyPrompt(
        {
          systemPrompt: "Be direct.",
          messages: [{ role: "user", content: "hello", timestamp: 1 }],
        },
        { includeSystemPrompt: true },
      ),
    ).toContain("Be direct.");
    expect(
      formatAgyPrompt(
        {
          systemPrompt: "Be direct.",
          messages: [{ role: "user", content: "hello", timestamp: 1 }],
        },
        { systemPromptMode: "none" },
      ),
    ).not.toContain("System:");
  });

  it("strips OpenClaw tooling sections from fallback system prompts", () => {
    expect(
      stripOpenClawToolingSections(
        ["## Identity", "Be direct.", "", "## Tooling", "tool text", "", "## Safety", "Safe."].join(
          "\n",
        ),
      ),
    ).toBe(["## Identity", "Be direct.", "", "## Safety", "Safe."].join("\n"));
  });

  it("builds default and explicit model cli args", () => {
    expect(buildAgyCliArgs({ modelId: "gemini-3.5-flash", prompt: "hello" })).toEqual([
      "-p",
      "hello",
    ]);
    expect(buildAgyCliArgs({ modelId: "gemini", prompt: "hello" })).toEqual([
      "--model",
      "gemini",
      "-p",
      "hello",
    ]);
    expect(
      buildAgyCliArgs({
        modelId: "gemini",
        prompt: "hello",
        config: { args: ["--checkpointing"], modelArg: "-m", promptArg: "--prompt" },
      }),
    ).toEqual(["--checkpointing", "-m", "gemini", "--prompt", "hello"]);
  });

  it("wraps agy stdout as assistant stream events", async () => {
    const runner = vi.fn(async () => ({
      stdout: "\u001B[32manswer\u001B[0m",
      stderr: "",
      exitCode: 0,
      signal: null,
    }));
    const stream = createAgyStreamFn({ runner })(testModel, {
      messages: [{ role: "user", content: "question", timestamp: 1 }],
    });
    const events = [];
    for await (const event of await stream) {
      events.push(event);
    }

    expect(runner).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "agy",
        args: [
          "-p",
          [
            "System:",
            "You are running inside agy CLI via OpenClaw. Use agy's native tools when needed; do not emit OpenClaw-specific tool-call syntax.",
            "",
            "Conversation:",
            "User:",
            "question",
          ].join("\n"),
        ],
      }),
    );
    expect(events.map((event) => event.type)).toEqual([
      "start",
      "text_start",
      "text_delta",
      "text_end",
      "done",
    ]);
    expect(events[2]).toMatchObject({ type: "text_delta", delta: "answer" });
    await expect((await stream).result()).resolves.toMatchObject({
      role: "assistant",
      content: [{ type: "text", text: "answer" }],
      provider: "agy",
      model: "gemini-3.5-flash",
      stopReason: "stop",
    });
  });

  it("uses plugin config for the stream factory", async () => {
    const { provider } = collectProviderRegistration({
      command: "custom-agy",
      args: ["--permissions", "default"],
      timeoutMs: 12345,
    });
    const createStreamFn = provider.createStreamFn as (ctx: {
      config?: Parameters<typeof readAgyPluginConfig>[0];
      provider: string;
      model: Model;
      modelId: string;
    }) => unknown;

    expect(createStreamFn({ provider: "other", model: testModel, modelId: "default" })).toBe(
      undefined,
    );
    expect(
      createStreamFn({ provider: "agy", model: testModel, modelId: "gemini-3.5-flash" }),
    ).toEqual(expect.any(Function));
  });
});
