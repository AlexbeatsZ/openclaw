// Agy model directory discovers Gemini families and variants from `agy models`.
import type { OpenClawConfig } from "openclaw/plugin-sdk/plugin-entry";
import { buildAgyProviderConfig, type AgyCatalogModel } from "./catalog.js";
import type { AgyCliRunResult, AgyPluginConfig } from "./stream.js";
import { readAgyPluginConfig, runAgyCli } from "./stream.js";

type AgyModelFamily = {
  alias: string;
  family: string;
  version: number[];
  displayBase: string;
  defaultModelId?: string;
  variants: Map<string, string>;
};

export type AgyModelDirectoryRunner = (params: {
  command: string;
  args: string[];
  cwd?: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  maxOutputBytes: number;
}) => Promise<AgyCliRunResult>;

export type AgyModelDirectoryConfig = AgyPluginConfig & {
  fallbackModels?: AgyCatalogModel[];
};

const DEFAULT_AGY_COMMAND = "agy";
const DEFAULT_DISCOVERY_TIMEOUT_MS = 15_000;
const DEFAULT_DISCOVERY_MAX_OUTPUT_BYTES = 1024 * 1024;
const THINKING_LEVEL_ORDER = ["low", "medium", "high"] as const;
const GEMINI_SLUG_PATTERN = /^(gemini-(\d+(?:\.\d+)*)-(flash|pro))(?:-(low|medium|high))?$/i;
const GEMINI_DISPLAY_PATTERN =
  /^(Gemini\s+(\d+(?:\.\d+)*)\s+(Flash|Pro))(?:\s+\((Low|Medium|High)\))?$/i;

let directoryRunner: AgyModelDirectoryRunner = runAgyCli;

function compareVersions(left: readonly number[], right: readonly number[]): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta !== 0) {
      return delta;
    }
  }
  return 0;
}

function parseVersion(raw: string): number[] {
  return raw.split(".").map((part) => Number.parseInt(part, 10));
}

function buildConfigKey(config: AgyModelDirectoryConfig): string {
  return JSON.stringify({
    command: config.command ?? DEFAULT_AGY_COMMAND,
    cwd: config.cwd ?? "",
    env: Object.entries(config.env ?? {}).toSorted(([left], [right]) => left.localeCompare(right)),
    fallbackModels: config.fallbackModels ?? [],
  });
}

function readConfiguredFallbackModels(config?: OpenClawConfig): AgyCatalogModel[] {
  const models = config?.models?.providers?.agy?.models ?? [];
  return models.flatMap((model) => {
    const resolvedModelId = model.params?.resolvedModelId;
    const thinkingModels = model.params?.thinkingModels;
    if (
      (model.id !== "flash" && model.id !== "pro") ||
      typeof resolvedModelId !== "string" ||
      !resolvedModelId.trim() ||
      !thinkingModels ||
      typeof thinkingModels !== "object" ||
      Array.isArray(thinkingModels)
    ) {
      return [];
    }
    const executableThinkingModels = Object.fromEntries(
      Object.entries(thinkingModels).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" && Boolean(entry[1].trim()),
      ),
    );
    return [
      {
        id: model.id,
        name: model.name,
        resolvedModelId: resolvedModelId.trim(),
        thinkingLevels: THINKING_LEVEL_ORDER.filter((level) =>
          Boolean(executableThinkingModels[level]),
        ),
        thinkingModels: executableThinkingModels,
      },
    ];
  });
}

export function readAgyModelDirectoryConfig(config?: OpenClawConfig): AgyModelDirectoryConfig {
  return {
    ...readAgyPluginConfig(config),
    fallbackModels: readConfiguredFallbackModels(config),
  };
}

