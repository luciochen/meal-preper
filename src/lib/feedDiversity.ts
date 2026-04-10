import {
  DIVERSITY_WINDOW,
  MAX_SAME_CUISINE_PER_WINDOW,
  MAX_SAME_PROTEIN_PER_WINDOW,
  VEGAN_VEG_GUARANTEE_SLOTS,
} from "./feedConfig";
import type { Recipe } from "./mockData";

// ── Primary protein derivation ────────────────────────────────────────────────

export const PROTEIN_KEYWORDS: Record<string, string[]> = {
  chicken:  ["chicken", "poultry"],
  beef:     ["beef", "steak", "brisket", "ground beef", "mince"],
  pork:     ["pork", "bacon", "ham", "sausage", "pancetta", "prosciutto"],
  seafood:  ["salmon", "tuna", "shrimp", "fish", "cod", "tilapia", "prawn", "scallop", "crab", "lobster"],
  lamb:     ["lamb"],
  vegetarian: ["tofu", "tempeh", "lentil", "dal", "chickpea", "black bean", "kidney bean", "edamame"],
  egg:        ["egg"],
};

/**
 * Derives the primary protein from a recipe by scanning ingredient names and tags.
 * Returns one of the keys in PROTEIN_KEYWORDS, or "plant" if none match.
 */
export function derivePrimaryProtein(recipe: Recipe): string {
  const haystack = [
    ...(recipe.extendedIngredients ?? []).map((i) => i.name.toLowerCase()),
    ...recipe.diets.map((d) => d.toLowerCase()),
    ...recipe.dishTypes.map((t) => t.toLowerCase()),
  ].join(" ");

  for (const [protein, keywords] of Object.entries(PROTEIN_KEYWORDS)) {
    if (keywords.some((k) => haystack.includes(k))) return protein;
  }
  return "plant";
}

function isVeganOrVeg(recipe: Recipe): boolean {
  return recipe.diets.some((d) => {
    const dl = d.toLowerCase();
    return dl === "vegan" || dl === "vegetarian";
  });
}

// ── Diversity filter ──────────────────────────────────────────────────────────

/**
 * Apply diversity rules to a pre-scored, sorted recipe list.
 *
 * Rules (in windows of DIVERSITY_WINDOW slots):
 *   - Max MAX_SAME_CUISINE_PER_WINDOW of the same cuisine
 *   - Max MAX_SAME_PROTEIN_PER_WINDOW of the same primary protein
 *   - At least 1 vegan/vegetarian per VEGAN_VEG_GUARANTEE_SLOTS slots
 *
 * Rejected recipes are moved to a deferred pool and appended at the end —
 * they still appear in the feed, just repositioned.
 */
export function applyDiversity(recipes: Recipe[]): Recipe[] {
  const output: Recipe[] = [];
  const deferred: Recipe[] = [];

  let windowCuisine: Record<string, number> = {};
  let windowProtein: Record<string, number> = {};
  let slotsSinceVeganVeg = 0;

  for (const recipe of recipes) {
    const outputLen = output.length;

    // Reset window counters at each window boundary
    if (outputLen > 0 && outputLen % DIVERSITY_WINDOW === 0) {
      windowCuisine = {};
      windowProtein = {};
    }

    const cuisine = recipe.cuisines?.[0]?.toLowerCase() ?? "unknown";
    const protein = derivePrimaryProtein(recipe);
    const isVV    = isVeganOrVeg(recipe);

    // Cuisine cap
    if ((windowCuisine[cuisine] ?? 0) >= MAX_SAME_CUISINE_PER_WINDOW) {
      deferred.push(recipe);
      continue;
    }
    // Protein cap
    if ((windowProtein[protein] ?? 0) >= MAX_SAME_PROTEIN_PER_WINDOW) {
      deferred.push(recipe);
      continue;
    }
    // Vegan/veg guarantee: hold this slot if needed AND a veg recipe is waiting in deferred
    if (slotsSinceVeganVeg >= VEGAN_VEG_GUARANTEE_SLOTS - 1 && !isVV) {
      const hasVVDeferred = deferred.some(isVeganOrVeg);
      if (hasVVDeferred) {
        deferred.push(recipe);
        continue;
      }
    }

    windowCuisine[cuisine] = (windowCuisine[cuisine] ?? 0) + 1;
    windowProtein[protein] = (windowProtein[protein] ?? 0) + 1;
    slotsSinceVeganVeg     = isVV ? 0 : slotsSinceVeganVeg + 1;
    output.push(recipe);
  }

  return [...output, ...deferred];
}
