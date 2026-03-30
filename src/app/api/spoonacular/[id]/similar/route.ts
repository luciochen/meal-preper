import { NextRequest, NextResponse } from "next/server";
import { MOCK_RECIPES } from "@/lib/mockData";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiKey = process.env.SPOONACULAR_API_KEY;

  if (apiKey) {
    const res = await fetch(
      `https://api.spoonacular.com/recipes/${id}/similar?apiKey=${apiKey}&number=4`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();
    const results = (data as { id: number; title: string; imageType?: string }[]).map((r) => ({
      ...r,
      image: `https://spoonacular.com/recipeImages/${r.id}-312x231.${r.imageType ?? "jpg"}`,
    }));
    return NextResponse.json(results);
  }

  const numId = Number(id);
  const similar = MOCK_RECIPES.filter((r) => r.id !== numId).slice(0, 4);
  return NextResponse.json(similar);
}