export function parseAgyModelDirectory(stdout: string): AgyCatalogModel[] {
  const families = new Map<string, AgyModelFamily>();
  for (const line of stdout.split(/\r?\n/)) {
    const modelId = line.trim();
    const match = GEMINI_SLUG_PATTERN.exec(modelId) ?? GEMINI_DISPLAY_PATTERN.exec(modelId);
    if (!match) {
      continue;
    }
    const [, displayBase, rawVersion, rawFamily, rawThinkingLevel] = match;
    if (!displayBase || !rawVersion || !rawFamily) {
      continue;
    }
    const family = rawFamily.toLowerCase();
    const thinkingLevel = rawThinkingLevel?.toLowerCase();
    const familyKey = `${family}:${rawVersion}`;
    const current = families.get(familyKey) ?? {
      alias: family,
      family,
      version: parseVersion(rawVersion),
      displayBase,
      variants: new Map<string, string>(),
    };
    if (thinkingLevel) {
      current.variants.set(thinkingLevel, modelId);
    } else {
      current.defaultModelId = modelId;
    }
    families.set(familyKey, current);
  }

  const latestByAlias = new Map<string, AgyModelFamily>();
  for (const family of families.values()) {
    const current = latestByAlias.get(family.alias);
    if (!current || compareVersions(family.version, current.version) > 0) {
      latestByAlias.set(family.alias, family);
    }
  }

  return [...latestByAlias.values()]
    .toSorted((left, right) => left.alias.localeCompare(right.alias))
    .flatMap((family): AgyCatalogModel[] => {
      const thinkingLevels = THINKING_LEVEL_ORDER.filter((level) => family.variants.has(level));
      const resolvedModelId =
        family.defaultModelId ??
        family.variants.get("medium") ??
        family.variants.get("high") ??
        family.variants.get("low");
      if (!resolvedModelId) {
        return [];
      }
      return [
        {
          id: family.alias,
          name: `Gemini ${family.family === "flash" ? "Flash" : "Pro"} (auto: ${family.displayBase})`,
          resolvedModelId,
          thinkingLevels,
          thinkingModels: Object.fromEntries(family.variants),
        },
      ];
    });
}

export class AgyModelDirectory {
  private readonly snapshots = new Map<string, AgyCatalogModel[]>();
  private readonly pending = new Map<string, Promise<AgyCatalogModel[]>>();

  async prepare(config: AgyModelDirectoryConfig = {}): Promise<AgyCatalogModel[]> {
    const key = buildConfigKey(config);
    const cached = this.snapshots.get(key);
    if (cached) {
      return cached;
    }
    const inFlight = this.pending.get(key);
    if (inFlight) {
      return await inFlight;
    }
    const load = this.load(config)
      .then((models) => {
        this.snapshots.set(key, models);
        return models;
      })
      .finally(() => {
        this.pending.delete(key);
      });
    this.pending.set(key, load);
    return await load;
  }

  list(config: AgyModelDirectoryConfig = {}): readonly AgyCatalogModel[] {
    return this.snapshots.get(buildConfigKey(config)) ?? [];
  }

  resolve(modelId: string, config: AgyModelDirectoryConfig = {}): AgyCatalogModel | undefined {
    const id = modelId.trim();
    return this.list(config).find((model) => model.id === id || model.resolvedModelId === id);
  }

  resolveExecutionModel(
    modelId: string,
    thinkingLevel?: string,
    config: AgyModelDirectoryConfig = {},
  ): string {
    const model = this.resolve(modelId, config);
    if (!model) {
      return modelId;
    }
    if (!thinkingLevel || thinkingLevel === "adaptive") {
      return model.resolvedModelId;
    }
    const definition = buildAgyProviderConfig([model]).models[0];
    const mapped = definition?.compat?.reasoningEffortMap?.[thinkingLevel] ?? thinkingLevel;
    return model.thinkingModels[mapped] ?? model.resolvedModelId;
  }

  reset(): void {
    this.snapshots.clear();
    this.pending.clear();
  }

  private async load(config: AgyModelDirectoryConfig): Promise<AgyCatalogModel[]> {
    try {
      const result = await directoryRunner({
        command: config.command ?? DEFAULT_AGY_COMMAND,
        args: ["models"],
        cwd: config.cwd,
        env: { ...process.env, ...(config.env ?? {}) },
        timeoutMs: Math.min(config.timeoutMs ?? DEFAULT_DISCOVERY_TIMEOUT_MS, 30_000),
        maxOutputBytes: Math.min(
          config.maxOutputBytes ?? DEFAULT_DISCOVERY_MAX_OUTPUT_BYTES,
          DEFAULT_DISCOVERY_MAX_OUTPUT_BYTES,
        ),
      });
      if (result.exitCode !== 0) {
        const detail = (result.stderr || result.stdout).trim();
        throw new Error(
          `agy models failed with code ${result.exitCode ?? "null"}${detail ? `: ${detail}` : ""}`,
        );
      }
      const models = parseAgyModelDirectory(result.stdout);
      if (models.length === 0) {
        throw new Error(
          "agy models returned no supported Gemini Flash/Pro variants; run `agy models` to inspect the installed CLI catalog.",
        );
      }
      return models;
    } catch (error) {
      if (config.fallbackModels?.length) {
        return config.fallbackModels;
      }
      throw error;
    }
  }
}

export const agyModelDirectory = new AgyModelDirectory();

export function setAgyModelDirectoryRunnerForTests(
  runner: AgyModelDirectoryRunner | undefined,
): void {
  directoryRunner = runner ?? runAgyCli;
  agyModelDirectory.reset();
}
