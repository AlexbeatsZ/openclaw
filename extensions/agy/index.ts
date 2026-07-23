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
  AGY_GEMINI_FLASH_MODEL_ID,
  AGY_GEMINI_PRO_MODEL_ID,
  AGY_PROVIDER_ID,
  applyAgyConfig,
  buildAgyDynamicModel,
  buildAgyProviderConfig,
} from "./catalog.js";
import { buildAgyCliBackend } from "./cli-backend.js";
import { createAgyStreamFn, readAgyPluginConfig } from "./stream.js";

function resolveAgyThinkingProfile({
  modelId,
}: ProviderDefaultThinkingPolicyContext): ProviderThinkingProfile {
  const levels: ProviderThinkingProfile["levels"] =
    modelId === AGY_GEMINI_PRO_MODEL_ID
      ? ([{ id: "off" }, { id: "low" }, { id: "adaptive" }, { id: "high" }] as const)
      : modelId === AGY_GEMINI_FLASH_MODEL_ID
        ? ([{ id: "low" }, { id: "medium" }, { id: "adaptive" }, { id: "high" }] as const)
        : ([{ id: "off" }, { id: "adaptive" }, { id: "high" }] as const);
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
    const startupConfig = readAgyPluginConfig({
      plugins: {
        entries: {
          agy: {
            enabled: true,
            config: api.pluginConfig as never,
          },
        },
      },
    });
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
          run: async () => ({
            profiles: [],
            defaultModel: AGY_DEFAULT_MODEL_REF,
            configPatch: applyAgyConfig(),
          }),
        },
      ],
      catalog: {
        order: "late",
        run: async () => ({ provider: buildAgyProviderConfig() }),
      },
      staticCatalog: {
        order: "late",
        run: async () => ({ provider: buildAgyProviderConfig() }),
      },
      resolveDynamicModel: ({ modelId }) => buildAgyDynamicModel(modelId),
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
        return createAgyStreamFn({
          config: config ? readAgyPluginConfig(config) : startupConfig,
        });
      },
      ...buildProviderReplayFamilyHooks({
        family: "openai-compatible",
        dropReasoningFromHistory: true,
      }),
      resolveThinkingProfile: resolveAgyThinkingProfile,
      buildUnknownModelHint: () =>
        "Use agy/gemini-3.6-flash or agy/gemini-3.1-pro, or configure models.providers.agy.models with model ids that agy accepts via --model.",
    });
  },
});
