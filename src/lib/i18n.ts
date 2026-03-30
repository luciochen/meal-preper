// ---------------------------------------------------------------------------
// i18n — recipe translation types and utilities
//
// Schema (stored in Supabase `translations` JSONB column):
// {
//   "en": { title, ingredients: [{name, raw?}], steps: [{number, step}] },
//   "zh": { title, ingredients: [{name, raw?}], steps: [{number, step}] },
//   "fr": { ... }   ← adding a language = adding a key, no schema change
// }
// ---------------------------------------------------------------------------

export type Locale = "zh" | "en";
export const DEFAULT_LOCALE: Locale = "en";

export interface IngredientTranslation {
  name: string;
  raw?: string;
}

export interface RecipeTranslation {
  title: string;
  ingredients: IngredientTranslation[];
  steps: { number: number; step: string }[];
}

/** The full translations map stored in the `translations` column */
export type RecipeTranslations = Partial<Record<Locale, RecipeTranslation>>;

/**
 * Extracts a single locale from a translations map.
 * Falls back to any available locale, then returns null.
 */
export function getTranslation(
  translations: RecipeTranslations | null | undefined,
  locale: Locale = DEFAULT_LOCALE
): RecipeTranslation | null {
  if (!translations) return null;
  return translations[locale] ?? null;
}
