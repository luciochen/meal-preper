// Derive fridge life from Spoonacular recipe attributes
export function computeFridgeLife(recipe: {
  dishTypes?: string[];
  diets?: string[];
  cuisines?: string[];
  title?: string;
}): { days: string; label: string } {
  const title = (recipe.title || "").toLowerCase();
  const dishTypes = (recipe.dishTypes || []).map((d) => d.toLowerCase());
  const diets = (recipe.diets || []).map((d) => d.toLowerCase());

  if (title.includes("fish") || title.includes("salmon") || title.includes("tuna") || title.includes("shrimp")) {
    return { days: "2-3", label: "2-3 Days" };
  }
  if (dishTypes.some((d) => d.includes("salad"))) {
    return { days: "3-4", label: "3-4 Days" };
  }
  if (diets.includes("vegan") || diets.includes("vegetarian")) {
    return { days: "5", label: "5 Days" };
  }
  if (dishTypes.some((d) => d.includes("soup") || d.includes("stew"))) {
    return { days: "5", label: "5 Days" };
  }
  return { days: "4", label: "4 Days" };
}

// Derive microwave score from recipe attributes
export function computeMicrowaveScore(recipe: {
  dishTypes?: string[];
  title?: string;
}): { level: "excellent" | "good" | "fair" | "poor"; label: string; tip: string } {
  const title = (recipe.title || "").toLowerCase();
  const dishTypes = (recipe.dishTypes || []).map((d) => d.toLowerCase());

  if (
    title.includes("fried") ||
    title.includes("crispy") ||
    title.includes("fries") ||
    title.includes("tempura") ||
    title.includes("schnitzel")
  ) {
    return {
      level: "poor",
      label: "Not Recommended",
      tip: "Reheat in an air fryer or oven at 180°C for 5 minutes to restore crispiness. Microwave will make it soggy.",
    };
  }
  if (dishTypes.some((d) => d.includes("salad"))) {
    return {
      level: "poor",
      label: "Serve Cold",
      tip: "Do not microwave. Best enjoyed cold or at room temperature.",
    };
  }
  if (
    title.includes("fish") ||
    title.includes("salmon") ||
    title.includes("tuna") ||
    title.includes("shrimp")
  ) {
    return {
      level: "fair",
      label: "Reheat Gently",
      tip: "Microwave at 60% power for 90 seconds. Full power will dry out or overcook the fish.",
    };
  }
  if (dishTypes.some((d) => d.includes("soup") || d.includes("stew") || d.includes("curry"))) {
    return {
      level: "excellent",
      label: "Microwave Friendly",
      tip: "Heat for 2–3 minutes, stirring once halfway. Soups and stews reheat beautifully.",
    };
  }
  return {
    level: "good",
    label: "Reheats Well",
    tip: "Cover with a damp paper towel and heat for 1.5–2 minutes, stirring once.",
  };
}

const EXCLUDED_DISH_TYPES = new Set([
  "dessert", "beverage", "drink", "cocktail", "appetizer",
  "fingerfood", "snack", "breakfast", "brunch",
]);

// Returns true if a recipe is suitable for weekly meal prep
export function isMealPrepSuitable(recipe: { dishTypes?: string[]; title?: string }): boolean {
  const types = (recipe.dishTypes || []).map((d) => d.toLowerCase());
  // If any dish type is explicitly excluded, reject
  if (types.some((t) => EXCLUDED_DISH_TYPES.has(t))) return false;
  // If dish types exist but none are meal-prep friendly, reject
  const mealPrepTypes = ["main course", "side dish", "soup", "lunch", "dinner"];
  if (types.length > 0 && !types.some((t) => mealPrepTypes.some((m) => t.includes(m)))) return false;
  return true;
}

export const MICROWAVE_LEVEL_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
  excellent: { color: "text-green-700", bg: "bg-green-100", icon: "✓" },
  good: { color: "text-blue-700", bg: "bg-blue-100", icon: "✓" },
  fair: { color: "text-yellow-700", bg: "bg-yellow-100", icon: "~" },
  poor: { color: "text-red-700", bg: "bg-red-100", icon: "✗" },
};
