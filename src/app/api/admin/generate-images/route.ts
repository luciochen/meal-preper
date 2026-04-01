// POST /api/admin/generate-images?cuisine=italian
//
// Fetches filtered Spoonacular recipes for a cuisine, generates a Flux.1 image
// for each, and upserts the full recipe into Supabase.
//
// Usage:
//   curl -X POST "http://localhost:3001/api/admin/generate-images?cuisine=italian" \
//        -H "x-admin-key: zest-admin-2026"

import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { createPublicClient } from "@/lib/supabase/server";
import { computeFridgeLife, computeMicrowaveScore, isMealPrepSuitable } from "@/lib/mealPrepUtils";

const ADMIN_KEY = process.env.ADMIN_KEY;


function buildImagePrompt(title: string): string {
  return (
    `${title}. ` +
    `Style: Cinematic food photography, Gourmet, Professional, Realistic, High-definition, True colors. ` +
    `Angle: Top-down flat lay or 45-degree close-up angle. ` +
    `Lighting: Soft side natural light from a window, natural and soft, subtle shadows, creating natural glisten on food surface. ` +
    `Props: Clean minimalist ceramic container or black stone pot, rustic wood table or tray. Limit props in background, keep it minimal. ` +
    `Texture: Vibrant and saturated natural colors, food texture. ` +
    `Background: Neutral gray or dark textured concrete background, clean and empty. ` +
    `Camera: Sony A7R IV, 50mm macro lens, shallow depth of field, sharp focus, true to life depth.`
  );
}

interface SpoonacularIngredient {
  name: string;
  original: string;
  amount: number;
  unit: string;
}

interface SpoonacularRecipe {
  id: number;
  title: string;
  readyInMinutes: number;
  servings: number;
  dishTypes?: string[];
  extendedIngredients?: SpoonacularIngredient[];
  analyzedInstructions?: { steps: { number: number; step: string }[] }[];
}

async function fetchSpoonacularCuisine(
  apiKey: string,
  cuisine: string
): Promise<SpoonacularRecipe[]> {
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
    minAggregateLikes: "2",
    cuisine,
    number: "100",
    offset: "0",
  });
  const res = await fetch(
    `https://api.spoonacular.com/recipes/complexSearch?${params}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results as SpoonacularRecipe[]) ?? [];
}

async function generateImage(title: string): Promise<string | null> {
  try {
    fal.config({ credentials: process.env.FAL_KEY });
    const result = await fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: buildImagePrompt(title),
        image_size: "landscape_4_3",
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: false,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (result.data as any)?.images?.[0]?.url ?? null;
  } catch (e) {
    console.error("fal.ai error for", title, e);
    return null;
  }
}

// Process in small batches to avoid overwhelming fal.ai
async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function POST(req: NextRequest) {
  const supabase = createPublicClient();
  if (!supabase) return NextResponse.json({ error: "No Supabase" }, { status: 503 });
  if (!process.env.FAL_KEY) return NextResponse.json({ error: "No FAL_KEY" }, { status: 503 });
  if (!process.env.SPOONACULAR_API_KEY) return NextResponse.json({ error: "No SPOONACULAR_API_KEY" }, { status: 503 });

  const reqKey = req.headers.get("x-admin-key");
  if (ADMIN_KEY && reqKey !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cuisine = new URL(req.url).searchParams.get("cuisine") || "italian";

  // 1. Fetch from Spoonacular
  const raw = await fetchSpoonacularCuisine(process.env.SPOONACULAR_API_KEY, cuisine);

  // 2. Apply code-level filters (same as search route)
  const filtered = raw.filter((r) => {
    if (!isMealPrepSuitable({ title: r.title, dishTypes: r.dishTypes })) return false;
    const ic = (r.extendedIngredients ?? []).length;
    const sc = (r.analyzedInstructions?.[0]?.steps ?? []).length;
    return ic >= 3 && ic <= 15 && sc >= 2;
  });

  console.log(`${cuisine}: ${raw.length} fetched → ${filtered.length} after filter`);

  // 3. For each recipe: generate image + upsert to Supabase
  const results: { title: string; status: string; imageUrl?: string; error?: string }[] = [];

  await processInBatches(filtered, 3, async (recipe) => {
    try {
      // Skip if already in Supabase (match by title + cuisine tag)
      const { data: existing } = await supabase!
        .from("recipes")
        .select("id")
        .eq("title", recipe.title)
        .contains("tags", [cuisine])
        .maybeSingle();

      if (existing) {
        results.push({ title: recipe.title, status: "skipped (already exists)" });
        return;
      }

      // Generate image
      const imageUrl = await generateImage(recipe.title);

      const dishTypes = recipe.dishTypes || [];
      const diets: string[] = [];

      const { error: insertError } = await supabase.from("recipes").insert({
        title: recipe.title,
        ingredients: (recipe.extendedIngredients ?? []).map((ing) => ({
          name: ing.name,
          raw: ing.original,
          amount: ing.amount,
          unit: ing.unit,
        })),
        steps: (recipe.analyzedInstructions?.[0]?.steps ?? []).map((s) => ({
          number: s.number,
          step: s.step,
        })),
        image_url: imageUrl,
        minutes: recipe.readyInMinutes,
        servings: recipe.servings,
        calories: null,
        tags: [...new Set([...dishTypes.map((d) => d.toLowerCase()), cuisine])],
        fridge_life: computeFridgeLife({ title: recipe.title, dishTypes, diets }),
        microwave_score: computeMicrowaveScore({ title: recipe.title, dishTypes }),
        enabled: true,
        translations: null,
      });

      if (insertError) throw insertError;
      results.push({ title: recipe.title, status: "created", imageUrl: imageUrl ?? undefined });
    } catch (e) {
      results.push({ title: recipe.title, status: "error", error: String(e) });
    }
  });

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status.startsWith("skipped")).length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({ cuisine, fetched: raw.length, filtered: filtered.length, created, skipped, errors, results });
}
