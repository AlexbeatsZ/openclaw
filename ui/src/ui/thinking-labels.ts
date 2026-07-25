// Control UI module implements thinking labels behavior.
import { t } from "../i18n/index.ts";
import { normalizeLowercaseStringOrEmpty } from "./string-coerce.ts";
import { normalizeThinkLevel } from "./thinking.ts";

export function normalizeThinkingOptionValue(raw: string): string {
  return normalizeThinkLevel(raw) ?? normalizeLowercaseStringOrEmpty(raw);
}

export function formatInheritedThinkingLabel(effectiveLevel: string | null | undefined): string {
  const normalized = effectiveLevel ? normalizeThinkingOptionValue(effectiveLevel) : "off";
  return t("rawUi.thinking_inherited", {
    level: formatThinkingLevelDisplayLabel(normalized),
  });
}

export function formatThinkingOverrideLabel(value: string, label?: string | null): string {
  const normalized = normalizeThinkingOptionValue(value);
  if (!normalized || normalized === "off") {
    return t("rawUi.thinking_off");
  }
  return formatThinkingLevelDisplayLabel(label?.trim() || normalized);
}

function formatThinkingLevelDisplayLabel(value: string): string {
  const raw = normalizeLowercaseStringOrEmpty(value);
  if (["on", "enable", "enabled"].includes(raw)) {
    return t("rawUi.thinking_on");
  }
  const normalized = normalizeThinkingOptionValue(value);
  switch (normalized) {
    case "adaptive":
      return t("rawUi.thinking_adaptive");
    case "minimal":
      return t("rawUi.thinking_minimal");
    case "low":
      return t("rawUi.thinking_low");
    case "medium":
      return t("rawUi.thinking_medium");
    case "high":
      return t("rawUi.thinking_high");
    case "xhigh":
      return t("rawUi.thinking_extraHigh");
    case "max":
      return t("rawUi.thinking_maximum");
    default:
      return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
