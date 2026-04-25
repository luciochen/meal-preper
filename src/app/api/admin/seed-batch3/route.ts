// POST /api/admin/seed-batch3
//
// Seeds 6 light/seafood/healthy recipes.
//
// Usage:
//   curl -X POST "http://localhost:3000/api/admin/seed-batch3" \
//        -H "x-admin-key: zest-admin-2026"

import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { createServiceClient } from "@/lib/supabase/server";
import { computeFridgeLife, computeMicrowaveScore } from "@/lib/mealPrepUtils";

const ADMIN_KEY = process.env.ADMIN_KEY;

function buildImagePrompt(
  title: string,
  ingredients: { name: string }[],
  steps: { number: number; step: string }[]
): string {
  const ingredientNames = ingredients.map((i) => i.name).join(", ");
  const allSteps = steps.map((s) => s.step).join(" ");
  const core =
    `Professional food photography of ${title}. ` +
    `Key ingredients: ${ingredientNames}. ` +
    `Recipe: ${allSteps}`;
  const style =
    ` Served on a clean ceramic plate or bowl, 45-degree overhead angle, ` +
    `soft diffused natural light, shallow depth of field with sharp focus on the hero ingredient, ` +
    `minimal elegant plating with a fresh herb garnish, neutral background (white, light stone, or warm wood), ` +
    `warm inviting color tone, photorealistic editorial food styling, 4K.`;
  const maxCore = 950 - style.length;
  return core.slice(0, maxCore) + style;
}

interface RecipeSeed {
  id: number;
  title: string;
  minutes: number;
  servings: number;
  calories: number | null;
  tags: string[];
  ingredients: { name: string; raw: string; amount: number; unit: string }[];
  steps: { number: number; step: string }[];
}

