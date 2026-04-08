// POST /api/admin/seed-vegan
//
// Seeds 10 curated vegan recipes into the `recipes` table.
// Generates a fal.ai image for each recipe before inserting.
//
// Usage:
//   curl -X POST "http://localhost:3001/api/admin/seed-vegan" \
//        -H "x-admin-key: zest-admin-2026"

import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { createPublicClient } from "@/lib/supabase/server";
import { computeFridgeLife, computeMicrowaveScore } from "@/lib/mealPrepUtils";

const ADMIN_KEY = process.env.ADMIN_KEY;

function buildImagePrompt(title: string, ingredients: string): string {
  return (
    `${title} featuring ${ingredients}. ` +
    `Style: Cinematic food photography, Gourmet, Professional, Realistic, High-definition, True colors. ` +
    `Angle: Top-down flat lay or 45-degree close-up angle. ` +
    `Lighting: Soft side natural light from a window, natural and soft, subtle shadows, creating natural glisten on food surface. ` +
    `Props: Clean minimalist ceramic container or black stone pot, rustic wood table or tray. Limit props in background, keep it minimal. ` +
    `Texture: Vibrant and saturated natural colors, food texture. ` +
    `Background: Neutral gray or dark textured concrete background, clean and empty. ` +
    `Camera: Sony A7R IV, 50mm macro lens, shallow depth of field, sharp focus, true to life depth.`
  );
}

interface RecipeSeed {
  title: string;
  minutes: number;
  servings: number;
  calories: number | null;
  tags: string[];
  ingredients: { name: string; raw: string; amount: number; unit: string }[];
  steps: { number: number; step: string }[];
}

