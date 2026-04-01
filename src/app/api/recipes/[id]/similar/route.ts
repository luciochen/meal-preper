import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import { MOCK_RECIPES } from "@/lib/mockData";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createPublicClient();

  if (!supabase) {
    const similar = MOCK_RECIPES.filter((r) => String(r.id) !== id).slice(0, 4);
    return NextResponse.json(similar);
  }

  // Get the recipe's tags to find similar ones
  const { data: source } = await supabase
    .from("recipes")
    .select("tags")
    .eq("id", id)
    .single();

  const tags: string[] = source?.tags ?? [];

  // Find recipes sharing at least one tag, excluding the current one
  const { data } = await supabase
    .from("recipes")
    .select("id, title, image_url, minutes, fridge_life")
    .overlaps("tags", tags.length > 0 ? tags : ["dinner"])
    .neq("id", id)
    .limit(4);

  if (!data) return NextResponse.json([]);

  return NextResponse.json(
    data.map((r) => ({
      id: r.id,
      title: r.title,
      image: r.image_url || undefined,
      readyInMinutes: r.minutes ?? 30,
    }))
  );
}
