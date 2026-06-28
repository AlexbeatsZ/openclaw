import type { CliBackendPlugin } from "openclaw/plugin-sdk/cli-backend";
import { CLI_FRESH_WATCHDOG_DEFAULTS } from "openclaw/plugin-sdk/cli-backend";
import { AGY_DEFAULT_MODEL_REF, AGY_PROVIDER_ID } from "./catalog.js";

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
      modelArg: "--model",
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
  };
}
