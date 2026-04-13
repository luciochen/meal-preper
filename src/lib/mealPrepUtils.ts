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

  // Salads and raw dishes — never reheat
  if (
    dishTypes.some((d) => d.includes("salad")) ||
    title.includes("salad")
  ) {
    return {
      level: "poor",
      label: "Don't reheat",
      tip: "Best enjoyed cold or at room temperature. Do not microwave.",
    };
  }

  // Crispy / fried — texture is destroyed
  if (
    title.includes("fried") ||
    title.includes("crispy") ||
    title.includes("fries") ||
    title.includes("tempura") ||
    title.includes("schnitzel") ||
    title.includes("breaded")
  ) {
    return {
      level: "poor",
      label: "Don't reheat",
      tip: "Reheat in an air fryer or oven at 180°C for 5 minutes instead — microwave kills the crunch.",
    };
  }

  // Braised, stewed, soupy — designed to sit in liquid, reheat like fresh
  if (
    dishTypes.some((d) => d.includes("soup") || d.includes("stew") || d.includes("curry")) ||
    title.includes("curry") ||
    title.includes("stew") ||
    title.includes("braise") ||
    title.includes("braised") ||
    title.includes("chili") ||
    title.includes("soup")
  ) {
    return {
      level: "excellent",
      label: "Just like fresh",
      tip: "Heat for 2–3 minutes, stirring once halfway. Brothy and saucy dishes reheat beautifully.",
    };
  }

  // Fish and seafood — texture degrades, smell intensifies
  if (
    title.includes("fish") ||
    title.includes("salmon") ||
    title.includes("tuna") ||
    title.includes("shrimp") ||
    title.includes("prawn") ||
    title.includes("seafood") ||
    title.includes("cod") ||
    title.includes("tilapia")
  ) {
    return {
      level: "fair",
      label: "Lost in flavour/texture",
      tip: "Microwave at 60% power for 90 seconds max. Fish dries out and the smell intensifies — oven is better.",
    };
  }

  // Chicken breast and other dry-heat chicken — dries out and goes rubbery
  if (
    title.includes("chicken breast") ||
    title.includes("ranch chicken") ||
    title.includes("grilled chicken")
  ) {
    return {
      level: "fair",
      label: "Lost in flavour/texture",
      tip: "Add a splash of water or broth and cover tightly. Heat at 70% power for 90 seconds — chicken breast goes rubbery fast.",
    };
  }

  // Eggs — rubbery when microwaved
  if (
    title.includes("egg") ||
    title.includes("frittata") ||
    title.includes("omelette") ||
    title.includes("omelet")
  ) {
    return {
      level: "fair",
      label: "Lost in flavour/texture",
      tip: "Heat gently at 50% power in 30-second bursts. Eggs go rubbery quickly in the microwave.",
    };
  }

  // Ground meat, chicken thighs, tofu — forgiving proteins
  if (
    title.includes("ground") ||
    title.includes("mince") ||
    title.includes("chicken thigh") ||
    title.includes("tofu") ||
    title.includes("lentil") ||
    title.includes("dal") ||
    title.includes("dahl") ||
    title.includes("bean") ||
    title.includes("chickpea")
  ) {
    return {
      level: "excellent",
      label: "Just like fresh",
      tip: "Cover and heat for 2–2.5 minutes, stirring halfway. Holds up well.",
    };
  }

  // Default — reheats nicely with a bit of care
  return {
    level: "good",
    label: "Reheats nicely",
    tip: "Cover with a damp paper towel and heat for 1.5–2 minutes, stirring once halfway through.",
  };
}

const EXCLUDED_DISH_TYPES = new Set([
  "dessert", "beverage", "drink", "cocktail", "appetizer",
  "fingerfood", "snack", "breakfast", "brunch", "soup",
]);

const EXCLUDE_TITLE_KEYWORDS = [
  "tartare", "carpaccio", "ceviche", "smoothie", "cocktail", "salad dressing", "raw", "pizza",
  "dip", "dressing", "marinade", "sauce", "gravy", "spread", "jam", "vinaigrette",
  "bread", "biscuit", "pancake", "waffle", "oatmeal", "granola",
  "pudding", "mousse", "parfait",
];

// Returns true if a recipe is suitable for weekly meal prep
export function isMealPrepSuitable(recipe: { dishTypes?: string[]; title?: string }): boolean {
  const titleLower = (recipe.title ?? "").toLowerCase();
  if (EXCLUDE_TITLE_KEYWORDS.some((k) => titleLower.includes(k))) return false;

  // If dishTypes is missing/empty, trust the API-level type=main+course filter
  if (!recipe.dishTypes || recipe.dishTypes.length === 0) return true;

  const types = recipe.dishTypes.map((d) => d.toLowerCase());
  if (types.some((t) => EXCLUDED_DISH_TYPES.has(t))) return false;
  const mealPrepTypes = ["main course", "lunch", "dinner"];
  if (!types.some((t) => mealPrepTypes.some((m) => t.includes(m)))) return false;
  return true;
}

export const MICROWAVE_LEVEL_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
  excellent: { color: "text-green-700", bg: "bg-green-100", icon: "✓" },
  good: { color: "text-blue-700", bg: "bg-blue-100", icon: "✓" },
  fair: { color: "text-yellow-700", bg: "bg-yellow-100", icon: "~" },
  poor: { color: "text-red-700", bg: "bg-red-100", icon: "✗" },
};
