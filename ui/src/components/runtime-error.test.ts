import { describe, expect, it } from "vitest";
import { i18n } from "../i18n/index.ts";
import {
  classifyRuntimeError,
  describeRuntimeError,
  formatRuntimeErrorInline,
} from "./runtime-error.ts";

describe("runtime error localization", () => {
  it.each([
    ["timeout", "reset probe returned no stdout", "timeout"],
    ["tls_certificate", "provider request failed", "network"],
    [null, "HTTP 429: too many requests", "rateLimit"],
    [null, "getaddrinfo ENOTFOUND api.example.com", "network"],
    [null, "JSON parse error in provider response", "invalidResponse"],
    [null, "invalid access token", "auth"],
    [null, "ENOSPC: no space left on device", "resourceLimit"],
    [null, "process exited with code 1", "process"],
    [null, "an unfamiliar provider failure", "unknown"],
  ] as const)("classifies code %s and message %s", (code, message, expected) => {
    expect(classifyRuntimeError(message, code)).toBe(expected);
  });

  it("shows a Chinese explanation and preserves the raw error", () => {
    const options = { locale: "zh-CN" };
    expect(describeRuntimeError("HTTP 429: too many requests", null, options)).toMatchObject({
      kind: "rateLimit",
      localized: true,
      raw: "HTTP 429: too many requests",
      summary: expect.stringContaining("请求过于频繁"),
    });
    expect(formatRuntimeErrorInline("HTTP 429: too many requests", null, options)).toContain(
      "HTTP 429: too many requests",
    );
  });

  it("does not wrap an error that is already Chinese", () => {
    expect(describeRuntimeError("连接失败，请稍后重试", null, { locale: "zh-CN" })).toMatchObject({
      localized: false,
      summary: "连接失败，请稍后重试",
    });
  });

  it("still localizes an English diagnostic containing a Chinese filename", () => {
    expect(
      describeRuntimeError("ENOENT: no such file or directory, open '报告.txt'", null, {
        locale: "zh-CN",
      }),
    ).toMatchObject({ kind: "notFound", localized: true });
  });

  it("preserves caller fallback and raw whitespace", () => {
    expect(
      describeRuntimeError("connection closed", null, {
        locale: "en",
        fallback: "App unavailable: connection closed",
      }),
    ).toMatchObject({
      raw: "connection closed",
      summary: "App unavailable: connection closed",
      localized: false,
    });
    expect(
      describeRuntimeError("\n  process exited with code 1\n", null, { locale: "zh-CN" })?.raw,
    ).toBe("\n  process exited with code 1\n");
  });

  it("renders Chinese guidance and safe raw details in the shared element", async () => {
    const previousLocale = i18n.getLocale();
    await i18n.setLocale("zh-CN");
    try {
      const element = document.createElement("openclaw-runtime-error") as HTMLElement & {
        error: unknown;
        code?: string;
      };
      element.error = "<img src=x onerror=alert(1)> HTTP 429: too many requests";
      element.code = "rate_limit";
      document.body.append(element);

      expect(element.textContent).toContain("请求过于频繁");
      expect(element.querySelector("details code")?.textContent).toContain("HTTP 429");
      expect(element.querySelector("img")).toBeNull();
      element.remove();
    } finally {
      await i18n.setLocale(previousLocale);
    }
  });
});
