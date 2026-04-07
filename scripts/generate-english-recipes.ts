/**
 * Generate 6 popular English meal prep recipes, upsert to Supabase,
 * then use Claude to build image prompts and fal.ai to generate food photos.
 *
 * Usage:
 *   npx tsx scripts/generate-english-recipes.ts
 *
 * Requires in .env.local: SUPABASE_URL, SUPABASE_ANON_KEY, FAL_KEY, ANTHROPIC_API_KEY
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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!falKey) {
  console.error("Missing FAL_KEY in .env.local");
  process.exit(1);
}
if (!anthropicKey) {
  console.error("Missing ANTHROPIC_API_KEY in .env.local");
  process.exit(1);
}

fal.config({ credentials: falKey });
const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = new Anthropic({ apiKey: anthropicKey });

const BUCKET = "recipe-images";
const MODEL = "fal-ai/recraft-v3";
const FORCE_REGENERATE_IDS = new Set<number>([]);

// ─── Recipe data ─────────────────────────────────────────────────────────────

const ENGLISH_RECIPES = [
  {
    id: 9000018,
    title: "Honey Soy Chicken Thighs with Brown Rice & Broccoli",
    minutes: 40,
    servings: 4,
    calories: 490,
    n_steps: 6,
    tags: ["asian-inspired", "chicken", "rice", "broccoli", "meal-prep", "main-course", "gluten-free"],
    ingredients: [
      { name: "bone-in skin-on chicken thighs", amount: 4, unit: "pieces" },
      { name: "brown rice", amount: 300, unit: "g" },
      { name: "broccoli florets", amount: 400, unit: "g" },
      { name: "soy sauce", amount: 3, unit: "tbsp" },
      { name: "honey", amount: 2, unit: "tbsp" },
      { name: "garlic cloves, minced", amount: 3, unit: "cloves" },
      { name: "fresh ginger, grated", amount: 1, unit: "tsp" },
      { name: "sesame oil", amount: 1, unit: "tsp" },
      { name: "olive oil", amount: 1, unit: "tbsp" },
      { name: "sesame seeds", amount: 1, unit: "tbsp" },
      { name: "spring onions, sliced", amount: 2, unit: "" },
    ],
    steps: [
      { number: 1, step: "Cook brown rice according to package instructions (about 25–30 minutes). Set aside." },
      { number: 2, step: "Whisk together soy sauce, honey, garlic, ginger, and sesame oil to make the marinade." },
      { number: 3, step: "Coat chicken thighs in the marinade and let sit for 10 minutes while the oven preheats to 200°C (400°F)." },
      { number: 4, step: "Place chicken skin-side up on a foil-lined baking tray. Roast for 25–30 minutes, basting with marinade halfway, until skin is caramelised and juices run clear." },
      { number: 5, step: "Meanwhile, toss broccoli florets with olive oil, salt, and pepper. Spread on a second tray and roast for the last 15 minutes of chicken cooking time." },
      { number: 6, step: "Divide rice, broccoli, and chicken among 4 meal prep containers. Garnish with sesame seeds and spring onions." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "Cover loosely and microwave on high for 2 minutes, stirring rice halfway through. Add a splash of water if rice seems dry.",
    },
    score: 0.89,
  },
  {
    id: 9000019,
    title: "Instant Pot Lemon Garlic Chicken Thighs",
    minutes: 30,
    servings: 4,
    calories: 380,
    n_steps: 6,
    tags: ["chicken", "instant-pot", "lemon", "garlic", "meal-prep", "main-course", "gluten-free", "quick"],
    ingredients: [
      { name: "boneless skinless chicken thighs", amount: 700, unit: "g" },
      { name: "garlic cloves, minced", amount: 5, unit: "cloves" },
      { name: "lemon, zested and juiced", amount: 1, unit: "" },
      { name: "chicken stock", amount: 120, unit: "ml" },
      { name: "olive oil", amount: 2, unit: "tbsp" },
      { name: "dried oregano", amount: 1, unit: "tsp" },
      { name: "paprika", amount: 0.5, unit: "tsp" },
      { name: "salt", amount: 0.75, unit: "tsp" },
      { name: "black pepper", amount: 0.5, unit: "tsp" },
      { name: "fresh parsley, chopped", amount: 2, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Season chicken thighs with oregano, paprika, salt, and pepper." },
      { number: 2, step: "Set Instant Pot to Sauté mode. Heat olive oil and sear chicken 3 minutes per side until golden. Remove and set aside." },
      { number: 3, step: "Add garlic to the pot and sauté 30 seconds until fragrant. Deglaze with chicken stock, scraping up any browned bits." },
      { number: 4, step: "Return chicken to the pot. Add lemon zest and juice. Seal lid and cook on High Pressure for 8 minutes." },
      { number: 5, step: "Quick-release the pressure. Check that internal temperature reaches 74°C (165°F)." },
      { number: 6, step: "Let rest 5 minutes. Slice or shred as desired. Spoon over pan juices and garnish with fresh parsley." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "Reheat with a spoonful of the cooking juices, covered, for 1.5–2 minutes. Juices keep the chicken moist.",
    },
    score: 0.87,
  },
  {
    id: 9000020,
    title: "Egg Muffins with Vegetables & Cheese",
    minutes: 30,
    servings: 4,
    calories: 210,
    n_steps: 5,
    tags: ["eggs", "breakfast", "vegetarian", "gluten-free", "meal-prep", "quick", "low-carb"],
    ingredients: [
      { name: "large eggs", amount: 8, unit: "" },
      { name: "red bell pepper, diced", amount: 1, unit: "" },
      { name: "baby spinach", amount: 60, unit: "g" },
      { name: "cherry tomatoes, halved", amount: 100, unit: "g" },
      { name: "spring onions, sliced", amount: 2, unit: "" },
      { name: "cheddar cheese, shredded", amount: 80, unit: "g" },
      { name: "milk", amount: 3, unit: "tbsp" },
      { name: "salt", amount: 0.5, unit: "tsp" },
      { name: "black pepper", amount: 0.25, unit: "tsp" },
      { name: "olive oil spray", amount: 1, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 180°C (350°F). Spray a 12-cup muffin tin generously with olive oil spray." },
      { number: 2, step: "Divide diced bell pepper, spinach, cherry tomatoes, and spring onions evenly among muffin cups." },
      { number: 3, step: "Whisk eggs with milk, salt, and pepper until well combined. Pour egg mixture over the vegetables, filling each cup about ¾ full." },
      { number: 4, step: "Top each muffin with shredded cheddar. Bake for 18–20 minutes until set in the centre and lightly golden." },
      { number: 5, step: "Cool for 5 minutes before removing from tin. Store in an airtight container. Makes 12 muffins." },
    ],
    fridge_life: { days: "5", label: "5 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "Microwave 2–3 muffins at a time for 45–60 seconds. They reheat quickly and stay moist.",
    },
    score: 0.86,
  },
  {
    id: 9000021,
    title: "Greek Lemon Chicken with Potatoes",
    minutes: 55,
    servings: 4,
    calories: 520,
    n_steps: 6,
    tags: ["greek", "mediterranean", "chicken", "potatoes", "meal-prep", "main-course", "gluten-free"],
    ingredients: [
      { name: "bone-in chicken pieces (thighs and drumsticks)", amount: 1, unit: "kg" },
      { name: "baby potatoes, halved", amount: 500, unit: "g" },
      { name: "lemons, zested and juiced", amount: 2, unit: "" },
      { name: "garlic cloves, minced", amount: 4, unit: "cloves" },
      { name: "olive oil", amount: 4, unit: "tbsp" },
      { name: "dried oregano", amount: 1.5, unit: "tsp" },
      { name: "dried thyme", amount: 0.5, unit: "tsp" },
      { name: "salt", amount: 1, unit: "tsp" },
      { name: "black pepper", amount: 0.5, unit: "tsp" },
      { name: "fresh parsley, chopped", amount: 3, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 200°C (400°F)." },
      { number: 2, step: "Whisk together lemon zest, lemon juice, garlic, olive oil, oregano, thyme, salt, and pepper to make the marinade." },
      { number: 3, step: "Toss chicken and potatoes in the marinade, making sure everything is well coated. Arrange in a large roasting dish in a single layer." },
      { number: 4, step: "Roast for 40–45 minutes, flipping chicken and potatoes halfway through, until chicken skin is golden and potatoes are tender." },
      { number: 5, step: "If more browning is desired, broil on high for 3–4 minutes at the end." },
      { number: 6, step: "Rest for 5 minutes, garnish with fresh parsley, and divide into meal prep containers." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "Add a tablespoon of water or stock before microwaving for 2–2.5 minutes. The lemon sauce keeps everything juicy.",
    },
    score: 0.90,
  },
  {
    id: 9000022,
    title: "Spicy Buffalo Chicken Rice Bowl",
    minutes: 35,
    servings: 4,
    calories: 460,
    n_steps: 6,
    tags: ["american", "chicken", "rice", "spicy", "meal-prep", "main-course", "high-protein"],
    ingredients: [
      { name: "boneless skinless chicken breasts", amount: 700, unit: "g" },
      { name: "white rice", amount: 300, unit: "g" },
      { name: "buffalo hot sauce (e.g. Frank's RedHot)", amount: 80, unit: "ml" },
      { name: "unsalted butter", amount: 2, unit: "tbsp" },
      { name: "garlic powder", amount: 0.5, unit: "tsp" },
      { name: "smoked paprika", amount: 0.5, unit: "tsp" },
      { name: "celery sticks, sliced", amount: 3, unit: "" },
      { name: "shredded carrot", amount: 100, unit: "g" },
      { name: "olive oil", amount: 1, unit: "tbsp" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
      { name: "blue cheese or ranch dressing", amount: 4, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Cook white rice according to package instructions. Set aside." },
      { number: 2, step: "Season chicken breasts with garlic powder, smoked paprika, salt, and pepper." },
      { number: 3, step: "Heat olive oil in a skillet over medium-high heat. Cook chicken 5–6 minutes per side until cooked through. Let rest 5 minutes, then slice." },
      { number: 4, step: "Melt butter in a small saucepan over low heat. Stir in buffalo sauce until combined. Toss sliced chicken in the buffalo sauce." },
      { number: 5, step: "Prepare bowls: divide rice among 4 containers, then arrange buffalo chicken, celery, and shredded carrot on top." },
      { number: 6, step: "Drizzle 1 tbsp of blue cheese or ranch dressing over each bowl just before serving, or store dressing separately." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "Heat rice and chicken together for 2 minutes. Keep the dressing separate and add it after reheating.",
    },
    score: 0.88,
  },
  {
    id: 9000023,
    title: "Quinoa Sweet Potato Bowl with Crispy Chickpeas",
    minutes: 40,
    servings: 4,
    calories: 410,
    n_steps: 6,
    tags: ["vegetarian", "vegan", "quinoa", "sweet-potato", "chickpeas", "meal-prep", "main-course", "gluten-free"],
    ingredients: [
      { name: "quinoa", amount: 250, unit: "g" },
      { name: "sweet potatoes, cubed", amount: 500, unit: "g" },
      { name: "canned chickpeas, drained", amount: 400, unit: "g" },
      { name: "baby spinach or kale", amount: 80, unit: "g" },
      { name: "olive oil", amount: 3, unit: "tbsp" },
      { name: "smoked paprika", amount: 1, unit: "tsp" },
      { name: "cumin", amount: 0.5, unit: "tsp" },
      { name: "garlic powder", amount: 0.5, unit: "tsp" },
      { name: "tahini", amount: 3, unit: "tbsp" },
      { name: "lemon juice", amount: 2, unit: "tbsp" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 200°C (400°F). Cook quinoa in salted water according to package instructions (about 15 minutes). Fluff and set aside." },
      { number: 2, step: "Toss sweet potato cubes with 1.5 tbsp olive oil, 0.5 tsp smoked paprika, salt, and pepper. Spread on one side of a large baking tray." },
      { number: 3, step: "Pat chickpeas dry with paper towels. Toss with remaining olive oil, remaining paprika, cumin, and garlic powder. Spread on the other side of the baking tray." },
      { number: 4, step: "Roast for 25–30 minutes, tossing chickpeas halfway through, until sweet potatoes are tender and chickpeas are crispy and golden." },
      { number: 5, step: "Whisk together tahini, lemon juice, 2–3 tbsp water, and a pinch of salt to make the dressing." },
      { number: 6, step: "Divide quinoa among 4 containers. Top with sweet potato, crispy chickpeas, and greens. Drizzle with tahini dressing or store separately." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: {
      level: "good",
      label: "Reheats Well",
      tip: "Reheat grains and vegetables for 1.5–2 minutes. Add the tahini dressing and greens after reheating. Chickpeas will soften slightly but stay flavourful.",
    },
    score: 0.87,
  },
];

// ─── Upsert recipes ───────────────────────────────────────────────────────────

async function upsertRecipes() {
  console.log("Upserting recipes to Supabase...");

  // Fetch existing image URLs so we don't overwrite them
  const { data: existing } = await supabase
    .from("recipes")
    .select("id, image_url")
    .in("id", ENGLISH_RECIPES.map((r) => r.id));

  const existingImages = new Map<number, string>(
    (existing ?? [])
      .filter((r: { id: number; image_url: string | null }) => r.image_url)
      .map((r: { id: number; image_url: string }) => [r.id, r.image_url])
  );

  const records = ENGLISH_RECIPES.map((r) => ({
    id: r.id,
    title: r.title,
    minutes: r.minutes,
    servings: r.servings,
    calories: r.calories,
    n_steps: r.n_steps,
    tags: r.tags,
    ingredients: r.ingredients,
    steps: r.steps,
    fridge_life: r.fridge_life,
    microwave_score: r.microwave_score,
    image_url: existingImages.get(r.id) ?? null,
    enabled: true,
  }));

  const { error } = await supabase.from("recipes").upsert(records, { onConflict: "id" });
  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }
  console.log("✓ Recipes upserted.\n");
}

// ─── Build image prompt via Claude ───────────────────────────────────────────

async function buildImagePromptWithClaude(recipe: (typeof ENGLISH_RECIPES)[0]): Promise<string> {
  const ingredientList = recipe.ingredients.map((i) => i.name).join(", ");

  const stepsSummary = recipe.steps.map((s) => s.step).join(" ");

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Given this meal prep recipe, fill in only the [DISH NAME] placeholder in the prompt below with a vivid 10-15 word description of the finished dish's appearance (colours, textures, key visible ingredients). Output the complete prompt and nothing else.

Recipe: ${recipe.title}
Key ingredients: ${ingredientList}
Cooking method: ${stepsSummary.slice(0, 300)}

Prompt template:
Professional food photography of [DISH NAME], served on a clean ceramic plate or bowl, 45-degree overhead angle, soft diffused natural light from one side, shallow depth of field with sharp focus on the hero ingredient, minimal elegant plating with a small fresh herb or garnish accent, neutral background (white, light stone, warm wood, or linen), warm and inviting color tone, photorealistic, editorial food styling, appetizing and fresh, 4K detail`,
      },
    ],
  });

  return (message.content[0] as { text: string }).text.trim();
}

// ─── Generate image via fal.ai ────────────────────────────────────────────────

async function generateImage(recipe: (typeof ENGLISH_RECIPES)[0], index: number, total: number) {
  const { id, title } = recipe;
  console.log(`  [${index}/${total}] Building image prompt for "${title}" via Claude...`);

  let prompt: string;
  try {
    prompt = await buildImagePromptWithClaude(recipe);
    console.log(`  [${index}/${total}] Prompt: ${prompt.slice(0, 100)}...`);
  } catch (err) {
    const e = err as Error;
    console.error(`  [${index}/${total}] Claude prompt generation failed: ${e.message}. Using fallback.`);
    prompt = `${title}, meal prep dish, beautifully plated in a bowl or container, cinematic food photography, 45-degree angle, warm professional lighting, appetising, sharp focus.`;
  }

  console.log(`  [${index}/${total}] Generating image via fal.ai...`);
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

    // Download image
    const imgRes = await fetch(tempUrl);
    if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    // Upload to Supabase Storage
    const fileName = `${id}.webp`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, { contentType: "image/webp", upsert: true });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // Get public URL and update DB
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    const { error: updateError } = await supabase
      .from("recipes")
      .update({ image_url: imageUrl })
      .eq("id", id);
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

  // Only generate images for recipes that don't have one yet (or forced)
  const { data: existing } = await supabase
    .from("recipes")
    .select("id, image_url")
    .in("id", ENGLISH_RECIPES.map((r) => r.id));

  const missingImages = ENGLISH_RECIPES.filter((r) => {
    if (FORCE_REGENERATE_IDS.has(r.id)) return true;
    const row = (existing ?? []).find((e: { id: number; image_url: string | null }) => e.id === r.id);
    return !row?.image_url;
  });

  if (missingImages.length > 0) {
    console.log(`Generating images for ${missingImages.length} recipe(s)...\n`);
    for (let i = 0; i < missingImages.length; i++) {
      await generateImage(missingImages[i], i + 1, missingImages.length);
    }
    console.log("\n✓ Image generation complete.");
  } else {
    console.log("All recipes already have images — nothing to generate.");
    console.log("Add IDs to FORCE_REGENERATE_IDS to regenerate specific images.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
