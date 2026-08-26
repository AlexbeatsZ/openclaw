import { describe, expect, it } from "vitest";
import {
  classifyRuntimeError,
  describeRuntimeError,
  formatRuntimeErrorInline,
} from "./runtime-error.ts";

describe("runtime error localization", () => {
  const zh = (key: string) =>
    ({
      "runtimeError.rateLimit.title": "请求过于频繁",
      "runtimeError.rateLimit.guidance": "请稍后重试。",
      "runtimeError.timeout.title": "请求超时",
      "runtimeError.timeout.guidance": "请检查服务或网络。",
      "runtimeError.technicalDetails": "技术详情",
    })[key] ?? key;

  it.each([
    ["timeout", "reset probe returned no stdout", "timeout"],
    [null, "HTTP 429: too many requests", "rateLimit"],
    [null, "getaddrinfo ENOTFOUND api.example.com", "network"],
    [null, "JSON parse error in provider response", "invalidResponse"],
    [null, "JSON parse error: invalid token at position 0", "invalidResponse"],
    [null, "invalid access token", "auth"],
    [null, "ENOSPC: no space left on device", "resourceLimit"],
    [null, "process exited with code 1", "process"],
    [null, "an unfamiliar provider failure", "unknown"],
  ] as const)("classifies code %s and message %s", (code, message, expected) => {
    expect(classifyRuntimeError(message, code)).toBe(expected);
  });

  it("shows a Chinese explanation and preserves the raw error", () => {
    const options = { locale: "zh-CN" as const, translate: zh };
    const presentation = describeRuntimeError("HTTP 429: too many requests", null, options);
    expect(presentation).toMatchObject({
      kind: "rateLimit",
      localized: true,
      raw: "HTTP 429: too many requests",
    });
    expect(presentation?.summary).toContain("请求过于频繁");
    expect(formatRuntimeErrorInline("HTTP 429: too many requests", null, options)).toContain(
      "HTTP 429: too many requests",
    );
  });

  it("does not wrap an error that is already Chinese", () => {
    expect(
      describeRuntimeError("连接失败，请稍后重试", null, {
        locale: "zh-CN",
        translate: zh,
      }),
    ).toMatchObject({
      localized: false,
      summary: "连接失败，请稍后重试",
    });
  });

  it("still localizes an English diagnostic containing a Chinese filename", () => {
    expect(
      describeRuntimeError("ENOENT: no such file or directory, open '报告.txt'", null, {
        locale: "zh-CN",
        translate: zh,
      }),
    ).toMatchObject({
      kind: "notFound",
      localized: true,
    });
  });

  it("preserves a caller's contextual fallback outside zh-CN", () => {
    const options = {
      locale: "en" as const,
      fallback: "App unavailable: connection closed",
    };
    expect(describeRuntimeError("connection closed", null, options)).toMatchObject({
      raw: "connection closed",
      summary: "App unavailable: connection closed",
      localized: false,
    });
    expect(formatRuntimeErrorInline("connection closed", null, options)).toBe(
      "App unavailable: connection closed",
    );
  });

  it("uses contextual fallback text when the rejection has no raw message", () => {
    expect(
      formatRuntimeErrorInline(undefined, null, {
        locale: "en",
        fallback: "Update error: undefined",
      }),
    ).toBe("Update error: undefined");
    expect(
      describeRuntimeError(new Error(""), null, {
        locale: "zh-CN",
        translate: zh,
        fallback: "Approval failed: ",
      }),
    ).toMatchObject({
      localized: true,
      raw: "Approval failed: ",
    });
  });

  it("preserves raw diagnostic whitespace in technical details", () => {
    const raw = "\n  process exited with code 1\n";
    expect(
      describeRuntimeError(raw, null, {
        locale: "zh-CN",
        translate: zh,
      })?.raw,
    ).toBe(raw);
  });
});
