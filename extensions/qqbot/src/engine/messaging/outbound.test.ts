// Qqbot tests cover direct outbound text delivery behavior.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GatewayAccount } from "../types.js";
import { sendText } from "./outbound.js";

const senderSendTextMock = vi.hoisted(() =>
  vi.fn(async () => ({
    id: "text-id",
    timestamp: "2026-06-29T00:00:00.000Z",
  })),
);
const initApiConfigMock = vi.hoisted(() => vi.fn());

vi.mock("./sender.js", () => ({
  accountToCreds: (account: GatewayAccount) => ({
    appId: account.appId,
    clientSecret: account.clientSecret,
  }),
  initApiConfig: initApiConfigMock,
  sendText: senderSendTextMock,
}));

const account: GatewayAccount = {
  accountId: "default",
  appId: "app",
  clientSecret: "secret",
  markdownSupport: false,
  config: {},
};

describe("sendText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("splits proactive long Chinese text by UTF-8 bytes before sending to QQ", async () => {
    const text = "学习化学时间 > 2h，晶体学方程正常。".repeat(180);

    const result = await sendText({
      to: "group:study",
      text,
      account,
      accountId: account.accountId,
      replyToId: null,
    });

    const sentChunks = senderSendTextMock.mock.calls.map((call) => call[1] as string);
    expect(result.error).toBeUndefined();
    expect(sentChunks.length).toBeGreaterThan(1);
    expect(sentChunks.join("")).toBe(text);
    for (const chunk of sentChunks) {
      expect(Buffer.byteLength(chunk, "utf8")).toBeLessThanOrEqual(3600);
      expect(chunk).not.toContain("\uFFFD");
    }
  });
});