const BATCH3_RECIPES: RecipeSeed[] = [
  {
    id: 9000075,
    title: "Sheet Pan Lemon Herb Salmon & Asparagus",
    minutes: 25,
    servings: 4,
    calories: 420,
    tags: ["seafood", "main-course", "meal-prep", "gluten-free", "low-calorie"],
    ingredients: [
      { name: "salmon fillets", raw: "4 salmon fillets (about 150g each)", amount: 600, unit: "g" },
      { name: "asparagus", raw: "400g asparagus, woody ends trimmed", amount: 400, unit: "g" },
      { name: "lemon", raw: "2 lemons, 1 sliced into rounds, 1 juiced", amount: 2, unit: "whole" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "fresh dill", raw: "2 tbsp fresh dill, chopped", amount: 2, unit: "tbsp" },
      { name: "fresh parsley", raw: "2 tbsp fresh parsley, chopped", amount: 2, unit: "tbsp" },
      { name: "olive oil", raw: "3 tbsp olive oil", amount: 3, unit: "tbsp" },
      { name: "Dijon mustard", raw: "1 tbsp Dijon mustard", amount: 1, unit: "tbsp" },
      { name: "capers", raw: "1 tbsp capers, roughly chopped", amount: 1, unit: "tbsp" },
      { name: "salt", raw: "1 tsp salt", amount: 1, unit: "tsp" },
      { name: "black pepper", raw: "½ tsp black pepper", amount: 0.5, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 220°C. Line a large sheet pan with parchment paper." },
      { number: 2, step: "Whisk together olive oil, lemon juice, garlic, Dijon mustard, capers, dill, and parsley." },
      { number: 3, step: "Toss asparagus with half the herb mixture and arrange in a single layer on the sheet pan. Season with salt and pepper." },
      { number: 4, step: "Place salmon fillets among the asparagus. Spoon the remaining herb mixture over the salmon. Top each fillet with a lemon round." },
      { number: 5, step: "Roast for 12–15 minutes until salmon is just cooked through and asparagus is tender with slightly charred tips. Serve directly from the pan." },
    ],
  },
  {
    id: 9000076,
    title: "Cauliflower Fried Rice",
    minutes: 20,
    servings: 4,
    calories: 220,
    tags: ["asian-inspired", "vegetarian", "gluten-free", "low-carb", "low-calorie", "main-course", "meal-prep", "quick"],
    ingredients: [
      { name: "cauliflower", raw: "1 large head cauliflower, riced (or 600g pre-riced)", amount: 600, unit: "g" },
      { name: "eggs", raw: "3 large eggs, beaten", amount: 3, unit: "whole" },
      { name: "frozen peas and carrots", raw: "1 cup frozen peas and carrots", amount: 1, unit: "cup" },
      { name: "corn", raw: "½ cup frozen corn", amount: 0.5, unit: "cup" },
      { name: "scallions", raw: "4 scallions, sliced (whites and greens separated)", amount: 4, unit: "stalks" },
      { name: "garlic", raw: "3 cloves garlic, minced", amount: 3, unit: "cloves" },
      { name: "ginger", raw: "1 tsp fresh ginger, grated", amount: 1, unit: "tsp" },
      { name: "soy sauce", raw: "3 tbsp soy sauce", amount: 3, unit: "tbsp" },
      { name: "sesame oil", raw: "1 tbsp sesame oil", amount: 1, unit: "tbsp" },
      { name: "vegetable oil", raw: "2 tbsp vegetable oil", amount: 2, unit: "tbsp" },
      { name: "sesame seeds", raw: "1 tsp sesame seeds, to garnish", amount: 1, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "If using a whole cauliflower, cut into florets and pulse in a food processor until it resembles rice grains. Do not over-process." },
      { number: 2, step: "Heat vegetable oil in a large wok or skillet over high heat until very hot. Add garlic, ginger, and scallion whites; stir-fry 30 seconds." },
      { number: 3, step: "Add frozen peas, carrots, and corn. Stir-fry 2 minutes until heated through." },
      { number: 4, step: "Add cauliflower rice and stir-fry for 4–5 minutes, pressing it against the hot surface occasionally to get some browning." },
      { number: 5, step: "Push everything to the side, scramble eggs in the empty space until just set, then fold into the rice. Add soy sauce and sesame oil. Toss well. Top with scallion greens and sesame seeds." },
    ],
  },
  {
    id: 9000077,
    title: "Greek Chicken Lettuce Wraps",
    minutes: 25,
    servings: 4,
    calories: 360,
    tags: ["greek", "mediterranean", "chicken", "gluten-free", "low-calorie", "main-course", "meal-prep", "quick"],
    ingredients: [
      { name: "ground chicken or minced chicken", raw: "500g ground chicken", amount: 500, unit: "g" },
      { name: "butter lettuce or iceberg lettuce", raw: "1 head butter lettuce, leaves separated", amount: 1, unit: "whole" },
      { name: "cucumber", raw: "1 cucumber, diced", amount: 1, unit: "whole" },
      { name: "cherry tomatoes", raw: "200g cherry tomatoes, halved", amount: 200, unit: "g" },
      { name: "red onion", raw: "¼ red onion, finely diced", amount: 0.25, unit: "whole" },
      { name: "kalamata olives", raw: "½ cup kalamata olives, pitted and halved", amount: 0.5, unit: "cup" },
      { name: "feta cheese", raw: "100g feta cheese, crumbled", amount: 100, unit: "g" },
      { name: "garlic", raw: "3 cloves garlic, minced", amount: 3, unit: "cloves" },
      { name: "dried oregano", raw: "1½ tsp dried oregano", amount: 1.5, unit: "tsp" },
      { name: "lemon juice", raw: "2 tbsp lemon juice", amount: 2, unit: "tbsp" },
      { name: "olive oil", raw: "2 tbsp olive oil", amount: 2, unit: "tbsp" },
      { name: "tzatziki", raw: "tzatziki sauce to serve", amount: 0.5, unit: "cup" },
    ],
    steps: [
      { number: 1, step: "Heat olive oil in a skillet over medium-high heat. Add garlic and oregano and cook 30 seconds. Add ground chicken and cook, breaking it up, for 7–8 minutes until cooked through and lightly browned." },
      { number: 2, step: "Squeeze lemon juice over the chicken, season with salt and pepper. Remove from heat." },
      { number: 3, step: "Combine cucumber, cherry tomatoes, red onion, and olives in a bowl. Dress with a drizzle of olive oil and a pinch of oregano." },
      { number: 4, step: "Wash and dry lettuce leaves and arrange on a platter." },
      { number: 5, step: "Fill each lettuce cup with a spoonful of chicken, then top with the cucumber-tomato mixture and crumbled feta. Serve with tzatziki on the side." },
    ],
  },
  {
    id: 9000078,
    title: "Baked Cod with Lemon & Capers",
    minutes: 20,
    servings: 4,
    calories: 290,
    tags: ["seafood", "mediterranean", "main-course", "meal-prep", "gluten-free", "low-calorie", "quick"],
    ingredients: [
      { name: "cod fillets", raw: "4 cod fillets (about 600g total)", amount: 600, unit: "g" },
      { name: "lemon", raw: "1 lemon, thinly sliced into rounds", amount: 1, unit: "whole" },
      { name: "lemon juice", raw: "2 tbsp fresh lemon juice", amount: 2, unit: "tbsp" },
      { name: "capers", raw: "2 tbsp capers, drained", amount: 2, unit: "tbsp" },
      { name: "garlic", raw: "3 cloves garlic, minced", amount: 3, unit: "cloves" },
      { name: "butter", raw: "2 tbsp unsalted butter, cut into small pieces", amount: 2, unit: "tbsp" },
      { name: "olive oil", raw: "2 tbsp olive oil", amount: 2, unit: "tbsp" },
      { name: "fresh parsley", raw: "3 tbsp fresh flat-leaf parsley, chopped", amount: 3, unit: "tbsp" },
      { name: "dried thyme", raw: "½ tsp dried thyme", amount: 0.5, unit: "tsp" },
      { name: "salt", raw: "1 tsp salt", amount: 1, unit: "tsp" },
      { name: "black pepper", raw: "½ tsp black pepper", amount: 0.5, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 200°C. Pat cod fillets dry and place in a lightly oiled baking dish." },
      { number: 2, step: "Whisk together olive oil, lemon juice, garlic, thyme, salt, and pepper. Pour over the cod." },
      { number: 3, step: "Scatter capers over and around the fish. Top each fillet with lemon rounds and dot with small pieces of butter." },
      { number: 4, step: "Bake for 12–15 minutes, depending on thickness, until the fish is opaque and flakes easily with a fork." },
      { number: 5, step: "Spoon the pan juices over the fish and scatter fresh parsley on top. Serve with roasted vegetables, rice, or a simple green salad." },
    ],
  },
  {
    id: 9000079,
    title: "Tuna & White Bean Salad",
    minutes: 10,
    servings: 4,
    calories: 310,
    tags: ["mediterranean", "seafood", "salad", "gluten-free", "low-calorie", "meal-prep", "quick"],
    ingredients: [
      { name: "canned tuna in olive oil", raw: "2 cans (280g) tuna in olive oil, drained", amount: 280, unit: "g" },
      { name: "canned cannellini beans", raw: "2 cans (800g) cannellini beans, drained and rinsed", amount: 800, unit: "g" },
      { name: "red onion", raw: "½ red onion, very thinly sliced", amount: 0.5, unit: "whole" },
      { name: "celery", raw: "2 stalks celery, thinly sliced", amount: 2, unit: "stalks" },
      { name: "cherry tomatoes", raw: "200g cherry tomatoes, halved", amount: 200, unit: "g" },
      { name: "fresh parsley", raw: "½ cup fresh flat-leaf parsley, roughly chopped", amount: 0.5, unit: "cup" },
      { name: "capers", raw: "2 tbsp capers, drained", amount: 2, unit: "tbsp" },
      { name: "lemon juice", raw: "3 tbsp fresh lemon juice", amount: 3, unit: "tbsp" },
      { name: "olive oil", raw: "3 tbsp extra-virgin olive oil", amount: 3, unit: "tbsp" },
      { name: "Dijon mustard", raw: "1 tsp Dijon mustard", amount: 1, unit: "tsp" },
      { name: "salt", raw: "½ tsp salt", amount: 0.5, unit: "tsp" },
      { name: "black pepper", raw: "¼ tsp black pepper", amount: 0.25, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Soak sliced red onion in cold water for 5 minutes to mellow its sharpness. Drain and pat dry." },
      { number: 2, step: "Whisk together lemon juice, olive oil, Dijon mustard, salt, and pepper to make the dressing." },
      { number: 3, step: "In a large bowl, combine cannellini beans, cherry tomatoes, celery, red onion, capers, and parsley." },
      { number: 4, step: "Flake the tuna into large chunks over the salad." },
      { number: 5, step: "Drizzle the dressing over the salad and gently toss, being careful not to break up the tuna too much. Taste and adjust seasoning. Serve immediately or refrigerate for up to 3 days." },
    ],
  },
  {
    id: 9000080,
    title: "Honey Garlic Glazed Salmon",
    minutes: 20,
    servings: 4,
    calories: 430,
    tags: ["seafood", "asian-inspired", "main-course", "meal-prep", "gluten-free", "quick"],
    ingredients: [
      { name: "salmon fillets", raw: "4 salmon fillets (about 150g each), skin-on", amount: 600, unit: "g" },
      { name: "honey", raw: "3 tbsp honey", amount: 3, unit: "tbsp" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "soy sauce", raw: "2 tbsp soy sauce", amount: 2, unit: "tbsp" },
      { name: "lemon juice", raw: "1 tbsp fresh lemon juice", amount: 1, unit: "tbsp" },
      { name: "Dijon mustard", raw: "1 tsp Dijon mustard", amount: 1, unit: "tsp" },
      { name: "butter", raw: "1 tbsp butter", amount: 1, unit: "tbsp" },
      { name: "olive oil", raw: "1 tbsp olive oil", amount: 1, unit: "tbsp" },
      { name: "fresh thyme", raw: "3 sprigs fresh thyme", amount: 3, unit: "sprigs" },
      { name: "salt", raw: "½ tsp salt", amount: 0.5, unit: "tsp" },
      { name: "black pepper", raw: "¼ tsp black pepper", amount: 0.25, unit: "tsp" },
      { name: "fresh parsley", raw: "2 tbsp fresh parsley, chopped, to garnish", amount: 2, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Pat salmon fillets dry and season with salt and pepper. Whisk honey, garlic, soy sauce, lemon juice, and Dijon mustard together in a small bowl." },
      { number: 2, step: "Heat olive oil and butter in an oven-safe skillet over medium-high heat until foaming. Place salmon skin-side up and sear for 3–4 minutes until golden crust forms. Flip." },
      { number: 3, step: "Pour the honey garlic glaze over the salmon and add thyme sprigs. Cook for 1 minute, basting constantly as the glaze bubbles and thickens." },
      { number: 4, step: "Transfer the skillet to the oven at 200°C and bake for 5–6 minutes, basting once, until salmon is cooked through and beautifully glazed." },
      { number: 5, step: "Spoon any remaining glaze from the pan over the fillets. Garnish with fresh parsley. Serve over steamed rice or with roasted broccoli." },
    ],
  },
];

async function generateImage(
  title: string,
  ingredients: { name: string; raw: string }[],
  steps: { number: number; step: string }[]
): Promise<string | null> {
  try {
    fal.config({ credentials: process.env.FAL_KEY });
    const result = await fal.subscribe("fal-ai/recraft-v3", {
      input: {
        prompt: buildImagePrompt(title, ingredients, steps),
        image_size: "landscape_4_3",
        style: "realistic_image",
        num_images: 1,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (result.data as any)?.images?.[0]?.url ?? null;
  } catch (e) {
    console.error("fal.ai error for", title, e);
    return null;
  }
}

async function processInBatches<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "No Supabase or missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 });
  if (!process.env.FAL_KEY) return NextResponse.json({ error: "No FAL_KEY" }, { status: 503 });

  const reqKey = req.headers.get("x-admin-key");
  if (ADMIN_KEY && reqKey !== ADMIN_KEY) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const updateImagesOnly = new URL(req.url).searchParams.get("update_images") === "1";

  const results: { title: string; status: string; imageUrl?: string; error?: string }[] = [];

  await processInBatches(BATCH3_RECIPES, 3, async (recipe) => {
    try {
      const { data: existing } = await supabase!
        .from("recipes")
        .select("id, image_url")
        .eq("id", recipe.id)
        .maybeSingle();

      if (existing) {
        if (!updateImagesOnly || existing.image_url) {
          results.push({ title: recipe.title, status: "skipped (already exists)" });
          return;
        }
        const imageUrl = await generateImage(recipe.title, recipe.ingredients, recipe.steps);
        await supabase!.from("recipes").update({ image_url: imageUrl }).eq("id", existing.id);
        results.push({ title: recipe.title, status: "image updated", imageUrl: imageUrl ?? undefined });
        return;
      }

      const imageUrl = await generateImage(recipe.title, recipe.ingredients, recipe.steps);

      const { error: insertError } = await supabase!.from("recipes").insert({
        id: recipe.id,
        title: recipe.title,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        image_url: imageUrl,
        minutes: recipe.minutes,
        servings: recipe.servings,
        calories: recipe.calories,
        tags: recipe.tags,
        fridge_life: computeFridgeLife({ title: recipe.title, dishTypes: recipe.tags, diets: recipe.tags }),
        microwave_score: computeMicrowaveScore({ title: recipe.title, dishTypes: recipe.tags }),
        enabled: true,
        translations: null,
      });

      if (insertError) throw insertError;
      results.push({ title: recipe.title, status: "created", imageUrl: imageUrl ?? undefined });
    } catch (e) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e);
      results.push({ title: recipe.title, status: "error", error: msg });
    }
  });

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status.startsWith("skipped")).length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({ total: BATCH3_RECIPES.length, created, skipped, errors, results });
}
