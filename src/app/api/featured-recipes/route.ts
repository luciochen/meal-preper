import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import { FEATURED_USER_ID } from "@/lib/featured";
import { userRecipeToRecipe, UserRecipe } from "@/lib/userRecipes";
import { filterByTitle, filterByIngredients } from "@/lib/fuzzySearch";

export async function GET(req: NextRequest) {
  const supabase = createPublicClient();
  if (!supabase) return NextResponse.json({ results: [] });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";
  const diet = searchParams.get("diet") || "";
  const cuisine = searchParams.get("cuisine") || "";
  const intolerances = searchParams.get("intolerances") || "";

  const { data, error } = await supabase
    .from("user_recipes")
    .select("*")
    .eq("user_id", FEATURED_USER_ID)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error || !data) return NextResponse.json({ results: [] });

  let results = data as UserRecipe[];

  // Cuisine filter — match against recipe.cuisine (case-insensitive)
  if (cuisine) {
    const cuisines = cuisine.split(",").map((c) => c.trim().toLowerCase());
    results = results.filter((r) => r.cuisine && cuisines.includes(r.cuisine.toLowerCase()));
  }

  // Diet filter — match against diet_tags (case-insensitive)
  if (diet) {
    const diets = diet.split(",").map((d) => d.trim().toLowerCase());
    results = results.filter((r) =>
      diets.some((d) => r.diet_tags.some((tag) => tag.toLowerCase() === d))
    );
  }

  // Allergen exclusion — check ingredient names
  if (intolerances) {
    const allergens = intolerances.split(",").map((a) => a.trim().toLowerCase());
    results = results.filter((r) =>
      !allergens.some((allergen) =>
        r.ingredients_json.some((ing) => ing.name.toLowerCase().includes(allergen))
      )
    );
  }

  const mapped = results.map(userRecipeToRecipe);

  if (!query) return NextResponse.json({ results: mapped });

  // Split: title matches first, ingredient-only matches second
  const titleMatches = filterByTitle(mapped, query);
  const titleIds = new Set(titleMatches.map((r) => String(r.id)));
  const ingMatches = filterByIngredients(mapped, query).filter((r) => !titleIds.has(String(r.id)));

  return NextResponse.json({ results: [...titleMatches, ...ingMatches] });
}
