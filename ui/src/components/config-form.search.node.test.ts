// @vitest-environment node
import { describe, expect, it } from "vitest";
import { i18n } from "../i18n/index.ts";
import { SECTION_META } from "./config-form.meta.ts";
import {
  matchesNodeSearch,
  parseConfigSearchQuery,
  resolveConfigFieldMeta,
} from "./config-form.search.ts";

const schema = {
  type: "object",
  properties: {
    gateway: {
      type: "object",
      properties: {
        auth: {
          type: "object",
          properties: {
            token: { type: "string" },
          },
        },
      },
    },
    mode: {
      type: "string",
      enum: ["off", "token"],
    },
  },
};

describe("config form search", () => {
  it("localizes schema metadata without losing English search candidates", async () => {
    await i18n.setLocale("zh-CN");
    const meta = resolveConfigFieldMeta(["logging"], { type: "object", title: "Logging" }, {});

    expect(meta.label).toBe("日志");
    expect(SECTION_META.cron?.label).toBe("定时任务");
    expect(
      matchesNodeSearch({
        schema: { type: "object", title: "Logging" },
        value: {},
        path: ["logging"],
        hints: {},
        criteria: parseConfigSearchQuery("Logging"),
      }),
    ).toBe(true);
    await i18n.setLocale("en");
  });

  it("parses tag-prefixed query terms", () => {
    const parsed = parseConfigSearchQuery("token tag:security tag:Auth");
    expect(parsed.text).toBe("token");
    expect(parsed.tags).toEqual(["security", "auth"]);
  });

  it("matches fields by tag through ui hints", () => {
    const parsed = parseConfigSearchQuery("tag:security");
    const matched = matchesNodeSearch({
      schema: schema.properties.gateway,
      value: {},
      path: ["gateway"],
      hints: {
        "gateway.auth.token": { tags: ["security", "secret"] },
      },
      criteria: parsed,
    });
    expect(matched).toBe(true);
  });

  it("requires text and tag when combined", () => {
    const positive = matchesNodeSearch({
      schema: schema.properties.gateway,
      value: {},
      path: ["gateway"],
      hints: {
        "gateway.auth.token": { tags: ["security"] },
      },
      criteria: parseConfigSearchQuery("token tag:security"),
    });
    expect(positive).toBe(true);

    const negative = matchesNodeSearch({
      schema: schema.properties.gateway,
      value: {},
      path: ["gateway"],
      hints: {
        "gateway.auth.token": { tags: ["security"] },
      },
      criteria: parseConfigSearchQuery("mode tag:security"),
    });
    expect(negative).toBe(false);
  });

  it("searches array item schemas before entries exist", () => {
    const matched = matchesNodeSearch({
      schema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            source: {
              type: "string",
              description: "Credential source for outgoing requests",
            },
          },
        },
      },
      value: [],
      path: ["headers"],
      hints: {},
      criteria: parseConfigSearchQuery("credential source"),
    });

    expect(matched).toBe(true);
  });

  it("searches additional-property schemas before entries exist", () => {
    const matched = matchesNodeSearch({
      schema: {
        type: "object",
        additionalProperties: {
          type: "object",
          properties: {
            url: {
              type: "string",
            },
          },
        },
      },
      value: {},
      path: ["servers"],
      hints: {
        "servers.*.url": {
          help: "Endpoint used by the remote service",
        },
      },
      criteria: parseConfigSearchQuery("remote service"),
    });

    expect(matched).toBe(true);
  });
});
