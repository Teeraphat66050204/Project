export type Language = "en" | "th";

export const LANGUAGE_COOKIE = "chaoloey_lang";
export const DEFAULT_LANGUAGE: Language = "en";

export function normalizeLanguage(value?: string | null): Language {
  return value === "th" ? "th" : "en";
}

