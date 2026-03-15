/**
 * Format a recipe title from the Food.com dataset:
 * 1. Capitalise the first character (sentence case)
 * 2. Restore missing possessive apostrophes: "Kittencal s moist" → "Kittencal's moist"
 *    Matches a word-character followed by " s " (or " s" at end of string) — a pattern
 *    that never occurs in normal English prose as a standalone "s" word.
 */
export function formatTitle(s: string): string {
  if (!s) return s;
  // Restore possessive 's: word<space>s<space|end> → word's<space|end>
  const fixed = s.replace(/(\w) s(\s|$)/g, "$1's$2");
  // Sentence-case: capitalise first character
  return fixed.charAt(0).toUpperCase() + fixed.slice(1);
}
