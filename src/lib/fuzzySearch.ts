import Fuse from "fuse.js";

/** Fuzzy-match a query string against a list of candidate strings.
 *  Returns true if the query is a close enough match to any candidate. */
export function fuzzyMatch(query: string, candidates: string[]): boolean {
  if (!query.trim()) return true;
  const fuse = new Fuse(candidates, { threshold: 0.4, includeScore: true });
  return fuse.search(query).length > 0;
}

/** Filter a list of recipes by ingredient query using fuzzy matching.
 *  Each recipe must have extendedIngredients with a `name` field. */
export function filterByIngredients<T extends { extendedIngredients: { name: string }[] }>(
  recipes: T[],
  ingredientQuery: string
): T[] {
  if (!ingredientQuery.trim()) return recipes;
  const terms = ingredientQuery
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return recipes.filter((recipe) => {
    const ingredientNames = recipe.extendedIngredients.map((i) => i.name);
    return terms.every((term) => fuzzyMatch(term, ingredientNames));
  });
}

/** Filter a list of items by title using fuzzy matching. */
export function filterByTitle<T extends { title: string }>(items: T[], query: string): T[] {
  if (!query.trim()) return items;
  const fuse = new Fuse(items, { keys: ["title"], threshold: 0.4 });
  return fuse.search(query).map((r) => r.item);
}