const VEGAN_RECIPES: RecipeSeed[] = [
  {
    title: "Gochujang Shiitake & Tofu Wok Toss",
    minutes: 25,
    servings: 4,
    calories: 340,
    tags: ["main course", "vegan", "korean"],
    ingredients: [
      { name: "firm tofu", raw: "400g firm tofu, pressed and cubed", amount: 400, unit: "g" },
      { name: "shiitake mushrooms", raw: "200g shiitake mushrooms, sliced", amount: 200, unit: "g" },
      { name: "gochujang", raw: "3 tbsp gochujang", amount: 3, unit: "tbsp" },
      { name: "soy sauce", raw: "2 tbsp soy sauce", amount: 2, unit: "tbsp" },
      { name: "sesame oil", raw: "2 tbsp sesame oil", amount: 2, unit: "tbsp" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "ginger", raw: "1 tbsp fresh ginger, grated", amount: 1, unit: "tbsp" },
      { name: "rice vinegar", raw: "1 tbsp rice vinegar", amount: 1, unit: "tbsp" },
      { name: "maple syrup", raw: "1 tbsp maple syrup", amount: 1, unit: "tbsp" },
      { name: "scallions", raw: "3 scallions, sliced", amount: 3, unit: "stalks" },
      { name: "sesame seeds", raw: "1 tbsp sesame seeds", amount: 1, unit: "tbsp" },
      { name: "vegetable oil", raw: "2 tbsp vegetable oil", amount: 2, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Press tofu for 15 minutes to remove excess moisture, then cut into 2cm cubes." },
      { number: 2, step: "Whisk together gochujang, soy sauce, rice vinegar, maple syrup, and half the sesame oil in a small bowl." },
      { number: 3, step: "Heat vegetable oil in a wok over high heat. Fry tofu cubes for 4–5 minutes, turning until golden and crispy on all sides. Remove and set aside." },
      { number: 4, step: "In the same wok, add remaining sesame oil and stir-fry garlic and ginger for 30 seconds. Add shiitake mushrooms and cook for 3–4 minutes until tender." },
      { number: 5, step: "Return tofu to the wok, pour over the sauce, and toss everything together over high heat for 2 minutes until well coated and caramelized." },
      { number: 6, step: "Serve garnished with sliced scallions and sesame seeds. Pairs well with steamed jasmine rice." },
    ],
  },
  {
    title: "Garlic Chili Oil Udon Noodle",
    minutes: 20,
    servings: 2,
    calories: 480,
    tags: ["main course", "vegan", "japanese"],
    ingredients: [
      { name: "fresh udon noodles", raw: "400g fresh udon noodles", amount: 400, unit: "g" },
      { name: "garlic", raw: "6 cloves garlic, thinly sliced", amount: 6, unit: "cloves" },
      { name: "dried chili flakes", raw: "1.5 tsp dried chili flakes", amount: 1.5, unit: "tsp" },
      { name: "neutral oil", raw: "4 tbsp neutral oil (e.g., sunflower)", amount: 4, unit: "tbsp" },
      { name: "soy sauce", raw: "3 tbsp soy sauce", amount: 3, unit: "tbsp" },
      { name: "dark soy sauce", raw: "1 tbsp dark soy sauce", amount: 1, unit: "tbsp" },
      { name: "rice vinegar", raw: "1 tbsp rice vinegar", amount: 1, unit: "tbsp" },
      { name: "scallions", raw: "4 scallions, thinly sliced", amount: 4, unit: "stalks" },
      { name: "sesame seeds", raw: "2 tsp sesame seeds, toasted", amount: 2, unit: "tsp" },
      { name: "nori sheets", raw: "2 nori sheets, cut into thin strips", amount: 2, unit: "sheets" },
    ],
    steps: [
      { number: 1, step: "Cook udon noodles according to package instructions. Drain and rinse with cold water to stop cooking. Set aside." },
      { number: 2, step: "Heat neutral oil in a small saucepan over medium-low heat. Add sliced garlic and cook slowly for 6–8 minutes until golden and fragrant. Add chili flakes in the last minute. Remove from heat." },
      { number: 3, step: "Mix soy sauce, dark soy sauce, and rice vinegar in a bowl." },
      { number: 4, step: "Toss noodles with the soy mixture and pour the hot garlic chili oil over them. Mix well to coat." },
      { number: 5, step: "Divide into bowls and top with scallions, toasted sesame seeds, and nori strips. Serve immediately." },
    ],
  },
  {
    title: "Kimchi and Edamame Fried Rice",
    minutes: 20,
    servings: 4,
    calories: 410,
    tags: ["main course", "vegan", "korean"],
    ingredients: [
      { name: "cooked day-old jasmine rice", raw: "3 cups cooked day-old jasmine rice", amount: 3, unit: "cups" },
      { name: "vegan kimchi", raw: "1 cup vegan kimchi, roughly chopped", amount: 1, unit: "cup" },
      { name: "shelled edamame", raw: "1 cup shelled edamame, cooked", amount: 1, unit: "cup" },
      { name: "scallions", raw: "4 scallions, sliced", amount: 4, unit: "stalks" },
      { name: "garlic", raw: "3 cloves garlic, minced", amount: 3, unit: "cloves" },
      { name: "gochugaru", raw: "1 tbsp gochugaru (Korean chili flakes)", amount: 1, unit: "tbsp" },
      { name: "soy sauce", raw: "2 tbsp soy sauce", amount: 2, unit: "tbsp" },
      { name: "sesame oil", raw: "1 tbsp sesame oil", amount: 1, unit: "tbsp" },
      { name: "vegetable oil", raw: "2 tbsp vegetable oil", amount: 2, unit: "tbsp" },
      { name: "sesame seeds", raw: "1 tbsp sesame seeds", amount: 1, unit: "tbsp" },
      { name: "nori", raw: "1 sheet nori, crumbled", amount: 1, unit: "sheet" },
    ],
    steps: [
      { number: 1, step: "Heat vegetable oil in a large wok or skillet over high heat until smoking." },
      { number: 2, step: "Add garlic and gochugaru, stir-fry for 30 seconds. Add kimchi and cook for 2 minutes until slightly caramelized." },
      { number: 3, step: "Add cold rice to the wok and press it down. Let it cook undisturbed for 1–2 minutes to get a slight crisp, then stir-fry to break up any clumps." },
      { number: 4, step: "Add edamame and soy sauce. Toss everything together over high heat for 2 more minutes." },
      { number: 5, step: "Remove from heat, drizzle with sesame oil, and top with scallions, sesame seeds, and crumbled nori." },
    ],
  },
  {
    title: "Mediterranean Harissa Chickpea Bowl",
    minutes: 30,
    servings: 4,
    calories: 380,
    tags: ["main course", "vegan", "mediterranean"],
    ingredients: [
      { name: "canned chickpeas", raw: "2 cans (800g) chickpeas, drained and rinsed", amount: 800, unit: "g" },
      { name: "harissa paste", raw: "3 tbsp harissa paste", amount: 3, unit: "tbsp" },
      { name: "cherry tomatoes", raw: "300g cherry tomatoes, halved", amount: 300, unit: "g" },
      { name: "cucumber", raw: "1 cucumber, diced", amount: 1, unit: "whole" },
      { name: "red onion", raw: "1/2 red onion, thinly sliced", amount: 0.5, unit: "whole" },
      { name: "cooked bulgur or couscous", raw: "2 cups cooked bulgur", amount: 2, unit: "cups" },
      { name: "olive oil", raw: "3 tbsp olive oil", amount: 3, unit: "tbsp" },
      { name: "lemon juice", raw: "2 tbsp lemon juice", amount: 2, unit: "tbsp" },
      { name: "fresh parsley", raw: "1/2 cup fresh parsley, chopped", amount: 0.5, unit: "cup" },
      { name: "fresh mint", raw: "1/4 cup fresh mint, chopped", amount: 0.25, unit: "cup" },
      { name: "cumin", raw: "1 tsp ground cumin", amount: 1, unit: "tsp" },
      { name: "smoked paprika", raw: "1 tsp smoked paprika", amount: 1, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 220°C. Toss chickpeas with harissa, olive oil, cumin, and smoked paprika. Spread on a baking sheet and roast for 20–25 minutes until crispy." },
      { number: 2, step: "Meanwhile, prepare bulgur according to package instructions and let cool slightly." },
      { number: 3, step: "Combine cherry tomatoes, cucumber, and red onion. Dress with lemon juice, olive oil, salt, and pepper." },
      { number: 4, step: "Assemble bowls with bulgur as the base, topped with the tomato salad." },
      { number: 5, step: "Pile the harissa chickpeas on top. Finish with fresh parsley and mint." },
    ],
  },
  {
    title: "Creamy Miso Mushroom Pasta",
    minutes: 30,
    servings: 4,
    calories: 520,
    tags: ["main course", "vegan"],
    ingredients: [
      { name: "spaghetti or linguine", raw: "400g spaghetti or linguine", amount: 400, unit: "g" },
      { name: "mixed mushrooms", raw: "400g mixed mushrooms (cremini, oyster, shiitake), sliced", amount: 400, unit: "g" },
      { name: "white miso paste", raw: "3 tbsp white miso paste", amount: 3, unit: "tbsp" },
      { name: "coconut cream", raw: "200ml coconut cream", amount: 200, unit: "ml" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "shallots", raw: "2 shallots, finely diced", amount: 2, unit: "whole" },
      { name: "soy sauce", raw: "1 tbsp soy sauce", amount: 1, unit: "tbsp" },
      { name: "nutritional yeast", raw: "3 tbsp nutritional yeast", amount: 3, unit: "tbsp" },
      { name: "olive oil", raw: "2 tbsp olive oil", amount: 2, unit: "tbsp" },
      { name: "fresh thyme", raw: "4 sprigs fresh thyme", amount: 4, unit: "sprigs" },
      { name: "black pepper", raw: "1/2 tsp freshly cracked black pepper", amount: 0.5, unit: "tsp" },
      { name: "chives", raw: "2 tbsp chives, finely chopped", amount: 2, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Cook pasta in well-salted boiling water until al dente. Reserve 1 cup pasta water before draining." },
      { number: 2, step: "Heat olive oil in a large skillet over medium-high heat. Add shallots and cook for 3 minutes until softened. Add garlic and thyme, cook for 1 minute." },
      { number: 3, step: "Add mushrooms in a single layer and cook undisturbed for 3–4 minutes until golden. Toss and cook for another 2 minutes." },
      { number: 4, step: "Whisk miso paste into the coconut cream until smooth. Pour into the skillet with soy sauce and nutritional yeast. Simmer for 2 minutes." },
      { number: 5, step: "Add drained pasta and toss with enough pasta water to create a silky, coating sauce. Season with black pepper and serve topped with chives." },
    ],
  },
  {
    title: "Vegan Mapo Tofu",
    minutes: 25,
    servings: 4,
    calories: 290,
    tags: ["main course", "vegan", "chinese"],
    ingredients: [
      { name: "soft or silken tofu", raw: "700g soft tofu, cut into 2cm cubes", amount: 700, unit: "g" },
      { name: "shiitake mushrooms", raw: "150g shiitake mushrooms, finely chopped", amount: 150, unit: "g" },
      { name: "doubanjiang", raw: "2 tbsp doubanjiang (vegan chili bean paste)", amount: 2, unit: "tbsp" },
      { name: "fermented black beans", raw: "1 tbsp fermented black beans, rinsed and chopped", amount: 1, unit: "tbsp" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "ginger", raw: "1 tbsp fresh ginger, minced", amount: 1, unit: "tbsp" },
      { name: "vegetable stock", raw: "200ml vegetable stock", amount: 200, unit: "ml" },
      { name: "soy sauce", raw: "1 tbsp soy sauce", amount: 1, unit: "tbsp" },
      { name: "cornstarch", raw: "1 tbsp cornstarch mixed with 2 tbsp cold water", amount: 1, unit: "tbsp" },
      { name: "Sichuan peppercorns", raw: "1 tsp Sichuan peppercorns, toasted and ground", amount: 1, unit: "tsp" },
      { name: "vegetable oil", raw: "2 tbsp vegetable oil", amount: 2, unit: "tbsp" },
      { name: "scallions", raw: "3 scallions, sliced for garnish", amount: 3, unit: "stalks" },
    ],
    steps: [
      { number: 1, step: "Gently simmer tofu cubes in salted water for 3 minutes to firm them up slightly. Carefully drain and set aside." },
      { number: 2, step: "Heat oil in a wok over medium-high heat. Add doubanjiang and stir-fry for 1 minute until the oil turns red. Add black beans, garlic, and ginger and cook for another minute." },
      { number: 3, step: "Add chopped shiitake mushrooms and stir-fry for 3 minutes until tender." },
      { number: 4, step: "Pour in vegetable stock and soy sauce. Bring to a simmer, then gently slide in the tofu. Cook for 3 minutes, gently swirling the wok (do not stir to avoid breaking tofu)." },
      { number: 5, step: "Stir the cornstarch slurry and pour it around the edges of the wok. Swirl gently until sauce thickens." },
      { number: 6, step: "Finish with Sichuan pepper and top with sliced scallions. Serve with steamed white rice." },
    ],
  },
  {
    title: "Thai Basil Tofu Stir Fry",
    minutes: 20,
    servings: 3,
    calories: 310,
    tags: ["main course", "vegan", "thai"],
    ingredients: [
      { name: "firm tofu", raw: "400g firm tofu, cubed", amount: 400, unit: "g" },
      { name: "Thai basil", raw: "1 large handful Thai basil leaves", amount: 1, unit: "cup" },
      { name: "bell peppers", raw: "2 bell peppers (red and green), sliced", amount: 2, unit: "whole" },
      { name: "Thai red chilies", raw: "3 Thai red chilies, sliced", amount: 3, unit: "whole" },
      { name: "garlic", raw: "5 cloves garlic, minced", amount: 5, unit: "cloves" },
      { name: "soy sauce", raw: "2 tbsp soy sauce", amount: 2, unit: "tbsp" },
      { name: "dark soy sauce", raw: "1 tbsp dark soy sauce", amount: 1, unit: "tbsp" },
      { name: "oyster sauce (vegan)", raw: "2 tbsp vegan oyster sauce (mushroom-based)", amount: 2, unit: "tbsp" },
      { name: "sugar", raw: "1 tsp sugar", amount: 1, unit: "tsp" },
      { name: "vegetable oil", raw: "3 tbsp vegetable oil", amount: 3, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Pat tofu dry and cut into cubes. Fry in 2 tbsp oil over high heat for 5–6 minutes until golden and crispy. Set aside." },
      { number: 2, step: "In the same wok add remaining oil. Fry garlic and chilies for 30 seconds over high heat until fragrant." },
      { number: 3, step: "Add bell peppers and stir-fry for 2 minutes until just tender." },
      { number: 4, step: "Return tofu to the wok. Mix soy sauce, dark soy sauce, vegan oyster sauce, and sugar, then pour over. Toss to coat." },
      { number: 5, step: "Remove from heat and stir in Thai basil leaves — the residual heat will wilt them perfectly. Serve immediately over jasmine rice." },
    ],
  },
  {
    title: "Vegan Creamy Sesame Peanut Dan Dan Noodles",
    minutes: 25,
    servings: 4,
    calories: 560,
    tags: ["main course", "vegan", "chinese"],
    ingredients: [
      { name: "ramen or wheat noodles", raw: "400g ramen or dried wheat noodles", amount: 400, unit: "g" },
      { name: "peanut butter", raw: "4 tbsp peanut butter (smooth)", amount: 4, unit: "tbsp" },
      { name: "tahini", raw: "2 tbsp tahini", amount: 2, unit: "tbsp" },
      { name: "soy sauce", raw: "3 tbsp soy sauce", amount: 3, unit: "tbsp" },
      { name: "rice vinegar", raw: "2 tbsp rice vinegar", amount: 2, unit: "tbsp" },
      { name: "chili oil", raw: "2 tbsp chili oil (adjust to taste)", amount: 2, unit: "tbsp" },
      { name: "sesame oil", raw: "1 tbsp sesame oil", amount: 1, unit: "tbsp" },
      { name: "garlic", raw: "3 cloves garlic, minced", amount: 3, unit: "cloves" },
      { name: "ginger", raw: "1 tsp ginger, grated", amount: 1, unit: "tsp" },
      { name: "warm water", raw: "4–6 tbsp warm water (to thin sauce)", amount: 5, unit: "tbsp" },
      { name: "bok choy", raw: "2 baby bok choy, halved", amount: 2, unit: "whole" },
      { name: "scallions", raw: "3 scallions, sliced", amount: 3, unit: "stalks" },
      { name: "crushed roasted peanuts", raw: "3 tbsp crushed roasted peanuts", amount: 3, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Cook noodles according to package instructions. During the last minute, add bok choy to the boiling water to blanch. Drain both and set aside." },
      { number: 2, step: "Whisk peanut butter, tahini, soy sauce, rice vinegar, chili oil, sesame oil, garlic, and ginger. Add warm water one tablespoon at a time until the sauce is smooth and pourable." },
      { number: 3, step: "Toss hot noodles with the sauce, ensuring everything is well coated. If the sauce is too thick, add another splash of pasta water." },
      { number: 4, step: "Divide into bowls and top with blanched bok choy, sliced scallions, and crushed peanuts. Drizzle extra chili oil to taste." },
    ],
  },
  {
    title: "Black Lentil & Coconut Curry",
    minutes: 40,
    servings: 6,
    calories: 350,
    tags: ["main course", "vegan", "indian"],
    ingredients: [
      { name: "black beluga lentils", raw: "1.5 cups black beluga lentils, rinsed", amount: 1.5, unit: "cups" },
      { name: "coconut milk", raw: "1 can (400ml) full-fat coconut milk", amount: 400, unit: "ml" },
      { name: "canned diced tomatoes", raw: "1 can (400g) diced tomatoes", amount: 400, unit: "g" },
      { name: "onion", raw: "1 large onion, diced", amount: 1, unit: "whole" },
      { name: "garlic", raw: "5 cloves garlic, minced", amount: 5, unit: "cloves" },
      { name: "ginger", raw: "2 tbsp fresh ginger, grated", amount: 2, unit: "tbsp" },
      { name: "garam masala", raw: "2 tsp garam masala", amount: 2, unit: "tsp" },
      { name: "turmeric", raw: "1 tsp turmeric", amount: 1, unit: "tsp" },
      { name: "cumin seeds", raw: "1 tsp cumin seeds", amount: 1, unit: "tsp" },
      { name: "coriander", raw: "1 tsp ground coriander", amount: 1, unit: "tsp" },
      { name: "vegetable oil", raw: "2 tbsp vegetable oil", amount: 2, unit: "tbsp" },
      { name: "fresh cilantro", raw: "1/2 cup fresh cilantro, chopped", amount: 0.5, unit: "cup" },
      { name: "lemon juice", raw: "1 tbsp lemon juice", amount: 1, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Toast cumin seeds in oil in a large pot over medium heat for 30 seconds. Add onion and cook for 8–10 minutes until deeply golden." },
      { number: 2, step: "Add garlic and ginger and cook for 2 minutes. Stir in turmeric, garam masala, and ground coriander. Cook for 1 minute until fragrant." },
      { number: 3, step: "Add rinsed lentils, diced tomatoes, coconut milk, and 400ml water. Stir well and bring to a boil." },
      { number: 4, step: "Reduce heat, cover partially, and simmer for 25–30 minutes, stirring occasionally, until lentils are tender and the curry is thick and creamy." },
      { number: 5, step: "Stir in lemon juice and season with salt. Serve over rice or with naan, topped with fresh cilantro." },
    ],
  },
  {
    title: "Lemongrass & Seaweed Edamame Bowl",
    minutes: 25,
    servings: 2,
    calories: 370,
    tags: ["main course", "vegan", "japanese"],
    ingredients: [
      { name: "shelled edamame", raw: "300g shelled edamame, cooked", amount: 300, unit: "g" },
      { name: "sushi rice", raw: "1.5 cups cooked sushi rice", amount: 1.5, unit: "cups" },
      { name: "dried wakame seaweed", raw: "10g dried wakame seaweed", amount: 10, unit: "g" },
      { name: "lemongrass", raw: "2 stalks lemongrass, inner white part finely minced", amount: 2, unit: "stalks" },
      { name: "avocado", raw: "1 ripe avocado, sliced", amount: 1, unit: "whole" },
      { name: "cucumber", raw: "1/2 cucumber, thinly sliced", amount: 0.5, unit: "whole" },
      { name: "soy sauce", raw: "2 tbsp soy sauce", amount: 2, unit: "tbsp" },
      { name: "rice vinegar", raw: "1 tbsp rice vinegar", amount: 1, unit: "tbsp" },
      { name: "sesame oil", raw: "1 tbsp sesame oil", amount: 1, unit: "tbsp" },
      { name: "lime juice", raw: "juice of 1 lime", amount: 1, unit: "tbsp" },
      { name: "sesame seeds", raw: "1 tbsp mixed sesame seeds", amount: 1, unit: "tbsp" },
      { name: "pickled ginger", raw: "2 tbsp pickled ginger", amount: 2, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Soak dried wakame in cold water for 5 minutes until rehydrated. Drain well and roughly chop." },
      { number: 2, step: "Mix lemongrass, soy sauce, rice vinegar, sesame oil, and lime juice to make the dressing." },
      { number: 3, step: "Season the cooked sushi rice lightly with a splash of rice vinegar and a pinch of salt." },
      { number: 4, step: "Toss rehydrated wakame and edamame with half the lemongrass dressing." },
      { number: 5, step: "Assemble bowls with sushi rice as the base. Arrange edamame-wakame mixture, sliced avocado, cucumber, and pickled ginger over the rice." },
      { number: 6, step: "Drizzle remaining dressing over the bowl and finish with sesame seeds." },
    ],
  },
];

async function generateImage(title: string, ingredients: string): Promise<string | null> {
  try {
    fal.config({ credentials: process.env.FAL_KEY });
    const result = await fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: buildImagePrompt(title, ingredients),
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

  const reqKey = req.headers.get("x-admin-key");
  if (ADMIN_KEY && reqKey !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { title: string; status: string; imageUrl?: string; error?: string }[] = [];

  await processInBatches(VEGAN_RECIPES, 3, async (recipe) => {
    try {
      // Skip if already exists
      const { data: existing } = await supabase!
        .from("recipes")
        .select("id")
        .eq("title", recipe.title)
        .maybeSingle();

      if (existing) {
        results.push({ title: recipe.title, status: "skipped (already exists)" });
        return;
      }

      // Build a short ingredient summary for the image prompt
      const ingredientSummary = recipe.ingredients
        .slice(0, 5)
        .map((i) => i.name)
        .join(", ");

      const imageUrl = await generateImage(recipe.title, ingredientSummary);

      const { error: insertError } = await supabase!.from("recipes").insert({
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
      results.push({ title: recipe.title, status: "error", error: String(e) });
    }
  });

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status.startsWith("skipped")).length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({ total: VEGAN_RECIPES.length, created, skipped, errors, results });
}
