import { NextRequest, NextResponse } from "next/server";
import { MOCK_RECIPES } from "@/lib/mockData";
import { computeFridgeLife, computeMicrowaveScore } from "@/lib/mealPrepUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";
  const diet = searchParams.get("diet") || "";
  const cuisine = searchParams.get("cuisine") || "";
  const intolerances = searchParams.get("intolerances") || "";
  const apiKey = process.env.SPOONACULAR_API_KEY;

  if (apiKey) {
    const params = new URLSearchParams({
      apiKey,
      number: "18",
      type: "main course",
      addRecipeInformation: "true",
      fillIngredients: "true",
      instructionsRequired: "true",
      minServings: "2",
      ...(query && { query }),
      ...(diet && { diet }),
      ...(cuisine && { cuisine }),
      ...(intolerances && { intolerances }),
    });

    const res = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${params}`);
    if (!res.ok) return NextResponse.json({ results: MOCK_RECIPES });
    const data = await res.json();
    const results = (data.results || [])
      .slice(0, 12)
      .map((r: Record<string, unknown>) => ({
        ...r,
        fridgeLife: computeFridgeLife(r as Parameters<typeof computeFridgeLife>[0]),
        microwaveScore: computeMicrowaveScore(r as Parameters<typeof computeMicrowaveScore>[0]),
      }));
    return NextResponse.json({ results });
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
  return NextResponse.json({ results });
}
