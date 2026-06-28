import type { CliBackendPlugin } from "openclaw/plugin-sdk/cli-backend";
import { CLI_FRESH_WATCHDOG_DEFAULTS } from "openclaw/plugin-sdk/cli-backend";
import {
  AGY_DEFAULT_MODEL_REF,
  AGY_GEMINI_FLASH_MODEL_ID,
  AGY_GEMINI_PRO_MODEL_ID,
  AGY_PROVIDER_ID,
} from "./catalog.js";

type AgyThinkingLevel = NonNullable<
  Parameters<NonNullable<CliBackendPlugin["resolveExecutionArgs"]>>[0]["thinkingLevel"]
>;

const AGY_MODEL_ALIASES: Record<string, string> = {
  flash: AGY_GEMINI_FLASH_MODEL_ID,
  pro: AGY_GEMINI_PRO_MODEL_ID,
};

function resolveAgyThinkingModel(modelId: string, thinkingLevel?: AgyThinkingLevel): string {
  const level = thinkingLevel ?? "adaptive";
  if (modelId === AGY_GEMINI_PRO_MODEL_ID) {
    if (level === "medium" || level === "high" || level === "xhigh" || level === "max") {
      return `${AGY_GEMINI_PRO_MODEL_ID}-high`;
    }
    if (level === "adaptive") {
      return AGY_GEMINI_PRO_MODEL_ID;
    }
    return `${AGY_GEMINI_PRO_MODEL_ID}-low`;
  }
  if (modelId === AGY_GEMINI_FLASH_MODEL_ID) {
    if (level === "minimal" || level === "off") {
      return `${AGY_GEMINI_FLASH_MODEL_ID}-minimal`;
    }
    if (level === "low") {
      return `${AGY_GEMINI_FLASH_MODEL_ID}-low`;
    }
    if (level === "medium") {
      return `${AGY_GEMINI_FLASH_MODEL_ID}-medium`;
    }
    if (level === "high" || level === "xhigh" || level === "max") {
      return `${AGY_GEMINI_FLASH_MODEL_ID}-high`;
    }
  }
  return modelId;
}

/** Build the OpenClaw CLI backend that executes the local agy command. */
export function buildAgyCliBackend(): CliBackendPlugin {
  return {
    id: AGY_PROVIDER_ID,
    modelProvider: AGY_PROVIDER_ID,
    liveTest: {
      defaultModelRef: AGY_DEFAULT_MODEL_REF,
    },
    nativeToolMode: "always-on",
    config: {
      command: "agy",
      args: ["--print-timeout", "10m", "--print", "{prompt}"],
      output: "text",
      input: "arg",
      modelAliases: AGY_MODEL_ALIASES,
      sessionMode: "none",
      imageArg: "@",
      imagePathScope: "workspace",
      systemPromptTransport: "prompt-prefix",
      systemPromptWhen: "always",
      reliability: {
        watchdog: {
          fresh: { ...CLI_FRESH_WATCHDOG_DEFAULTS },
        },
      },
      serialize: true,
    },
    resolveExecutionArgs: ({ baseArgs, modelId, thinkingLevel }) => [
      "--model",
      resolveAgyThinkingModel(modelId, thinkingLevel),
      ...baseArgs,
    ],
  };
}
