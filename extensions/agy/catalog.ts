// Agy catalog helpers expose stable aliases backed by the live CLI model directory.
import type { OpenClawConfig, ProviderRuntimeModel } from "openclaw/plugin-sdk/plugin-entry";
import type {
  ModelDefinitionConfig,
  ModelProviderConfig,
} from "openclaw/plugin-sdk/provider-model-shared";

export const AGY_PROVIDER_ID = "agy";
export const AGY_DEFAULT_MODEL_ID = "flash";
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

export type AgyCatalogModel = {
  id: string;
  name: string;
  resolvedModelId: string;
  thinkingLevels: string[];
  thinkingModels: Record<string, string>;
};

function buildReasoningEffortMap(levels: readonly string[]): Record<string, string> {
  const first = levels[0];
  const last = levels.at(-1);
  return {
    ...(first ? { off: first, minimal: first } : {}),
    ...(last ? { xhigh: last, max: last } : {}),
  };
}

export function buildAgyModelDefinition(model: AgyCatalogModel): ModelDefinitionConfig {
  return {
    id: model.id,
    name: model.name,
    api: "openai-completions",
    reasoning: model.thinkingLevels.length > 0,
    input: ["text", "image"],
    agentRuntime: { id: AGY_PROVIDER_ID },
    cost: ZERO_COST,
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxTokens: DEFAULT_MAX_TOKENS,
    params: {
      resolvedModelId: model.resolvedModelId,
      thinkingModels: model.thinkingModels,
    },
    compat: {
      supportsUsageInStreaming: true,
      supportsReasoningEffort: model.thinkingLevels.length > 0,
      supportedReasoningEfforts: [...model.thinkingLevels],
      reasoningEffortMap: buildReasoningEffortMap(model.thinkingLevels),
      supportsTools: false,
      requiresStringContent: true,
    },
  };
}

export function buildAgyProviderConfig(models: readonly AgyCatalogModel[]): ModelProviderConfig {
  return {
    baseUrl: AGY_BASE_URL,
    apiKey: AGY_AUTH_MARKER,
    auth: "token",
    api: "openai-completions",
    models: models.map(buildAgyModelDefinition),
  };
}

export function buildAgyDynamicModel(
  model: AgyCatalogModel | undefined,
): ProviderRuntimeModel | undefined {
  if (!model) {
    return undefined;
  }
  return {
    ...buildAgyModelDefinition(model),
    input: ["text", "image"],
    provider: AGY_PROVIDER_ID,
    api: "openai-completions",
    baseUrl: AGY_BASE_URL,
  };
}

export function applyAgyConfig(models: readonly AgyCatalogModel[]): Partial<OpenClawConfig> {
  const provider = buildAgyProviderConfig(models);
  return {
    models: {
      providers: {
        [AGY_PROVIDER_ID]: provider,
      },
    },
    agents: {
      defaults: {
        model: AGY_DEFAULT_MODEL_REF,
        models: Object.fromEntries(
          models.map((model) => [
            `${AGY_PROVIDER_ID}/${model.id}`,
            { agentRuntime: { id: AGY_PROVIDER_ID } },
          ]),
        ),
      },
    },
  };
}
