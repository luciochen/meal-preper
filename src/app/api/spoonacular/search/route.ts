import { NextRequest, NextResponse } from "next/server";
import { MOCK_RECIPES } from "@/lib/mockData";
import { computeFridgeLife, computeMicrowaveScore, isMealPrepSuitable } from "@/lib/mealPrepUtils";

const PAGE_SIZE = 16;

const ALL_SPOON_CUISINES = ["italian", "french", "mediterranean", "mexican", "japanese", "korean", "indian", "thai", "american"];

const BLOCKED_TITLES = new Set(["Saffron Chicken Tikka", "Pastel Caprese"]);
// Chinese is excluded — served exclusively from Supabase

function upgradeImageUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  return url.replace(/-\d+x\d+(\.\w+)$/, "-636x393$1");
}

async function fetchCuisinePool(
  apiKey: string,
  cuisine: string,
  extra: Record<string, string>
): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    apiKey,
    type: "main course",
    sort: "popularity",
    sortDirection: "desc",
    addRecipeInformation: "true",
    fillIngredients: "true",
    instructionsRequired: "true",
    minSpoonacularScore: "70",
    maxReadyTime: "45",
    cuisine,
    number: "50",
    offset: "0",
    ...extra,
  });
  const res = await fetch(
    `https://api.spoonacular.com/recipes/complexSearch?${params}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results as Record<string, unknown>[]) ?? [];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";
  const diet = searchParams.get("diet") || "";
  // Chinese is never passed here — it's handled by /api/recipes/search
  const cuisine = searchParams.get("cuisine") || "";
  const intolerances = searchParams.get("intolerances") || "";
  const types = searchParams.get("types") || "";
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const apiKey = process.env.SPOONACULAR_API_KEY;

  if (apiKey) {
    const extra: Record<string, string> = {};
    if (query) extra.query = query;
    if (diet) extra.diet = diet;
    if (intolerances) extra.intolerances = intolerances;

    // Determine which Spoonacular cuisines to fetch (never chinese)
    const requestedCuisines = cuisine
      ? cuisine.split(",").map((c) => c.trim()).filter((c) => c !== "chinese" && ALL_SPOON_CUISINES.includes(c))
      : ALL_SPOON_CUISINES;

    if (requestedCuisines.length === 0) {
      return NextResponse.json({ results: [], hasMore: false });
    }

    // Fetch all cuisines in parallel — each result set is cached independently
    const pools = await Promise.all(
      requestedCuisines.map((c) => fetchCuisinePool(apiKey, c, extra))
    );

    // Merge, deduplicate, apply code-level filters
    const seen = new Set<number | string>();
    const quickOnly = types.split(",").includes("quick");

    let merged = pools
      .flat()
      .sort((a, b) => ((b.aggregateLikes as number) ?? 0) - ((a.aggregateLikes as number) ?? 0))
      .filter((r) => {
        const id = (r as { id: number }).id;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .filter((r) => {
        const title = (r.title as string) ?? "";
        return !BLOCKED_TITLES.has(title) && !/salad/i.test(title);
      })
      .filter((r) => isMealPrepSuitable(r as Parameters<typeof isMealPrepSuitable>[0]))
      .filter((r) => {
        const ic = ((r.extendedIngredients as unknown[]) ?? []).length;
        const sc = ((r.analyzedInstructions as { steps: unknown[] }[])?.[0]?.steps ?? []).length;
        return ic >= 4 && ic <= 12 && sc >= 3;
      })
      .map((r) => ({
        ...r,
        image: upgradeImageUrl(r.image as string | undefined),
        fridgeLife: computeFridgeLife(r as Parameters<typeof computeFridgeLife>[0]),
        microwaveScore: computeMicrowaveScore(r as Parameters<typeof computeMicrowaveScore>[0]),
      }));

    if (quickOnly) {
      merged = merged.filter((r) => {
        const mins = (r as { readyInMinutes?: number }).readyInMinutes;
        return typeof mins === "number" && mins > 0 && mins <= 30;
      });
    }

    const page = merged.slice(offset, offset + PAGE_SIZE);
    const hasMore = offset + PAGE_SIZE < merged.length;
    return NextResponse.json({ results: page, hasMore });
  }

  // Mock fallback
  let results = [...MOCK_RECIPES];
  if (query) results = results.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()));
  if (diet) results = results.filter((r) => r.diets.some((d) => diet.split(",").includes(d)));
  if (cuisine) results = results.filter((r) => r.cuisines.some((c) => cuisine.split(",").includes(c)));
  if (intolerances) {
    const allergens = intolerances.split(",");
    results = results.filter((r) => !allergens.some((a) => r.extendedIngredients.some((i) => i.name.toLowerCase().includes(a.toLowerCase()))));
  }
  const page = results.slice(offset, offset + PAGE_SIZE);
  return NextResponse.json({ results: page, hasMore: offset + PAGE_SIZE < results.length });
}
