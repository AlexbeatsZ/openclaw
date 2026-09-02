import type {
  ProviderDefaultThinkingPolicyContext,
  ProviderThinkingProfile,
} from "openclaw/plugin-sdk/core";
// Agy plugin entrypoint registers the local CLI-backed provider.
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { buildProviderReplayFamilyHooks } from "openclaw/plugin-sdk/provider-model-shared";
import {
  AGY_AUTH_MARKER,
  AGY_DEFAULT_MODEL_REF,
  AGY_PROVIDER_ID,
  applyAgyConfig,
  buildAgyDynamicModel,
  buildAgyProviderConfig,
} from "./catalog.js";
import { buildAgyCliBackend } from "./cli-backend.js";
import {
  AgyModelDirectory,
  agyModelDirectory,
  parseAgyModelDirectory,
  readAgyModelDirectoryConfig,
  setAgyModelDirectoryRunnerForTests,
} from "./model-directory.js";
import {
  buildAgyCliArgs,
  createAgyStreamFn,
  formatAgyPrompt,
  readAgyPluginConfig,
  stripOpenClawToolingSections,
} from "./stream.js";

type AgyThinkingLevel = ProviderThinkingProfile["levels"][number]["id"];

function isAgyThinkingLevel(level: string): level is AgyThinkingLevel {
  return (
    level === "off" ||
    level === "minimal" ||
    level === "low" ||
    level === "medium" ||
    level === "high" ||
    level === "xhigh" ||
    level === "max"
  );
}

export const testing = {
  AgyModelDirectory,
  buildAgyCliArgs,
  formatAgyPrompt,
  parseAgyModelDirectory,
  setAgyModelDirectoryRunnerForTests,
  stripOpenClawToolingSections,
};

function resolveAgyThinkingProfile({
  compat,
}: ProviderDefaultThinkingPolicyContext): ProviderThinkingProfile {
  const configuredLevels = (compat?.supportedReasoningEfforts ?? [])
    .filter(isAgyThinkingLevel)
    .map((level) => ({ id: level }));
  const adaptiveIndex = configuredLevels.findIndex(
    (level) => level.id === "high" || level.id === "xhigh" || level.id === "max",
  );
  const levels = [...configuredLevels];
  levels.splice(adaptiveIndex >= 0 ? adaptiveIndex : levels.length, 0, { id: "adaptive" });
  return {
    levels,
    defaultLevel: "adaptive",
    preserveWhenCatalogReasoningFalse: true,
  };
}

export default definePluginEntry({
  id: AGY_PROVIDER_ID,
  name: "Agy CLI Provider",
  description: "Local agy CLI provider plugin",
  register(api) {
    api.registerCliBackend(buildAgyCliBackend());
    const startupConfig = readAgyPluginConfig(api.config);
    api.registerProvider({
      id: AGY_PROVIDER_ID,
      label: "Agy CLI",
      docsPath: "/providers/agy",
      auth: [
        {
          id: "cli",
          label: "Agy CLI",
          hint: "Forward prompts to the local agy command.",
          kind: "custom",
          wizard: {
            choiceId: AGY_PROVIDER_ID,
            choiceLabel: "Agy CLI",
            choiceHint: "Forward prompts to the local agy command.",
            groupId: AGY_PROVIDER_ID,
            groupLabel: "Agy CLI",
            groupHint: "Local CLI-backed provider",
            onboardingScopes: ["text-inference"],
          },
          run: async (ctx) => {
            const models = await agyModelDirectory.prepare(readAgyModelDirectoryConfig(ctx.config));
            return {
              profiles: [],
              defaultModel: AGY_DEFAULT_MODEL_REF,
              configPatch: applyAgyConfig(models),
            };
          },
        },
      ],
      catalog: {
        order: "late",
        run: async (ctx) => {
          const models = await agyModelDirectory.prepare(readAgyModelDirectoryConfig(ctx.config));
          return { provider: buildAgyProviderConfig(models) };
        },
      },
      prepareDynamicModel: async ({ config }) => {
        await agyModelDirectory.prepare(readAgyModelDirectoryConfig(config));
      },
      resolveDynamicModel: ({ config, modelId }) =>
        buildAgyDynamicModel(
          agyModelDirectory.resolve(modelId, readAgyModelDirectoryConfig(config)),
        ),
      preferRuntimeResolvedModel: ({ modelId }) => modelId === "flash" || modelId === "pro",
      resolveSyntheticAuth: () => ({
        apiKey: AGY_AUTH_MARKER,
        source: "agy-cli",
        mode: "token",
      }),
      shouldDeferSyntheticProfileAuth: ({ resolvedApiKey }) => resolvedApiKey === AGY_AUTH_MARKER,
      createStreamFn: ({ config, provider }) => {
        if (provider !== AGY_PROVIDER_ID) {
          return undefined;
        }
        const agyConfig = config ? readAgyPluginConfig(config) : startupConfig;
        const directoryConfig = readAgyModelDirectoryConfig(config);
        return createAgyStreamFn({
          config: agyConfig,
          resolveModelId: async (modelId) => {
            await agyModelDirectory.prepare(directoryConfig);
            return agyModelDirectory.resolveExecutionModel(modelId, undefined, directoryConfig);
          },
        });
      },
      ...buildProviderReplayFamilyHooks({
        family: "openai-compatible",
        dropReasoningFromHistory: true,
      }),
      resolveThinkingProfile: resolveAgyThinkingProfile,
      buildUnknownModelHint: () =>
        "Use agy/flash or agy/pro. These stable aliases are resolved from the local `agy models` catalog.",
    });
  },
});
