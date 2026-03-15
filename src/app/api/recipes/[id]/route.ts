import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { MOCK_RECIPES } from "@/lib/mockData";

function parseRawIngredient(raw: string): { amount: number; amountDisplay?: string; unit: string; parsedName: string } {
  const s = raw.trim().replace(/\s+/g, " ");
  const numRe = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*)/;
  const numMatch = s.match(numRe);
  if (!numMatch) return { amount: 0, unit: "", parsedName: s };

  let amount = 0;
  const numStr = numMatch[1].trim();
  if (numStr.includes(" ")) {
    const [whole, frac] = numStr.split(" ");
    const [n, d] = frac.split("/");
    amount = parseInt(whole) + parseInt(n) / parseInt(d);
  } else if (numStr.includes("/")) {
    const [n, d] = numStr.split("/");
    amount = parseInt(n) / parseInt(d);
  } else {
    amount = parseFloat(numStr);
  }

  // Detect range like "1/4-1/2" or "1-2" — consume the range end so it doesn't bleed into the name
  let afterNum = s.slice(numMatch[0].length);
  let amountDisplay: string | undefined;
  const rangeRe = /^\s*-\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*)/;
  const rangeMatch = afterNum.match(rangeRe);
  if (rangeMatch) {
    amountDisplay = `${numStr}-${rangeMatch[1].trim()}`;
    afterNum = afterNum.slice(rangeMatch[0].length);
  }

  const rest = afterNum.replace(/^\s*\([^)]*\)\s*/, "").trim();
  const UNITS = /^(tablespoons?|tbsps?|teaspoons?|tsps?|cups?|pounds?|lbs?|ounces?|oz|cloves?|cans?|slices?|pieces?|heads?|stalks?|bunches?|packages?|pkgs?|quarts?|pints?|gallons?|liters?|grams?|kg|ml)\b/i;
  const unitMatch = rest.match(UNITS);
  const unit = unitMatch ? unitMatch[1].toLowerCase() : "";
  const parsedName = unitMatch ? rest.slice(unitMatch[0].length).trim() : rest;

  return { amount, amountDisplay, unit, parsedName };
}

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
    extendedIngredients: (row.ingredients as { name: string; raw?: string }[])?.map((ing, i) => {
      const { amount, amountDisplay, unit, parsedName } = parseRawIngredient(ing.raw ?? ing.name);
      return { id: i, name: parsedName || ing.name, raw: ing.raw ?? ing.name, amount, amountDisplay, unit, aisle: "" };
    }) ?? [],
    analyzedInstructions: [{ steps }],
  };
}

async function fetchAndCacheImage(id: number | string, title: string): Promise<string | null> {
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!unsplashKey || !supabase) return null;

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(title)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${unsplashKey}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const imageUrl = data.results?.[0]?.urls?.regular;
    if (!imageUrl) return null;

    await supabase.from("recipes").update({ image_url: imageUrl }).eq("id", id);
    return imageUrl;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!supabase) {
    const mock = MOCK_RECIPES.find((r) => String(r.id) === id);
    return mock
      ? NextResponse.json(mock)
      : NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .eq("enabled", true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Lazy-load image on first visit
  if (!data.image_url) {
    const imageUrl = await fetchAndCacheImage(data.id, data.title);
    if (imageUrl) data.image_url = imageUrl;
  }

  return NextResponse.json(dbRowToRecipe(data));
}
