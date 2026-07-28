import type { CliBackendPlugin } from "openclaw/plugin-sdk/cli-backend";
import { CLI_FRESH_WATCHDOG_DEFAULTS } from "openclaw/plugin-sdk/cli-backend";
import { AGY_DEFAULT_MODEL_REF, AGY_PROVIDER_ID } from "./catalog.js";
import {
  agyModelDirectory,
  type AgyModelDirectoryConfig,
  readAgyModelDirectoryConfig,
} from "./model-directory.js";
import { readAgyPluginConfig, resolveAgySystemPrompt } from "./stream.js";

type AgyThinkingLevel = NonNullable<
  Parameters<NonNullable<CliBackendPlugin["resolveExecutionArgs"]>>[0]["thinkingLevel"]
>;

const AGY_CLI_BACKEND_CONFIG: CliBackendPlugin["config"] = {
  command: "agy",
  args: ["--print-timeout", "10m", "--print", "{prompt}"],
  output: "text",
  input: "arg",
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
};

function readAgyBackendDirectoryConfig(params: {
  config?: Parameters<typeof readAgyPluginConfig>[0];
  workspaceDir?: string;
}): AgyModelDirectoryConfig {
  const override = params.config?.agents?.defaults?.cliBackends?.[AGY_PROVIDER_ID];
  return {
    command: override?.command ?? AGY_CLI_BACKEND_CONFIG.command,
    cwd: params.workspaceDir,
    env: override?.env,
    fallbackModels: readAgyModelDirectoryConfig(params.config).fallbackModels,
  };
}

function resolveAgyThinkingModel(params: {
  config?: Parameters<typeof readAgyPluginConfig>[0];
  workspaceDir?: string;
  modelId: string;
  thinkingLevel?: AgyThinkingLevel;
}): string {
  return agyModelDirectory.resolveExecutionModel(
    params.modelId,
    params.thinkingLevel,
    readAgyBackendDirectoryConfig(params),
  );
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
    prepareExecution: async ({ config, workspaceDir }) => {
      await agyModelDirectory.prepare(readAgyBackendDirectoryConfig({ config, workspaceDir }));
      return {};
    },
    transformSystemPrompt: ({ config, systemPrompt }) => {
      const agyConfig = readAgyPluginConfig(config);
      return (
        resolveAgySystemPrompt(systemPrompt, {
          systemPromptMode: agyConfig.systemPromptMode,
          includeSystemPrompt: agyConfig.includeSystemPrompt,
        }) ?? systemPrompt
      );
    },
    config: AGY_CLI_BACKEND_CONFIG,
    resolveExecutionArgs: ({ baseArgs, config, workspaceDir, modelId, thinkingLevel }) => [
      "--model",
      resolveAgyThinkingModel({ config, workspaceDir, modelId, thinkingLevel }),
      ...baseArgs,
    ],
  };
}
