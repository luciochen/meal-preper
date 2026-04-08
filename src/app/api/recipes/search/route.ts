import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import { getTranslation, DEFAULT_LOCALE, RecipeTranslations } from "@/lib/i18n";
import { filterByIngredients, filterByTitle } from "@/lib/fuzzySearch";

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
  const t = getTranslation(row.translations as RecipeTranslations | null, DEFAULT_LOCALE);
  const baseIngredients = (row.ingredients as { name: string }[]) ?? [];
  const baseSteps = (row.steps as { number: number; step: string }[]) || [];
  return {
    id: row.id,
    title: t?.title ?? (row.title as string),
    image: row.image_url || undefined,
    readyInMinutes: row.minutes ?? 30,
    servings: row.servings ?? 4,
    calories: row.calories ?? null,
    diets: [],
    cuisines: [],
    dishTypes: row.tags ?? [],
    fridgeLife: row.fridge_life,
    microwaveScore: row.microwave_score,
    extendedIngredients: baseIngredients.map((ing, i) => ({
      id: i,
      name: t?.ingredients?.[i]?.name ?? ing.name,
      amount: 0,
      unit: "",
      aisle: "",
    })),
    analyzedInstructions: [{ steps: t?.steps ?? baseSteps }],
  };
}

export async function GET(req: NextRequest) {
  const supabase = createPublicClient();
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";
  const diet = searchParams.get("diet") || "";
  const cuisine = searchParams.get("cuisine") || "";
  const intolerances = searchParams.get("intolerances") || "";
  const minutesMax = searchParams.get("minutes_max") ? parseInt(searchParams.get("minutes_max")!) : null;
  const microwaveOnly = searchParams.get("microwave") === "1";

  if (!supabase) {
    return NextResponse.json({ results: [] });
  }

  // Run two parallel queries when there's a search term:
  // 1. FTS query → title/text matches
  // 2. Broad query (no FTS) → ingredient match pool
  // When no query, a single broad fetch suffices.

  const buildBase = () =>
    supabase
      .from("recipes")
      .select("*")
      .eq("enabled", true)
      .order("id", { ascending: true });

  const applyFilters = (q: ReturnType<typeof buildBase>) => {
    if (diet) {
      const dietIds = diet.split(",").map((d) => d.trim()).filter(Boolean);
      const mappedTags = dietIds.flatMap((d) => DIET_TAG_MAP[d] ?? [d]);
      if (mappedTags.length > 0) q = q.overlaps("tags", mappedTags);
    }
    if (cuisine) {
      const cuisines = cuisine.split(",").map((c) => c.trim()).filter(Boolean);
      if (cuisines.length > 0) q = q.overlaps("tags", cuisines);
    }
    if (minutesMax) q = q.lte("minutes", minutesMax);
    return q;
  };

  let titleRows: Record<string, unknown>[] = [];
  let ingredientPool: Record<string, unknown>[] = [];

  if (query) {
    // Parallel: FTS for title matches + broad pool for ingredient matching
    const [ftsFetch, poolFetch] = await Promise.all([
      applyFilters(buildBase().textSearch("search_vec", query, { type: "websearch" })).limit(100),
      applyFilters(buildBase()).limit(200),
    ]);
    titleRows = ftsFetch.data ?? [];
    ingredientPool = poolFetch.data ?? [];
  } else {
    const { data } = await applyFilters(buildBase()).limit(200);
    ingredientPool = data ?? [];
  }

  const postFilter = (rows: Record<string, unknown>[]) => {
    let r = rows;
    if (microwaveOnly) {
      r = r.filter((row) => {
        const level = (row.microwave_score as { level?: string })?.level;
        return level === "excellent" || level === "good";
      });
    }
    if (intolerances) {
      const allergens = intolerances.split(",").map((a) => a.trim().toLowerCase());
      r = r.filter((row) => {
        const ings = (row.ingredients as { name: string }[]) ?? [];
        return !allergens.some((a) => ings.some((i) => i.name.toLowerCase().includes(a)));
      });
    }
    return r;
  };

  if (!query) {
    return NextResponse.json({ results: postFilter(ingredientPool).map(dbRowToRecipe) });
  }

  // Title matches (from FTS)
  const titleMapped = postFilter(titleRows).map(dbRowToRecipe);
  const titleIds = new Set(titleMapped.map((r) => String(r.id)));

  // Ingredient matches from the broad pool, excluding title matches
  const ingMapped = postFilter(ingredientPool)
    .map(dbRowToRecipe)
    .filter((r) => !titleIds.has(String(r.id)));
  const ingMatches = filterByIngredients(ingMapped, query);

  return NextResponse.json({ results: [...titleMapped, ...ingMatches] });
}
