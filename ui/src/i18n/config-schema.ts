import type { Locale } from "./lib/types.ts";

const configSchemaCatalogs: Partial<Record<Locale, Readonly<Record<string, string>>>> = {};

export function registerConfigSchemaTranslations(
  locale: Locale,
  translations: Readonly<Record<string, string>>,
): void {
  configSchemaCatalogs[locale] = translations;
}

export function localizeConfigSchemaText(
  value: string | undefined,
  locale: Locale,
): string | undefined {
  if (!value) {
    return value;
  }
  return configSchemaCatalogs[locale]?.[value] ?? value;
}
