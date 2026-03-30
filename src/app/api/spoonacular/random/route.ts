import { NextResponse } from "next/server";
import { MOCK_RECIPES } from "@/lib/mockData";
import { computeFridgeLife, computeMicrowaveScore } from "@/lib/mealPrepUtils";

export async function GET() {
  const apiKey = process.env.SPOONACULAR_API_KEY;

  if (apiKey) {
    const params = new URLSearchParams({ apiKey, number: "8", tags: "main course,dinner" });
    const res = await fetch(`https://api.spoonacular.com/recipes/random?${params}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json({ recipes: MOCK_RECIPES.slice(0, 8) });
    const data = await res.json();
    const recipes = (data.recipes || [])
      .slice(0, 8)
      .map((r: Record<string, unknown>) => ({
        ...r,
        fridgeLife: computeFridgeLife(r as Parameters<typeof computeFridgeLife>[0]),
        microwaveScore: computeMicrowaveScore(r as Parameters<typeof computeMicrowaveScore>[0]),
      }));
    return NextResponse.json({ recipes });
  }

  return NextResponse.json({ recipes: MOCK_RECIPES.slice(0, 8) });
}
