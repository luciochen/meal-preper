import { Recipe } from "@/lib/mockData";

export interface UserRecipeIngredient {
  quantity: string;
  unit: string;
  name: string;
}

export interface UserRecipeInstruction {
  step: number;
  text: string;
}

export interface UserRecipe {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  image_url?: string;
  cuisine?: string;
  diet_tags: string[];
  ready_in_minutes?: number;
  servings?: number;
  ingredients_json: UserRecipeIngredient[];
  instructions_json: UserRecipeInstruction[];
  source_type?: "scratch" | "website" | "instagram";
  source_url?: string;
  created_at: string;
  updated_at: string;
}

export const DIET_TAGS = ["Vegan", "Vegetarian", "High protein", "Low calorie", "Easy to cook"];

export const CUISINE_OPTIONS = [
  "Italian", "Chinese", "Mexican", "Japanese", "Korean",
  "Indian", "Thai", "French", "Mediterranean", "American", "Middle Eastern",
];

export function userRecipeToRecipe(ur: UserRecipe): Recipe {
  return {
    id: ur.id,
    title: ur.title,
    image: ur.image_url,
    readyInMinutes: ur.ready_in_minutes ?? 0,
    servings: ur.servings ?? 2,
    diets: ur.diet_tags.map((t) => t.toLowerCase()),
    cuisines: ur.cuisine ? [ur.cuisine.toLowerCase()] : [],
    dishTypes: [],
    summary: ur.description,
    sourceUrl: ur.source_url,
    extendedIngredients: ur.ingredients_json.map((ing, i) => ({
      id: i,
      name: ing.name,
      amount: parseFloat(ing.quantity) || 0,
      unit: ing.unit,
      raw: [ing.quantity, ing.unit, ing.name].filter(Boolean).join(" "),
    })),
    analyzedInstructions: ur.instructions_json.length
      ? [{ steps: ur.instructions_json.map((s) => ({ number: s.step, step: s.text })) }]
      : [],
    is_user_recipe: true,
    user_id: ur.user_id,
    source_type: ur.source_type,
    source_url: ur.source_url,
    ingredients_json: ur.ingredients_json,
    instructions_json: ur.instructions_json,
  };
}

/** Parse a raw ingredient string like "2 cups flour" into structured fields */
export function parseIngredientString(s: string): UserRecipeIngredient {
  const trimmed = s.trim();
  const UNITS = "cups?|tbsps?|tsps?|tablespoons?|teaspoons?|g|grams?|kg|kilograms?|lbs?|pounds?|oz|ounces?|ml|l|liters?|litres?|pieces?|cloves?|bunch|bunches|cans?|packages?|pkgs?|slices?|handfuls?|pinch(es)?|stalks?|heads?|fillets?";
  const re = new RegExp(`^([\\d¼½¾⅓⅔⅛⅜⅝⅞./ ]+)\\s*(${UNITS})\\.?\\s+(.+)$`, "i");
  const m = trimmed.match(re);
  if (m) return { quantity: m[1].trim(), unit: m[2].trim(), name: m[3].trim() };
  const numMatch = trimmed.match(/^([\d¼½¾⅓⅔⅛⅜⅝⅞./ ]+)\s+(.+)$/);
  if (numMatch) return { quantity: numMatch[1].trim(), unit: "", name: numMatch[2].trim() };
  return { quantity: "", unit: "", name: trimmed };
}
