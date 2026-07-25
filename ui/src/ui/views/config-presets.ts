import { t } from "../../i18n/index.ts";
/**
 * Config presets — opinionated configuration bundles that set multiple
 * settings at once. Applied via config.patch.
 */

export type ConfigPresetId = "personal" | "codeAgent" | "teamBot" | "minimal";

export type ConfigPresetPatch = {
  agents: {
    defaults: {
      bootstrapMaxChars: number;
      bootstrapTotalMaxChars: number;
      contextInjection: "always" | "continuation-skip";
    };
  };
};

export type ConfigPreset = {
  id: ConfigPresetId;
  label: string;
  description: string;
  detail: string;
  impact: string;
  icon: string;
  patch: ConfigPresetPatch;
};

export const CONFIG_PRESETS: ConfigPreset[] = [
  {
    id: "personal",
    get label() {
      return t("rawUi.config_presets_prop_92a310f5e9e3");
    },
    get description() {
      return t("rawUi.config_presets_prop_bd3026ef50c5");
    },
    get detail() {
      return t("rawUi.config_presets_personalDetail");
    },
    get impact() {
      return t("rawUi.config_presets_personalImpact");
    },
    icon: "✨",
    patch: {
      agents: {
        defaults: {
          bootstrapMaxChars: 20_000,
          bootstrapTotalMaxChars: 150_000,
          contextInjection: "always",
        },
      },
    },
  },
  {
    id: "codeAgent",
    get label() {
      return t("rawUi.config_presets_prop_0c03632d926c");
    },
    get description() {
      return t("rawUi.config_presets_prop_0f60fa6a3718");
    },
    get detail() {
      return t("rawUi.config_presets_codeDetail");
    },
    get impact() {
      return t("rawUi.config_presets_codeImpact");
    },
    icon: "🛠️",
    patch: {
      agents: {
        defaults: {
          bootstrapMaxChars: 50_000,
          bootstrapTotalMaxChars: 300_000,
          contextInjection: "always",
        },
      },
    },
  },
  {
    id: "teamBot",
    get label() {
      return t("rawUi.config_presets_prop_adfff9d620ac");
    },
    get description() {
      return t("rawUi.config_presets_prop_333aad1a3c9d");
    },
    get detail() {
      return t("rawUi.config_presets_teamDetail");
    },
    get impact() {
      return t("rawUi.config_presets_teamImpact");
    },
    icon: "👥",
    patch: {
      agents: {
        defaults: {
          bootstrapMaxChars: 10_000,
          bootstrapTotalMaxChars: 80_000,
          contextInjection: "continuation-skip",
        },
      },
    },
  },
  {
    id: "minimal",
    get label() {
      return t("rawUi.config_presets_prop_cf040d5b5d33");
    },
    get description() {
      return t("rawUi.config_presets_prop_cb0331d6930a");
    },
    get detail() {
      return t("rawUi.config_presets_minimalDetail");
    },
    get impact() {
      return t("rawUi.config_presets_minimalImpact");
    },
    icon: "⚡",
    patch: {
      agents: {
        defaults: {
          bootstrapMaxChars: 5_000,
          bootstrapTotalMaxChars: 30_000,
          contextInjection: "continuation-skip",
        },
      },
    },
  },
];

export function getPresetById(id: ConfigPresetId): ConfigPreset | undefined {
  return CONFIG_PRESETS.find((p) => p.id === id);
}

/**
 * Detect which preset (if any) matches the current config values.
 */
export function detectActivePreset(config: Record<string, unknown>): ConfigPresetId | null {
  const agents = config.agents as Record<string, unknown> | undefined;
  const defaults = agents?.defaults as Record<string, unknown> | undefined;
  if (!defaults) {
    return null;
  }
  const maxChars = defaults.bootstrapMaxChars;
  const totalMax = defaults.bootstrapTotalMaxChars;
  const contextInjection = defaults.contextInjection;
  for (const preset of CONFIG_PRESETS) {
    const presetDefaults = (preset.patch.agents as Record<string, unknown>)?.defaults as
      | Record<string, unknown>
      | undefined;
    if (!presetDefaults) {
      continue;
    }
    if (
      maxChars === presetDefaults.bootstrapMaxChars &&
      totalMax === presetDefaults.bootstrapTotalMaxChars &&
      contextInjection === presetDefaults.contextInjection
    ) {
      return preset.id;
    }
  }
  return null;
}
