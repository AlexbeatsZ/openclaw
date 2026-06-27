// Agy provider catalog constants and model helpers.
import type { ProviderRuntimeModel } from "openclaw/plugin-sdk/plugin-entry";
import type {
  ModelDefinitionConfig,
  ModelProviderConfig,
} from "openclaw/plugin-sdk/provider-model-shared";

export const AGY_PROVIDER_ID = "agy";
export const AGY_DEFAULT_MODEL_ID = "default";
export const AGY_DEFAULT_MODEL_REF = `${AGY_PROVIDER_ID}/${AGY_DEFAULT_MODEL_ID}`;
export const AGY_BASE_URL = "cli://agy";
export const AGY_AUTH_MARKER = "agy-cli";

const DEFAULT_CONTEXT_WINDOW = 200_000;
const DEFAULT_MAX_TOKENS = 32_000;

const ZERO_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

export function buildAgyModelDefinition(modelId = AGY_DEFAULT_MODEL_ID): ModelDefinitionConfig {
  const id = modelId.trim() || AGY_DEFAULT_MODEL_ID;
  return {
    id,
    name: id === AGY_DEFAULT_MODEL_ID ? "Agy CLI default" : `Agy CLI ${id}`,
    api: "openai-completions",
    reasoning: false,
    input: ["text"],
    cost: ZERO_COST,
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxTokens: DEFAULT_MAX_TOKENS,
    compat: {
      supportsUsageInStreaming: true,
      supportsReasoningEffort: false,
      supportsTools: false,
      requiresStringContent: true,
    },
  };
}

export function buildAgyProviderConfig(): ModelProviderConfig {
  return {
    baseUrl: AGY_BASE_URL,
    apiKey: AGY_AUTH_MARKER,
    auth: "token",
    api: "openai-completions",
    models: [buildAgyModelDefinition()],
  };
}

export function buildAgyDynamicModel(modelId: string): ProviderRuntimeModel | undefined {
  const id = modelId.trim();
  if (!id) {
    return undefined;
  }
  const definition = buildAgyModelDefinition(id);
  return {
    ...definition,
    input: ["text"],
    provider: AGY_PROVIDER_ID,
    api: "openai-completions",
    baseUrl: AGY_BASE_URL,
  };
}

export function applyAgyConfig(): {
  models: { providers: Record<typeof AGY_PROVIDER_ID, ModelProviderConfig> };
  agents: { defaults: { model: typeof AGY_DEFAULT_MODEL_REF } };
} {
  return {
    models: {
      providers: {
        [AGY_PROVIDER_ID]: buildAgyProviderConfig(),
      },
    },
    agents: {
      defaults: {
        model: AGY_DEFAULT_MODEL_REF,
      },
    },
  };
}
