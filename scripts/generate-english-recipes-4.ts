/**
 * Generate 5 English meal prep recipes (batch 4 — sandwiches & wraps), upsert to Supabase,
 * then use Claude + Recraft V3 to generate food photos.
 *
 * Usage:
 *   npx tsx scripts/generate-english-recipes-4.ts
 */

import * as path from "path";
import * as dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { fal } from "@fal-ai/client";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const falKey = process.env.FAL_KEY!;
const anthropicKey = process.env.ANTHROPIC_API_KEY!;

if (!supabaseUrl || !supabaseKey) { console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
if (!falKey) { console.error("Missing FAL_KEY"); process.exit(1); }
if (!anthropicKey) { console.error("Missing ANTHROPIC_API_KEY"); process.exit(1); }

fal.config({ credentials: falKey });
const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = new Anthropic({ apiKey: anthropicKey });

const BUCKET = "recipe-images";
const MODEL = "fal-ai/recraft-v3";
const FORCE_REGENERATE_IDS = new Set<number>([]);

// ─── Recipe data ──────────────────────────────────────────────────────────────

const RECIPES = [
  {
    id: 9000052,
    title: "BLT (Bacon, Lettuce & Tomato)",
    minutes: 15,
    servings: 4,
    calories: 420,
    n_steps: 4,
    tags: ["american", "sandwich", "lunch", "meal-prep", "quick"],
    ingredients: [
      { name: "thick-cut streaky bacon rashers", amount: 12, unit: "" },
      { name: "sourdough or white sandwich bread", amount: 8, unit: "slices" },
      { name: "ripe tomatoes, thickly sliced", amount: 2, unit: "" },
      { name: "iceberg or romaine lettuce leaves", amount: 4, unit: "large leaves" },
      { name: "mayonnaise", amount: 4, unit: "tbsp" },
      { name: "Dijon mustard", amount: 1, unit: "tsp" },
      { name: "salt and black pepper", amount: 1, unit: "to taste" },
      { name: "butter, softened", amount: 1, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Cook bacon in a skillet over medium heat until crispy, about 3–4 minutes per side. Drain on paper towels." },
      { number: 2, step: "Lightly toast the bread slices until golden. Butter one side of each slice while warm." },
      { number: 3, step: "Mix mayonnaise with Dijon mustard. Spread generously on the unbuttered side of each toast slice." },
      { number: 4, step: "Layer lettuce, tomato slices (seasoned with salt and pepper), and 3 bacon rashers on each sandwich. Top with the second slice. Cut diagonally and serve. For meal prep, pack bacon and components separately — assemble fresh to keep the bread from going soggy." },
    ],
    fridge_life: { days: "3", label: "3 Days" },
    microwave_score: { level: "ok", label: "Reheat Gently", tip: "Reheat bacon separately in a pan or microwave for 30 seconds. Assemble the sandwich fresh for best texture — pre-assembled BLTs go soggy." },
  },
  {
    id: 9000053,
    title: "Classic Club Sandwich",
    minutes: 20,
    servings: 4,
    calories: 560,
    n_steps: 5,
    tags: ["american", "sandwich", "chicken", "lunch", "meal-prep", "quick"],
    ingredients: [
      { name: "white or whole wheat sandwich bread", amount: 12, unit: "slices" },
      { name: "cooked chicken breast, sliced", amount: 400, unit: "g" },
      { name: "streaky bacon rashers", amount: 8, unit: "" },
      { name: "ripe tomatoes, sliced", amount: 2, unit: "" },
      { name: "iceberg lettuce leaves", amount: 4, unit: "" },
      { name: "cheddar or Swiss cheese, sliced", amount: 4, unit: "slices" },
      { name: "mayonnaise", amount: 5, unit: "tbsp" },
      { name: "Dijon mustard", amount: 1, unit: "tbsp" },
      { name: "salt and black pepper", amount: 1, unit: "to taste" },
      { name: "cocktail picks or toothpicks", amount: 16, unit: "" },
    ],
    steps: [
      { number: 1, step: "Cook bacon until crispy. Toast all 12 bread slices until golden." },
      { number: 2, step: "Mix mayonnaise and Dijon mustard. Spread on one side of each toast slice." },
      { number: 3, step: "First layer: place a toast slice mayo-side up. Layer with lettuce, tomato (seasoned with salt and pepper), and sliced chicken." },
      { number: 4, step: "Second layer: place a second toast slice mayo-side up. Layer with bacon and cheese." },
      { number: 5, step: "Top with the third toast slice, mayo-side down. Press gently and secure each quarter with a cocktail pick. Cut into 4 triangles. For meal prep, store fillings separately and assemble fresh." },
    ],
    fridge_life: { days: "3", label: "3 Days" },
    microwave_score: { level: "ok", label: "Reheat Gently", tip: "Store fillings separately. Reheat chicken and bacon before assembling fresh — the triple-decker structure doesn't hold up well when reheated whole." },
  },
  {
    id: 9000054,
    title: "Chicken Caesar Wrap",
    minutes: 20,
    servings: 4,
    calories: 480,
    n_steps: 4,
    tags: ["american", "chicken", "wrap", "lunch", "meal-prep", "quick"],
    ingredients: [
      { name: "boneless skinless chicken breasts", amount: 500, unit: "g" },
      { name: "large flour tortillas (25 cm)", amount: 4, unit: "" },
      { name: "romaine lettuce, chopped", amount: 1, unit: "head" },
      { name: "parmesan, shaved or grated", amount: 50, unit: "g" },
      { name: "Caesar dressing", amount: 80, unit: "ml" },
      { name: "croutons, lightly crushed", amount: 60, unit: "g" },
      { name: "garlic powder", amount: 0.5, unit: "tsp" },
      { name: "smoked paprika", amount: 0.5, unit: "tsp" },
      { name: "olive oil", amount: 1, unit: "tbsp" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
    ],
    steps: [
      { number: 1, step: "Season chicken with garlic powder, paprika, salt, and pepper. Heat oil in a skillet over medium-high heat. Cook chicken 5–6 minutes per side until golden and cooked through. Rest 5 minutes, then slice thinly." },
      { number: 2, step: "Toss chopped romaine with Caesar dressing, parmesan, and croutons in a bowl." },
      { number: 3, step: "Warm tortillas in a dry pan or microwave for 15 seconds to make them pliable." },
      { number: 4, step: "Divide Caesar salad among tortillas. Top with sliced chicken. Fold in the sides, then roll tightly from the bottom. Cut in half diagonally. For meal prep, keep dressing and croutons separate and toss just before assembling." },
    ],
    fridge_life: { days: "3", label: "3 Days" },
    microwave_score: { level: "ok", label: "Reheat Gently", tip: "Reheat chicken slices separately for 1 minute. Assemble the wrap fresh with cold lettuce — reheating a fully assembled wrap makes the lettuce wilt." },
  },
  {
    id: 9000055,
    title: "Italian Sub",
    minutes: 15,
    servings: 4,
    calories: 590,
    n_steps: 3,
    tags: ["italian", "sandwich", "lunch", "meal-prep", "quick"],
    ingredients: [
      { name: "Italian sub rolls or baguettes", amount: 4, unit: "" },
      { name: "Genoa salami, thinly sliced", amount: 120, unit: "g" },
      { name: "pepperoni, thinly sliced", amount: 80, unit: "g" },
      { name: "capicola or ham, thinly sliced", amount: 80, unit: "g" },
      { name: "provolone cheese, sliced", amount: 100, unit: "g" },
      { name: "shredded iceberg lettuce", amount: 2, unit: "cups" },
      { name: "ripe tomatoes, sliced", amount: 2, unit: "" },
      { name: "red onion, thinly sliced", amount: 0.5, unit: "" },
      { name: "banana peppers or pepperoncini", amount: 40, unit: "g" },
      { name: "red wine vinegar", amount: 2, unit: "tbsp" },
      { name: "olive oil", amount: 2, unit: "tbsp" },
      { name: "dried oregano", amount: 0.5, unit: "tsp" },
      { name: "salt and black pepper", amount: 1, unit: "to taste" },
    ],
    steps: [
      { number: 1, step: "Slice rolls lengthways. Drizzle the cut sides with olive oil and red wine vinegar. Season with oregano, salt, and pepper." },
      { number: 2, step: "Layer provolone on the bottom half, then salami, pepperoni, and capicola." },
      { number: 3, step: "Top with shredded lettuce, tomato, red onion, and banana peppers. Press the top half down firmly and wrap tightly in parchment or foil. Let rest 5 minutes before slicing in half. The wrap helps the flavours meld — these taste even better after 30 minutes." },
    ],
    fridge_life: { days: "3", label: "3 Days" },
    microwave_score: { level: "ok", label: "Reheat Gently", tip: "Best served at room temperature or cold — the cured meats don't need heating. If you prefer warm, remove lettuce and tomato, wrap in foil, and heat at 180°C for 5 minutes." },
  },
  {
    id: 9000056,
    title: "Grilled Cheese",
    minutes: 15,
    servings: 4,
    calories: 450,
    n_steps: 4,
    tags: ["american", "sandwich", "vegetarian", "lunch", "meal-prep", "quick"],
    ingredients: [
      { name: "thick-cut white or sourdough bread", amount: 8, unit: "slices" },
      { name: "sharp cheddar, sliced or grated", amount: 150, unit: "g" },
      { name: "gruyère or American cheese, sliced", amount: 100, unit: "g" },
      { name: "butter, softened", amount: 4, unit: "tbsp" },
      { name: "garlic powder", amount: 0.25, unit: "tsp" },
      { name: "Dijon mustard", amount: 2, unit: "tsp" },
      { name: "fresh thyme leaves (optional)", amount: 1, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Mix softened butter with garlic powder and thyme (if using). Spread the garlic butter on one side of each bread slice." },
      { number: 2, step: "Spread a thin layer of Dijon mustard on the unbuttered side of 4 slices. Layer cheddar and gruyère generously on top. Close the sandwiches buttered-side out." },
      { number: 3, step: "Heat a skillet or griddle over medium-low heat. Place sandwiches butter-side down. Cook 3–4 minutes until deep golden brown. Press gently with a spatula." },
      { number: 4, step: "Flip and cook the other side 2–3 minutes until golden and cheese is fully melted. Rest 1 minute before cutting diagonally. Serve with tomato soup for dipping." },
    ],
    fridge_life: { days: "3", label: "3 Days" },
    microwave_score: { level: "ok", label: "Reheat Gently", tip: "For best results reheat in a skillet over medium-low heat for 2 minutes per side to restore the crispy crust. Microwaving makes the bread chewy." },
  },
];

// ─── Upsert recipes ───────────────────────────────────────────────────────────

async function upsertRecipes() {
  console.log("Upserting recipes to Supabase...");
  const { data: existing } = await supabase
    .from("recipes").select("id, image_url").in("id", RECIPES.map((r) => r.id));

  const existingImages = new Map<number, string>(
    (existing ?? [])
      .filter((r: { id: number; image_url: string | null }) => r.image_url)
      .map((r: { id: number; image_url: string }) => [r.id, r.image_url])
  );

  const records = RECIPES.map((r) => ({
    id: r.id, title: r.title, minutes: r.minutes, servings: r.servings,
    calories: r.calories, n_steps: r.n_steps, tags: r.tags,
    ingredients: r.ingredients, steps: r.steps,
    fridge_life: r.fridge_life, microwave_score: r.microwave_score,
    image_url: existingImages.get(r.id) ?? null, enabled: true,
  }));

  const { error } = await supabase.from("recipes").upsert(records, { onConflict: "id" });
  if (error) { console.error("Upsert failed:", error.message); process.exit(1); }
  console.log("✓ Recipes upserted.\n");
}

// ─── Build image prompt via Claude ───────────────────────────────────────────

async function buildImagePrompt(recipe: (typeof RECIPES)[0]): Promise<string> {
  const ingredientList = recipe.ingredients.map((i) => i.name).join(", ");
  const stepsSummary = recipe.steps.map((s) => s.step).join(" ");

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{
      role: "user",
      content: `Given this recipe, fill in only the [DISH NAME] placeholder in the prompt below with a vivid 10-15 word description of the finished dish's appearance (colours, textures, key visible ingredients). Output the complete prompt and nothing else.

Recipe: ${recipe.title}
Key ingredients: ${ingredientList}
Cooking method: ${stepsSummary.slice(0, 300)}

Prompt template:
Professional food photography of [DISH NAME], served on a clean ceramic plate or bowl, 45-degree overhead angle, soft diffused natural light from one side, shallow depth of field with sharp focus on the hero ingredient, minimal elegant plating with a small fresh herb or garnish accent, neutral background (white, light stone, warm wood, or linen), warm and inviting color tone, photorealistic, editorial food styling, appetizing and fresh, 4K detail`,
    }],
  });

  return (message.content[0] as { text: string }).text.trim();
}

// ─── Generate image via fal.ai ────────────────────────────────────────────────

async function generateImage(recipe: (typeof RECIPES)[0], index: number, total: number) {
  const { id, title } = recipe;
  console.log(`  [${index}/${total}] Building prompt for "${title}"...`);

  let prompt: string;
  try {
    prompt = await buildImagePrompt(recipe);
    console.log(`  [${index}/${total}] Prompt: ${prompt.slice(0, 100)}...`);
  } catch {
    prompt = `Professional food photography of ${title}, served on a clean ceramic plate, 45-degree overhead angle, soft diffused natural light from one side, shallow depth of field, minimal elegant plating, neutral background, warm and inviting color tone, photorealistic, editorial food styling, appetizing and fresh, 4K detail`;
    console.warn(`  [${index}/${total}] Claude failed, using fallback prompt.`);
  }

  console.log(`  [${index}/${total}] Generating image...`);
  try {
    const result = (await fal.run(MODEL, {
      input: {
        prompt,
        image_size: { width: 512, height: 384 },
        style: "realistic_image",
        num_images: 1,
      },
    })) as { data: { images: { url: string }[] } };

    const tempUrl = result.data?.images?.[0]?.url;
    if (!tempUrl) throw new Error("No image URL in fal.ai response");

    const imgRes = await fetch(tempUrl);
    if (!imgRes.ok) throw new Error(`Failed to download: ${imgRes.status}`);
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    const fileName = `${id}.webp`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET).upload(fileName, buffer, { contentType: "image/webp", upsert: true });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    const { error: updateError } = await supabase.from("recipes").update({ image_url: imageUrl }).eq("id", id);
    if (updateError) throw new Error(`DB update failed: ${updateError.message}`);

    console.log(`  [${index}/${total}] ✓ ${title}`);
  } catch (err) {
    const e = err as Error & { body?: unknown };
    console.error(`  [${index}/${total}] ✗ ${title}: ${e.message}`);
    if (e.body) console.error("    detail:", JSON.stringify(e.body).slice(0, 200));
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await upsertRecipes();

  const { data: existing } = await supabase
    .from("recipes").select("id, image_url").in("id", RECIPES.map((r) => r.id));

  const toGenerate = RECIPES.filter((r) => {
    if (FORCE_REGENERATE_IDS.has(r.id)) return true;
    const row = (existing ?? []).find((e: { id: number; image_url: string | null }) => e.id === r.id);
    return !row?.image_url;
  });

  if (toGenerate.length > 0) {
    console.log(`Generating images for ${toGenerate.length} recipe(s)...\n`);
    for (let i = 0; i < toGenerate.length; i++) {
      await generateImage(toGenerate[i], i + 1, toGenerate.length);
    }
    console.log("\n✓ Image generation complete.");
  } else {
    console.log("All recipes already have images. Add IDs to FORCE_REGENERATE_IDS to regenerate.");
  }
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
