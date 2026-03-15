import { NextRequest, NextResponse } from "next/server";
import { MOCK_RECIPES } from "@/lib/mockData";
import { computeFridgeLife, computeMicrowaveScore } from "@/lib/mealPrepUtils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiKey = process.env.SPOONACULAR_API_KEY;

  if (apiKey) {
    const res = await fetch(
      `https://api.spoonacular.com/recipes/${id}/information?apiKey=${apiKey}&includeNutrition=false`
    );
    if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data = await res.json();
    return NextResponse.json({
      ...data,
      fridgeLife: computeFridgeLife(data),
      microwaveScore: computeMicrowaveScore(data),
    });
  }

  const recipe = MOCK_RECIPES.find((r) => r.id === Number(id));
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(recipe);
}
