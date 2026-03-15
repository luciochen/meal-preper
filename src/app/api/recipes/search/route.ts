import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { MOCK_RECIPES } from "@/lib/mockData";

const DIET_TAG_MAP: Record<string, string[]> = {
  "vegan":          ["vegan"],
  "vegetarian":     ["vegetarian"],
  "easy":           ["easy"],
  "make-ahead":     ["make-ahead"],
  "freeze-it":      ["freeze-it"],
  "low calorie":    ["low-calorie", "low-in-something"],
  "high protein":   [],
};

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";
  const diet = searchParams.get("diet") || "";
  const cuisine = searchParams.get("cuisine") || "";
  const intolerances = searchParams.get("intolerances") || "";
  const minutesMax = searchParams.get("minutes_max") ? parseInt(searchParams.get("minutes_max")!) : null;
  const microwaveOnly = searchParams.get("microwave") === "1";

  if (!supabase) {
    let results = [...MOCK_RECIPES];
    if (query) results = results.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()));
    if (diet) results = results.filter((r) => r.diets.some((d) => diet.split(",").includes(d)));
    if (intolerances) {
      const allergens = intolerances.split(",");
      results = results.filter(
        (r) => !allergens.some((a) =>
          r.extendedIngredients.some((i) => i.name.toLowerCase().includes(a.toLowerCase()))
        )
      );
    }
    return NextResponse.json({ results: results.slice(0, 24) });
  }

  let dbQuery = supabase
    .from("recipes")
    .select("*")
    .eq("enabled", true)
    .order("image_url", { ascending: false, nullsFirst: false });

  if (query) {
    dbQuery = dbQuery.textSearch("search_vec", query, { type: "websearch" });
  }

  // Diet: map preference labels → Food.com tags
  if (diet) {
    const dietIds = diet.split(",").map((d) => d.trim()).filter(Boolean);
    const mappedTags = dietIds.flatMap((d) => DIET_TAG_MAP[d] ?? [d]);
    if (mappedTags.length > 0) dbQuery = dbQuery.overlaps("tags", mappedTags);
  }

  // Cuisine: direct tag overlap
  if (cuisine) {
    const cuisines = cuisine.split(",").map((c) => c.trim()).filter(Boolean);
    if (cuisines.length > 0) dbQuery = dbQuery.overlaps("tags", cuisines);
  }

  // Quick prep: minutes ≤ 30
  if (minutesMax) {
    dbQuery = dbQuery.lte("minutes", minutesMax);
  }

  const { data, error } = await dbQuery.limit(200);

  if (error || !data) {
    return NextResponse.json({ results: MOCK_RECIPES });
  }

  let results = data;

  // Microwave-friendly: post-fetch filter
  if (microwaveOnly) {
    results = results.filter((row) => {
      const level = (row.microwave_score as { level?: string })?.level;
      return level === "excellent" || level === "good";
    });
  }

  // Allergen exclusion: post-fetch filter
  if (intolerances) {
    const allergens = intolerances.split(",").map((a) => a.trim().toLowerCase());
    results = results.filter((row) => {
      const ings = (row.ingredients as { name: string }[]) ?? [];
      return !allergens.some((a) => ings.some((i) => i.name.toLowerCase().includes(a)));
    });
  }

  return NextResponse.json({ results: results.map(dbRowToRecipe) });
}
