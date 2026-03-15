import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { MOCK_RECIPES } from "@/lib/mockData";

function dbRowToRecipe(row: Record<string, unknown>) {
  const steps = (row.steps as { number: number; step: string }[]) || [];
  return {
    id: row.id,
    title: row.title,
    image: row.image_url || undefined,
    readyInMinutes: row.minutes ?? 30,
    servings: row.servings ?? 4,
    calories: row.calories ?? null,
    diets: [],
    cuisines: [],
    dishTypes: row.tags ?? [],
    fridgeLife: row.fridge_life,
    microwaveScore: row.microwave_score,
    extendedIngredients: (row.ingredients as { name: string }[])?.map((ing, i) => ({
      id: i,
      name: ing.name,
      amount: 0,
      unit: "",
      aisle: "",
    })) ?? [],
    analyzedInstructions: [{ steps }],
  };
}

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ recipes: MOCK_RECIPES.slice(0, 8) });
  }

  // Get total count then fetch a random slice
  const { count } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true });

  const total = count ?? 0;
  const offset = total > 8 ? Math.floor(Math.random() * (total - 8)) : 0;

  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .range(offset, offset + 7);

  if (error || !data) {
    return NextResponse.json({ recipes: MOCK_RECIPES.slice(0, 8) });
  }

  return NextResponse.json({ recipes: data.map(dbRowToRecipe) });
}
