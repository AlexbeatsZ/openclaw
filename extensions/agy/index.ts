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
import { createAgyStreamFn, readAgyPluginConfig } from "./stream.js";

export default definePluginEntry({
  id: AGY_PROVIDER_ID,
  name: "Agy CLI Provider",
  description: "Local agy CLI provider plugin",
  register(api) {
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
      buildUnknownModelHint: () =>
        "Use agy/default, or configure models.providers.agy.models with model ids that agy accepts via --model.",
    });
  },
});
