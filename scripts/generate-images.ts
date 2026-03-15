/**
 * Generate AI food images for recipes using fal.ai Flux.1 Schnell,
 * upload to Supabase Storage, and update image_url in the DB.
 *
 * Usage:
 *   npm run generate-images                      # full run (all recipes without image_url)
 *   npm run generate-images -- --limit=10        # test batch
 *   npm run generate-images -- --limit=10 --force  # regenerate first 10 (overwrite existing)
 *
 * Prerequisites:
 *   1. Create a public Supabase Storage bucket named "recipe-images"
 *   2. Add FAL_KEY to .env.local
 *
 * Requires in .env.local: SUPABASE_URL, SUPABASE_ANON_KEY, FAL_KEY
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { fal } from "@fal-ai/client";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const falKey = process.env.FAL_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}
if (!falKey) {
  console.error("Missing FAL_KEY in .env.local");
  process.exit(1);
}

fal.config({ credentials: falKey });
const supabase = createClient(supabaseUrl, supabaseKey);

// Parse flags
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1]) : Infinity;
const FORCE = process.argv.includes("--force");
const CONCURRENCY = 2; // Recraft V3 concurrent limit
const BUCKET = "recipe-images";
const MODEL = "fal-ai/recraft-v3";

interface Ingredient {
  name: string;
  raw?: string;
}

interface Step {
  number: number;
  step: string;
}

interface Recipe {
  id: number;
  title: string;
  tags: string[];
  ingredients: Ingredient[];
  steps: Step[];
}


// Tags that hint at cuisine or dish type for better visual grounding
const CUISINE_TAGS = new Set([
  "italian", "chinese", "japanese", "korean", "mexican", "thai", "indian",
  "french", "mediterranean", "vietnamese", "greek", "american", "southern",
  "middle-eastern", "spanish", "moroccan",
]);
const DISH_TYPE_TAGS = new Set([
  "pasta", "soup", "stew", "salad", "rice", "noodles", "casserole",
  "curry", "stir-fry", "sandwich", "tacos", "pizza", "burger",
  "bowl", "wrap", "skewers",
]);

function buildPrompt(recipe: Recipe): string {
  // All meaningful ingredients with amounts from raw string
  const skipNames = new Set(["salt", "water", "pepper", "oil", "sugar", "flour", "garlic powder"]);
  const ingredients = recipe.ingredients
    .map((i) => (i.raw ?? i.name)?.trim())
    .filter((s) => s && !skipNames.has(s.toLowerCase()))
    .slice(0, 10)
    .join(", ");

  // Cuisine and dish type from tags
  const tags = recipe.tags ?? [];
  const cuisine = tags.find((t) => CUISINE_TAGS.has(t.toLowerCase()));
  const dishType = tags.find((t) => DISH_TYPE_TAGS.has(t.toLowerCase()));

  const dishDescription = [
    cuisine ? `${cuisine} style` : "",
    dishType ?? "",
  ].filter(Boolean).join(", ");

  // Recraft V3 has a 1000-character prompt limit — build tightly
  const parts = [
    `Subject: "${recipe.title}"${dishDescription ? ` (${dishDescription})` : ""}${ingredients ? `, featuring ${ingredients}` : ""}.`,
    "Style: Cinematic food photography, gourmet, professional, realistic, high-definition, true colors.",
    "Angle: Top-down flat lay or 45-degree close-up.",
    "Lighting: Bright natural daylight from a large window, clean and airy, vibrant and appetising colors.",
    "Props: Clean minimalist ceramic container or white stone plate on a light wood tray. Minimal props, nothing extra in background.",
    "Texture: Vivid and saturated natural colors, rich food texture.",
    "Background: Light warm gray or white marble surface, clean and minimal.",
    "Camera: Sony A7R IV, 50mm macro lens, shallow depth of field, sharp focus. No text or watermarks.",
  ].filter(Boolean);

  // Trim to 1000 chars by dropping trailing parts if needed
  let prompt = parts.join(" ");
  while (prompt.length > 1000 && parts.length > 1) {
    parts.pop();
    prompt = parts.join(" ");
  }
  // Last resort: hard truncate
  return prompt.slice(0, 1000);
}

async function fetchRecipes(): Promise<Recipe[]> {
  const all: Recipe[] = [];
  const PAGE = 1000;
  let from = 0;

  while (true) {
    let query = supabase
      .from("recipes")
      .select("id, title, tags, ingredients, steps")
      .eq("enabled", true)
      .range(from, from + PAGE - 1);

    if (!FORCE) query = query.is("image_url", null);

    const { data, error } = await query;

    if (error) { console.error("Supabase fetch error:", error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    all.push(...(data as Recipe[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return all;
}

async function processRecipe(recipe: Recipe, index: number, total: number): Promise<void> {
  try {
    const prompt = buildPrompt(recipe);

    // 1. Generate image with fal.ai Flux.1 Schnell
    const result = await fal.run(MODEL, {
      input: {
        prompt,
        image_size: { width: 512, height: 384 },
        style: "realistic_image",
        num_images: 1,
      },
    }) as { data: { images: { url: string }[] } };

    const tempUrl = result.data?.images?.[0]?.url;
    if (!tempUrl) throw new Error("No image URL in fal.ai response");

    // 2. Download image
    const imgRes = await fetch(tempUrl);
    if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    // 3. Upload to Supabase Storage
    const fileName = `${recipe.id}.webp`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, { contentType: "image/webp", upsert: true });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // 4. Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // 5. Update DB
    const { error: updateError } = await supabase
      .from("recipes")
      .update({ image_url: publicUrl })
      .eq("id", recipe.id);

    if (updateError) throw new Error(`DB update failed: ${updateError.message}`);

    console.log(`  [${index}/${total}] ✓ ${recipe.id} — ${recipe.title.slice(0, 50)}`);
  } catch (err) {
    const e = err as Error & { body?: unknown; status?: number };
    console.error(`  [${index}/${total}] ✗ ${recipe.id} — ${recipe.title.slice(0, 50)}: ${e.message}`);
    if (e.body) console.error(`    detail:`, JSON.stringify(e.body).slice(0, 200));
  }
}

async function main() {
  const mode = FORCE ? "force-regenerate" : "skip existing";
  console.log(`Fetching recipes... (mode: ${mode})`);
  let recipes = await fetchRecipes();

  if (LIMIT < Infinity) {
    recipes = recipes.slice(0, LIMIT);
    console.log(`Test mode: processing ${recipes.length} recipes`);
  } else {
    console.log(`Full run: ${recipes.length} recipes to process`);
  }

  if (recipes.length === 0) {
    console.log("No recipes to process. Done.");
    return;
  }

  console.log(`Running with concurrency=${CONCURRENCY}\n`);

  let i = 0;
  const total = recipes.length;

  while (i < recipes.length) {
    const batch = recipes.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((r, j) => processRecipe(r, i + j + 1, total)));
    i += CONCURRENCY;
  }

  console.log(`\n✓ Done. ${total} recipes processed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
