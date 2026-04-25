// POST /api/admin/seed-batch2
//
// Seeds 8 soup/curry/noodle recipes.
//
// Usage:
//   curl -X POST "http://localhost:3000/api/admin/seed-batch2" \
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

const BATCH2_RECIPES: RecipeSeed[] = [
  {
    id: 9000067,
    title: "Tuscan White Bean & Sausage Soup",
    minutes: 40,
    servings: 6,
    calories: 430,
    tags: ["italian", "soup", "main-course", "meal-prep", "gluten-free"],
    ingredients: [
      { name: "Italian sausage", raw: "400g Italian sausage, casings removed", amount: 400, unit: "g" },
      { name: "canned white cannellini beans", raw: "2 cans (800g) white cannellini beans, drained", amount: 800, unit: "g" },
      { name: "canned diced tomatoes", raw: "400g canned diced tomatoes", amount: 400, unit: "g" },
      { name: "chicken broth", raw: "1.2L chicken broth", amount: 1200, unit: "ml" },
      { name: "kale or cavolo nero", raw: "3 cups kale or cavolo nero, stems removed and chopped", amount: 3, unit: "cups" },
      { name: "onion", raw: "1 large onion, diced", amount: 1, unit: "whole" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "celery", raw: "2 stalks celery, sliced", amount: 2, unit: "stalks" },
      { name: "carrot", raw: "1 carrot, diced", amount: 1, unit: "whole" },
      { name: "fresh rosemary", raw: "2 sprigs fresh rosemary", amount: 2, unit: "sprigs" },
      { name: "parmesan rind", raw: "1 parmesan rind (optional, for depth)", amount: 1, unit: "piece" },
      { name: "olive oil", raw: "2 tbsp olive oil", amount: 2, unit: "tbsp" },
      { name: "red pepper flakes", raw: "½ tsp red pepper flakes", amount: 0.5, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Heat olive oil in a large pot over medium-high heat. Cook sausage, breaking it up, until browned, about 5 minutes. Remove and set aside, leaving the fat in the pot." },
      { number: 2, step: "Add onion, carrot, and celery to the pot. Cook for 6 minutes until softened. Add garlic and red pepper flakes and cook 1 more minute." },
      { number: 3, step: "Add diced tomatoes, white beans, chicken broth, rosemary sprigs, and parmesan rind if using. Return sausage to the pot." },
      { number: 4, step: "Bring to a boil, then reduce heat and simmer for 20 minutes. Remove rosemary sprigs and parmesan rind." },
      { number: 5, step: "Stir in chopped kale and simmer 5 more minutes until wilted. Season generously with salt and pepper. Serve with crusty bread and a drizzle of good olive oil." },
    ],
  },
  {
    id: 9000068,
    title: "Chicken Tortilla Soup",
    minutes: 35,
    servings: 6,
    calories: 390,
    tags: ["mexican", "chicken", "soup", "main-course", "meal-prep", "gluten-free"],
    ingredients: [
      { name: "boneless chicken thighs", raw: "600g boneless chicken thighs", amount: 600, unit: "g" },
      { name: "canned black beans", raw: "1 can (400g) black beans, drained", amount: 400, unit: "g" },
      { name: "canned corn", raw: "1 can (340g) corn, drained", amount: 340, unit: "g" },
      { name: "canned crushed tomatoes", raw: "400g canned crushed tomatoes", amount: 400, unit: "g" },
      { name: "chicken broth", raw: "1L chicken broth", amount: 1000, unit: "ml" },
      { name: "onion", raw: "1 onion, diced", amount: 1, unit: "whole" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "green chiles", raw: "1 can (120g) diced green chiles", amount: 120, unit: "g" },
      { name: "cumin", raw: "2 tsp cumin", amount: 2, unit: "tsp" },
      { name: "chili powder", raw: "1 tsp chili powder", amount: 1, unit: "tsp" },
      { name: "smoked paprika", raw: "1 tsp smoked paprika", amount: 1, unit: "tsp" },
      { name: "olive oil", raw: "1 tbsp olive oil", amount: 1, unit: "tbsp" },
      { name: "corn tortilla strips", raw: "corn tortilla strips, to serve", amount: 1, unit: "handful" },
      { name: "avocado", raw: "1 avocado, diced, to serve", amount: 1, unit: "whole" },
      { name: "fresh cilantro", raw: "fresh cilantro to serve", amount: 0.25, unit: "cup" },
      { name: "sour cream", raw: "sour cream to serve", amount: 0.25, unit: "cup" },
    ],
    steps: [
      { number: 1, step: "Sauté onion in olive oil in a large pot for 5 minutes. Add garlic, cumin, chili powder, and paprika. Cook 1 minute." },
      { number: 2, step: "Add chicken thighs, crushed tomatoes, green chiles, and chicken broth. Bring to a boil." },
      { number: 3, step: "Reduce heat and simmer for 20 minutes until chicken is cooked through and tender." },
      { number: 4, step: "Remove chicken and shred with two forks. Return to the pot along with black beans and corn." },
      { number: 5, step: "Simmer 5 more minutes. Ladle into bowls and top with tortilla strips, avocado, sour cream, and cilantro." },
    ],
  },
  {
    id: 9000069,
    title: "Minestrone",
    minutes: 45,
    servings: 8,
    calories: 310,
    tags: ["italian", "vegetarian", "vegan", "soup", "main-course", "meal-prep"],
    ingredients: [
      { name: "canned diced tomatoes", raw: "800g canned diced tomatoes", amount: 800, unit: "g" },
      { name: "canned kidney beans", raw: "1 can (400g) kidney beans, drained", amount: 400, unit: "g" },
      { name: "canned cannellini beans", raw: "1 can (400g) cannellini beans, drained", amount: 400, unit: "g" },
      { name: "vegetable broth", raw: "1.5L vegetable broth", amount: 1500, unit: "ml" },
      { name: "small pasta", raw: "150g small pasta (ditalini or elbow)", amount: 150, unit: "g" },
      { name: "zucchini", raw: "1 zucchini, diced", amount: 1, unit: "whole" },
      { name: "carrot", raw: "2 carrots, diced", amount: 2, unit: "whole" },
      { name: "celery", raw: "2 stalks celery, sliced", amount: 2, unit: "stalks" },
      { name: "onion", raw: "1 large onion, diced", amount: 1, unit: "whole" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "green beans", raw: "1 cup green beans, trimmed and cut", amount: 1, unit: "cup" },
      { name: "spinach", raw: "2 cups baby spinach", amount: 2, unit: "cups" },
      { name: "tomato paste", raw: "2 tbsp tomato paste", amount: 2, unit: "tbsp" },
      { name: "dried oregano", raw: "1 tsp dried oregano", amount: 1, unit: "tsp" },
      { name: "dried thyme", raw: "½ tsp dried thyme", amount: 0.5, unit: "tsp" },
      { name: "olive oil", raw: "3 tbsp olive oil", amount: 3, unit: "tbsp" },
      { name: "parmesan", raw: "parmesan to serve", amount: 0, unit: "" },
    ],
    steps: [
      { number: 1, step: "Heat olive oil in a large pot. Sauté onion, carrot, and celery for 8 minutes until softened. Add garlic and cook 1 minute." },
      { number: 2, step: "Add tomato paste and cook 2 minutes. Add diced tomatoes, broth, oregano, and thyme. Bring to a boil." },
      { number: 3, step: "Add zucchini and green beans. Reduce heat and simmer 10 minutes." },
      { number: 4, step: "Add both cans of beans and the pasta. Cook for 10 more minutes until pasta is al dente." },
      { number: 5, step: "Stir in spinach until wilted. Season well. Serve with grated parmesan and crusty bread. The soup thickens overnight — add broth when reheating." },
    ],
  },
  {
    id: 9000070,
    title: "Slow-cooker Beef & Barley Stew",
    minutes: 480,
    servings: 6,
    calories: 470,
    tags: ["american", "beef", "soup", "main-course", "meal-prep"],
    ingredients: [
      { name: "beef chuck", raw: "700g beef chuck, cut into 3cm cubes", amount: 700, unit: "g" },
      { name: "pearl barley", raw: "¾ cup pearl barley, rinsed", amount: 0.75, unit: "cups" },
      { name: "beef broth", raw: "900ml beef broth", amount: 900, unit: "ml" },
      { name: "canned diced tomatoes", raw: "400g canned diced tomatoes", amount: 400, unit: "g" },
      { name: "carrots", raw: "3 carrots, sliced", amount: 3, unit: "whole" },
      { name: "potatoes", raw: "2 medium potatoes, cubed", amount: 2, unit: "whole" },
      { name: "celery", raw: "2 stalks celery, sliced", amount: 2, unit: "stalks" },
      { name: "onion", raw: "1 large onion, diced", amount: 1, unit: "whole" },
      { name: "garlic", raw: "3 cloves garlic, minced", amount: 3, unit: "cloves" },
      { name: "tomato paste", raw: "2 tbsp tomato paste", amount: 2, unit: "tbsp" },
      { name: "Worcestershire sauce", raw: "1 tbsp Worcestershire sauce", amount: 1, unit: "tbsp" },
      { name: "dried thyme", raw: "1 tsp dried thyme", amount: 1, unit: "tsp" },
      { name: "bay leaves", raw: "2 bay leaves", amount: 2, unit: "whole" },
      { name: "olive oil", raw: "2 tbsp olive oil", amount: 2, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Season beef cubes with salt and pepper. Sear in olive oil over high heat in batches until deeply browned. Transfer to slow cooker." },
      { number: 2, step: "In the same pan, sauté onion and garlic for 3 minutes. Add tomato paste and cook 1 minute. Deglaze with a splash of broth. Transfer to slow cooker." },
      { number: 3, step: "Add all remaining ingredients to the slow cooker: broth, diced tomatoes, barley, carrots, potatoes, celery, Worcestershire sauce, thyme, and bay leaves." },
      { number: 4, step: "Cook on LOW for 7–8 hours or HIGH for 4–5 hours, until beef is tender and barley is fully cooked." },
      { number: 5, step: "Remove bay leaves. Adjust seasoning. The stew will thicken as it sits. Serve with crusty sourdough." },
    ],
  },
  {
    id: 9000071,
    title: "Thai Green Curry with Chicken",
    minutes: 30,
    servings: 4,
    calories: 490,
    tags: ["thai", "chicken", "curry", "main-course", "meal-prep", "gluten-free"],
    ingredients: [
      { name: "boneless chicken thighs", raw: "600g boneless chicken thighs, cut into chunks", amount: 600, unit: "g" },
      { name: "coconut milk", raw: "2 cans (800ml) full-fat coconut milk", amount: 800, unit: "ml" },
      { name: "green curry paste", raw: "3 tbsp Thai green curry paste", amount: 3, unit: "tbsp" },
      { name: "fish sauce", raw: "2 tbsp fish sauce", amount: 2, unit: "tbsp" },
      { name: "palm sugar or brown sugar", raw: "1 tbsp palm sugar or brown sugar", amount: 1, unit: "tbsp" },
      { name: "Thai eggplant", raw: "200g Thai eggplant or regular eggplant, quartered", amount: 200, unit: "g" },
      { name: "zucchini", raw: "1 zucchini, sliced", amount: 1, unit: "whole" },
      { name: "red bell pepper", raw: "1 red bell pepper, sliced", amount: 1, unit: "whole" },
      { name: "kaffir lime leaves", raw: "4 kaffir lime leaves, torn", amount: 4, unit: "whole" },
      { name: "lemongrass", raw: "1 stalk lemongrass, bruised", amount: 1, unit: "stalk" },
      { name: "Thai basil", raw: "1 cup Thai basil leaves", amount: 1, unit: "cup" },
      { name: "vegetable oil", raw: "1 tbsp vegetable oil", amount: 1, unit: "tbsp" },
      { name: "jasmine rice", raw: "2 cups jasmine rice, to serve", amount: 2, unit: "cups" },
    ],
    steps: [
      { number: 1, step: "Cook jasmine rice according to package instructions. Heat oil in a wok over medium heat." },
      { number: 2, step: "Fry the green curry paste in the oil for 1 minute until fragrant. Add ½ cup of the thick coconut cream from the top of the cans and cook, stirring, for 2 minutes until the oil separates." },
      { number: 3, step: "Add chicken pieces and stir-fry for 3 minutes until sealed. Add remaining coconut milk, lemongrass, and lime leaves. Bring to a gentle simmer." },
      { number: 4, step: "Add eggplant, zucchini, and red pepper. Simmer for 12–15 minutes until chicken is cooked through and vegetables are tender." },
      { number: 5, step: "Season with fish sauce and palm sugar. Remove lemongrass. Stir in Thai basil and serve immediately over jasmine rice." },
    ],
  },
  {
    id: 9000072,
    title: "Massaman Beef Curry",
    minutes: 120,
    servings: 4,
    calories: 560,
    tags: ["thai", "beef", "curry", "main-course", "meal-prep", "gluten-free"],
    ingredients: [
      { name: "beef chuck", raw: "700g beef chuck, cut into 4cm cubes", amount: 700, unit: "g" },
      { name: "coconut milk", raw: "2 cans (800ml) full-fat coconut milk", amount: 800, unit: "ml" },
      { name: "Massaman curry paste", raw: "3 tbsp Massaman curry paste", amount: 3, unit: "tbsp" },
      { name: "potatoes", raw: "400g waxy potatoes, peeled and cubed", amount: 400, unit: "g" },
      { name: "onion", raw: "1 large onion, cut into wedges", amount: 1, unit: "whole" },
      { name: "roasted peanuts", raw: "80g roasted unsalted peanuts", amount: 80, unit: "g" },
      { name: "fish sauce", raw: "2 tbsp fish sauce", amount: 2, unit: "tbsp" },
      { name: "tamarind paste", raw: "1 tbsp tamarind paste", amount: 1, unit: "tbsp" },
      { name: "palm sugar or brown sugar", raw: "1 tbsp palm sugar", amount: 1, unit: "tbsp" },
      { name: "cardamom pods", raw: "3 cardamom pods, lightly crushed", amount: 3, unit: "whole" },
      { name: "cinnamon stick", raw: "1 cinnamon stick", amount: 1, unit: "whole" },
      { name: "bay leaves", raw: "2 bay leaves", amount: 2, unit: "whole" },
    ],
    steps: [
      { number: 1, step: "Heat a large heavy pot over medium heat. Add the thick cream from the top of one can of coconut milk. Fry the Massaman paste in the cream for 2 minutes until very fragrant." },
      { number: 2, step: "Add beef and coat well in the paste. Cook for 3–4 minutes until sealed on all sides." },
      { number: 3, step: "Pour in the remaining coconut milk. Add cardamom, cinnamon, and bay leaves. Bring to a boil, then reduce to a low simmer." },
      { number: 4, step: "Simmer covered for 45 minutes. Add potatoes, onion, and peanuts. Continue to simmer uncovered for another 30–40 minutes until beef is very tender and sauce has thickened." },
      { number: 5, step: "Season with fish sauce, tamarind, and palm sugar to balance sweet, sour, and salty. Remove whole spices. Serve over jasmine rice with extra peanuts on top." },
    ],
  },
  {
    id: 9000073,
    title: "Pad See Ew",
    minutes: 20,
    servings: 3,
    calories: 510,
    tags: ["thai", "noodles", "main-course", "meal-prep", "quick"],
    ingredients: [
      { name: "wide rice noodles", raw: "300g wide flat rice noodles (fresh or soaked dried)", amount: 300, unit: "g" },
      { name: "boneless chicken thigh", raw: "300g boneless chicken thigh, sliced thin", amount: 300, unit: "g" },
      { name: "Chinese broccoli (gai lan)", raw: "200g Chinese broccoli (gai lan), stems and leaves separated", amount: 200, unit: "g" },
      { name: "eggs", raw: "2 eggs", amount: 2, unit: "whole" },
      { name: "dark soy sauce", raw: "2 tbsp dark soy sauce", amount: 2, unit: "tbsp" },
      { name: "oyster sauce", raw: "2 tbsp oyster sauce", amount: 2, unit: "tbsp" },
      { name: "light soy sauce", raw: "1 tbsp light soy sauce", amount: 1, unit: "tbsp" },
      { name: "fish sauce", raw: "1 tsp fish sauce", amount: 1, unit: "tsp" },
      { name: "sugar", raw: "1 tsp sugar", amount: 1, unit: "tsp" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "vegetable oil", raw: "3 tbsp vegetable oil", amount: 3, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "If using dried noodles, soak in warm water for 30 minutes until pliable. Drain. Mix dark soy sauce, oyster sauce, light soy sauce, fish sauce, and sugar in a small bowl." },
      { number: 2, step: "Heat oil in a wok over the highest possible heat until smoking. Add chicken and cook undisturbed for 1–2 minutes to get some char, then stir-fry until cooked through. Push to the side." },
      { number: 3, step: "Add garlic and gai lan stems to the wok; stir-fry 1 minute. Crack in eggs and scramble until just set." },
      { number: 4, step: "Add noodles and pour the sauce over. Let noodles sit undisturbed on the hot wok for 30–45 seconds to develop charred wok-hei flavour, then toss everything together." },
      { number: 5, step: "Add gai lan leaves, toss for 30 more seconds until wilted. Serve immediately with white pepper and chili flakes on the side." },
    ],
  },
  {
    id: 9000074,
    title: "Thai Peanut Chicken Bowls",
    minutes: 30,
    servings: 4,
    calories: 530,
    tags: ["thai", "chicken", "rice", "main-course", "meal-prep", "gluten-free"],
    ingredients: [
      { name: "boneless chicken breast", raw: "600g boneless chicken breast, sliced thin", amount: 600, unit: "g" },
      { name: "jasmine rice", raw: "2 cups jasmine rice", amount: 2, unit: "cups" },
      { name: "peanut butter", raw: "4 tbsp smooth peanut butter", amount: 4, unit: "tbsp" },
      { name: "coconut milk", raw: "80ml coconut milk", amount: 80, unit: "ml" },
      { name: "soy sauce", raw: "3 tbsp soy sauce", amount: 3, unit: "tbsp" },
      { name: "lime juice", raw: "2 tbsp lime juice", amount: 2, unit: "tbsp" },
      { name: "honey", raw: "1 tbsp honey", amount: 1, unit: "tbsp" },
      { name: "sesame oil", raw: "1 tsp sesame oil", amount: 1, unit: "tsp" },
      { name: "garlic", raw: "3 cloves garlic, minced", amount: 3, unit: "cloves" },
      { name: "ginger", raw: "1 tsp fresh ginger, grated", amount: 1, unit: "tsp" },
      { name: "Thai red chili", raw: "1 Thai red chili, sliced", amount: 1, unit: "whole" },
      { name: "cucumber", raw: "1 cucumber, thinly sliced", amount: 1, unit: "whole" },
      { name: "shredded purple cabbage", raw: "1 cup shredded purple cabbage", amount: 1, unit: "cup" },
      { name: "shredded carrots", raw: "1 cup shredded carrots", amount: 1, unit: "cup" },
      { name: "roasted peanuts", raw: "3 tbsp roasted peanuts, roughly chopped", amount: 3, unit: "tbsp" },
      { name: "fresh cilantro", raw: "¼ cup fresh cilantro", amount: 0.25, unit: "cup" },
    ],
    steps: [
      { number: 1, step: "Cook jasmine rice according to package instructions." },
      { number: 2, step: "Whisk together peanut butter, coconut milk, soy sauce, lime juice, honey, sesame oil, garlic, and ginger until smooth. Thin with a tablespoon of warm water if needed." },
      { number: 3, step: "Marinate chicken in half the peanut sauce for 10 minutes. Cook in a hot skillet or grill pan over medium-high heat, 3–4 minutes per side, until cooked through and slightly caramelized." },
      { number: 4, step: "Slice chicken." },
      { number: 5, step: "Assemble bowls: rice base topped with sliced chicken, cucumber, purple cabbage, and carrots. Drizzle remaining peanut sauce over the top. Garnish with chopped peanuts, cilantro, and sliced red chili." },
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

  await processInBatches(BATCH2_RECIPES, 3, async (recipe) => {
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

  return NextResponse.json({ total: BATCH2_RECIPES.length, created, skipped, errors, results });
}
