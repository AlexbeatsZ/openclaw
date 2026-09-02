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
type AgyCliEffort = "low" | "medium" | "high";

const AGY_EFFORT_ARG = "--effort";
const AGY_DEFAULT_EFFORT: AgyCliEffort = "high";

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

function normalizeAgyCliBackendConfig(
  config: CliBackendPlugin["config"],
  context?: Parameters<NonNullable<CliBackendPlugin["normalizeConfig"]>>[1],
): CliBackendPlugin["config"] {
  const pluginConfig = readAgyPluginConfig(context?.config);
  return {
    ...config,
    command: pluginConfig.command ?? config.command,
    args: pluginConfig.args ? [...pluginConfig.args, ...(config.args ?? [])] : config.args,
    env: pluginConfig.env ? { ...config.env, ...pluginConfig.env } : config.env,
  };
}

function readAgyBackendDirectoryConfig(params: {
  config?: Parameters<typeof readAgyPluginConfig>[0];
  workspaceDir?: string;
}): AgyModelDirectoryConfig {
  const pluginConfig = readAgyPluginConfig(params.config);
  return {
    command: pluginConfig.command ?? AGY_CLI_BACKEND_CONFIG.command,
    cwd: params.workspaceDir,
    env: pluginConfig.env,
    timeoutMs: pluginConfig.timeoutMs,
    maxOutputBytes: pluginConfig.maxOutputBytes,
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

function resolveAgyCliEffort(thinkingLevel?: AgyThinkingLevel): AgyCliEffort {
  // Agy 1.1.12 requires an explicit low/medium/high effort for Gemini models.
  // Some non-chat entry points can omit OpenClaw's turn-local level even when
  // the selected model's configured default is high, so fail closed to high.
  switch (thinkingLevel) {
    case "minimal":
    case "low":
      return "low";
    case "medium":
      return "medium";
    case "high":
    case "xhigh":
    case "max":
      return "high";
    default:
      return AGY_DEFAULT_EFFORT;
  }
}

function stripAgyEffortArgs(args: readonly string[]): string[] {
  const normalized: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    if (arg === AGY_EFFORT_ARG) {
      const value = args[index + 1];
      if (typeof value === "string" && value.trim() && !value.startsWith("-")) {
        index += 1;
      }
      continue;
    }
    if (arg.startsWith(`${AGY_EFFORT_ARG}=`)) {
      continue;
    }
    normalized.push(arg);
  }
  return normalized;
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
    normalizeConfig: normalizeAgyCliBackendConfig,
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
        }) ?? ""
      );
    },
    config: AGY_CLI_BACKEND_CONFIG,
    resolveExecutionArgs: ({ baseArgs, config, workspaceDir, modelId, thinkingLevel }) => {
      const pluginConfig = readAgyPluginConfig(config);
      const effort = resolveAgyCliEffort(thinkingLevel);
      const effectiveThinkingLevel = thinkingLevel ?? effort;
      return [
        pluginConfig.modelArg ?? "--model",
        resolveAgyThinkingModel({
          config,
          workspaceDir,
          modelId,
          thinkingLevel: effectiveThinkingLevel,
        }),
        AGY_EFFORT_ARG,
        effort,
        ...stripAgyEffortArgs(baseArgs),
      ];
    },
  };
}
