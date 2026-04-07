/**
 * Generate 17 popular English meal prep recipes (batch 2), upsert to Supabase,
 * then use Claude to build image prompts and fal.ai (FLUX Pro 1.1) to generate food photos.
 *
 * Usage:
 *   npx tsx scripts/generate-english-recipes-2.ts
 *
 * Requires in .env.local: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FAL_KEY, ANTHROPIC_API_KEY
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
    id: 9000024,
    title: "Spaghetti Bolognese",
    minutes: 50,
    servings: 4,
    calories: 580,
    n_steps: 6,
    tags: ["italian", "pasta", "beef", "main-course", "meal-prep"],
    ingredients: [
      { name: "spaghetti", amount: 400, unit: "g" },
      { name: "lean ground beef", amount: 500, unit: "g" },
      { name: "canned crushed tomatoes", amount: 400, unit: "g" },
      { name: "tomato paste", amount: 2, unit: "tbsp" },
      { name: "brown onion, finely diced", amount: 1, unit: "" },
      { name: "garlic cloves, minced", amount: 3, unit: "" },
      { name: "carrot, finely diced", amount: 1, unit: "" },
      { name: "celery stalk, finely diced", amount: 1, unit: "" },
      { name: "dry red wine", amount: 120, unit: "ml" },
      { name: "beef stock", amount: 120, unit: "ml" },
      { name: "dried oregano", amount: 1, unit: "tsp" },
      { name: "olive oil", amount: 2, unit: "tbsp" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
      { name: "parmesan, grated", amount: 40, unit: "g" },
    ],
    steps: [
      { number: 1, step: "Heat olive oil in a large heavy-based pot over medium heat. Add onion, carrot, and celery and cook for 6–8 minutes until softened." },
      { number: 2, step: "Add garlic and cook 1 minute. Increase heat to high, add ground beef and cook until well browned, breaking up any lumps, about 5 minutes." },
      { number: 3, step: "Add tomato paste and stir for 1 minute. Pour in red wine and let it reduce by half, about 2 minutes." },
      { number: 4, step: "Add crushed tomatoes, beef stock, and oregano. Season with salt and pepper. Bring to a boil, then reduce heat and simmer uncovered for 25 minutes until thick." },
      { number: 5, step: "Cook spaghetti in well-salted boiling water until al dente. Reserve 120 ml pasta water before draining." },
      { number: 6, step: "Toss drained pasta with the bolognese sauce, adding pasta water as needed. Serve topped with grated parmesan. Store sauce and pasta separately for meal prep." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Add a splash of water before microwaving for 2 minutes. Store sauce separately from pasta for best texture." },
  },
  {
    id: 9000025,
    title: "Beef Lasagna",
    minutes: 75,
    servings: 6,
    calories: 620,
    n_steps: 7,
    tags: ["italian", "beef", "pasta", "baked", "main-course", "meal-prep"],
    ingredients: [
      { name: "dried lasagna sheets", amount: 12, unit: "sheets" },
      { name: "lean ground beef", amount: 600, unit: "g" },
      { name: "canned crushed tomatoes", amount: 800, unit: "g" },
      { name: "tomato paste", amount: 3, unit: "tbsp" },
      { name: "brown onion, diced", amount: 1, unit: "" },
      { name: "garlic cloves, minced", amount: 3, unit: "" },
      { name: "whole milk", amount: 600, unit: "ml" },
      { name: "butter", amount: 50, unit: "g" },
      { name: "plain flour", amount: 50, unit: "g" },
      { name: "mozzarella, shredded", amount: 200, unit: "g" },
      { name: "parmesan, grated", amount: 60, unit: "g" },
      { name: "dried Italian herbs", amount: 1.5, unit: "tsp" },
      { name: "olive oil", amount: 1, unit: "tbsp" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 180°C (350°F). Heat oil in a pan, cook onion until soft, add garlic, then beef and cook until browned. Stir in tomato paste, crushed tomatoes, herbs, salt, and pepper. Simmer 15 minutes." },
      { number: 2, step: "Make béchamel: melt butter in a saucepan, whisk in flour and cook 1 minute. Gradually pour in milk, whisking constantly, until thick and smooth. Season with salt, pepper, and a pinch of nutmeg." },
      { number: 3, step: "Spread a thin layer of meat sauce on the base of a deep 30×20 cm baking dish." },
      { number: 4, step: "Layer lasagna sheets, meat sauce, and béchamel. Repeat 3 times, finishing with a layer of béchamel on top." },
      { number: 5, step: "Scatter mozzarella and parmesan over the top." },
      { number: 6, step: "Cover with foil and bake 30 minutes. Remove foil and bake a further 15 minutes until golden and bubbling." },
      { number: 7, step: "Rest for 10 minutes before slicing. Cut into 6 portions and store in containers." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Cover with a damp paper towel and microwave for 2.5–3 minutes. The béchamel keeps the lasagna moist when reheating." },
  },
  {
    id: 9000026,
    title: "Chicken Tikka Masala",
    minutes: 45,
    servings: 4,
    calories: 460,
    n_steps: 6,
    tags: ["indian", "chicken", "curry", "main-course", "meal-prep", "gluten-free"],
    ingredients: [
      { name: "boneless skinless chicken thighs, cubed", amount: 700, unit: "g" },
      { name: "plain yoghurt", amount: 150, unit: "g" },
      { name: "canned crushed tomatoes", amount: 400, unit: "g" },
      { name: "heavy cream", amount: 120, unit: "ml" },
      { name: "brown onion, diced", amount: 1, unit: "" },
      { name: "garlic cloves, minced", amount: 4, unit: "" },
      { name: "fresh ginger, grated", amount: 1, unit: "tbsp" },
      { name: "tikka masala paste", amount: 3, unit: "tbsp" },
      { name: "garam masala", amount: 1, unit: "tsp" },
      { name: "ground cumin", amount: 0.5, unit: "tsp" },
      { name: "butter", amount: 2, unit: "tbsp" },
      { name: "fresh coriander, chopped", amount: 3, unit: "tbsp" },
      { name: "salt", amount: 0.75, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Marinate chicken in yoghurt, half the garlic, half the ginger, 1 tbsp tikka paste, and 0.5 tsp salt for at least 20 minutes (or overnight)." },
      { number: 2, step: "Grill or pan-fry marinated chicken pieces over high heat until charred in spots and cooked through, about 6–8 minutes. Set aside." },
      { number: 3, step: "Melt butter in a large pan over medium heat. Cook onion until golden, about 8 minutes. Add remaining garlic, ginger, tikka paste, garam masala, and cumin. Cook 2 minutes until fragrant." },
      { number: 4, step: "Add crushed tomatoes and simmer 10 minutes until sauce thickens." },
      { number: 5, step: "Stir in cream and cooked chicken. Simmer gently 5 minutes." },
      { number: 6, step: "Season with salt, garnish with fresh coriander, and serve with rice or naan." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Microwave covered for 2 minutes, stirring halfway. The cream sauce keeps the chicken moist." },
  },
  {
    id: 9000027,
    title: "Butter Chicken",
    minutes: 45,
    servings: 4,
    calories: 490,
    n_steps: 6,
    tags: ["indian", "chicken", "curry", "main-course", "meal-prep", "gluten-free"],
    ingredients: [
      { name: "boneless skinless chicken thighs, cubed", amount: 700, unit: "g" },
      { name: "plain yoghurt", amount: 120, unit: "g" },
      { name: "canned crushed tomatoes", amount: 400, unit: "g" },
      { name: "heavy cream", amount: 150, unit: "ml" },
      { name: "unsalted butter", amount: 3, unit: "tbsp" },
      { name: "brown onion, diced", amount: 1, unit: "" },
      { name: "garlic cloves, minced", amount: 4, unit: "" },
      { name: "fresh ginger, grated", amount: 1, unit: "tbsp" },
      { name: "tomato paste", amount: 1, unit: "tbsp" },
      { name: "garam masala", amount: 1.5, unit: "tsp" },
      { name: "ground cumin", amount: 1, unit: "tsp" },
      { name: "ground coriander", amount: 1, unit: "tsp" },
      { name: "turmeric", amount: 0.5, unit: "tsp" },
      { name: "sugar", amount: 1, unit: "tsp" },
      { name: "salt", amount: 0.75, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Marinate chicken with yoghurt, half the garlic, half the ginger, half the garam masala, cumin, coriander, turmeric, and salt. Rest 20 minutes." },
      { number: 2, step: "Pan-fry chicken in 1 tbsp butter over high heat until golden and cooked through, about 6–8 minutes. Set aside." },
      { number: 3, step: "In the same pan, melt remaining butter over medium heat. Cook onion until soft and golden, about 8 minutes. Add remaining garlic, ginger, and tomato paste. Cook 2 minutes." },
      { number: 4, step: "Add crushed tomatoes, remaining garam masala, and sugar. Simmer 10 minutes until the sauce thickens." },
      { number: 5, step: "Blend the sauce until smooth using a stick blender (optional but recommended for restaurant texture)." },
      { number: 6, step: "Stir in cream and cooked chicken. Simmer 5 minutes. Serve with basmati rice and naan." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Microwave covered for 2 minutes, stirring once. Add a splash of cream or water if the sauce has thickened in the fridge." },
  },
  {
    id: 9000028,
    title: "Chicken Alfredo",
    minutes: 30,
    servings: 4,
    calories: 640,
    n_steps: 5,
    tags: ["italian", "chicken", "pasta", "main-course", "meal-prep", "quick"],
    ingredients: [
      { name: "fettuccine", amount: 400, unit: "g" },
      { name: "boneless skinless chicken breasts", amount: 600, unit: "g" },
      { name: "heavy cream", amount: 300, unit: "ml" },
      { name: "parmesan, finely grated", amount: 100, unit: "g" },
      { name: "butter", amount: 3, unit: "tbsp" },
      { name: "garlic cloves, minced", amount: 3, unit: "" },
      { name: "Italian seasoning", amount: 1, unit: "tsp" },
      { name: "salt and black pepper", amount: 1, unit: "to taste" },
      { name: "fresh parsley, chopped", amount: 2, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Cook fettuccine in well-salted boiling water until al dente. Reserve 200 ml pasta water before draining." },
      { number: 2, step: "Season chicken with Italian seasoning, salt, and pepper. Cook in 1 tbsp butter over medium-high heat for 5–6 minutes per side until golden. Rest 5 minutes, then slice." },
      { number: 3, step: "In the same pan, melt remaining butter over medium heat. Add garlic and cook 30 seconds. Pour in cream and bring to a gentle simmer." },
      { number: 4, step: "Remove from heat and stir in parmesan until fully melted. Season with salt and pepper." },
      { number: 5, step: "Toss pasta in the sauce, using pasta water to loosen to a silky consistency. Top with sliced chicken and fresh parsley. Store sauce and pasta together with a splash of pasta water for reheating." },
    ],
    fridge_life: { days: "3", label: "3 Days" },
    microwave_score: { level: "ok", label: "Reheat Gently", tip: "Add 2 tbsp milk or water before microwaving on 70% power for 2 minutes, stirring halfway. This prevents the cream sauce from splitting." },
  },
  {
    id: 9000029,
    title: "Beef Stew",
    minutes: 100,
    servings: 6,
    calories: 450,
    n_steps: 6,
    tags: ["american", "beef", "stew", "main-course", "meal-prep", "gluten-free"],
    ingredients: [
      { name: "beef chuck, cut into 4 cm cubes", amount: 900, unit: "g" },
      { name: "carrots, cut into chunks", amount: 3, unit: "" },
      { name: "potatoes, peeled and cubed", amount: 4, unit: "" },
      { name: "celery stalks, sliced", amount: 3, unit: "" },
      { name: "brown onion, diced", amount: 1, unit: "" },
      { name: "garlic cloves, minced", amount: 3, unit: "" },
      { name: "canned diced tomatoes", amount: 400, unit: "g" },
      { name: "beef stock", amount: 600, unit: "ml" },
      { name: "tomato paste", amount: 2, unit: "tbsp" },
      { name: "Worcestershire sauce", amount: 1, unit: "tbsp" },
      { name: "dried thyme", amount: 1, unit: "tsp" },
      { name: "dried rosemary", amount: 0.5, unit: "tsp" },
      { name: "plain flour", amount: 2, unit: "tbsp" },
      { name: "olive oil", amount: 2, unit: "tbsp" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
    ],
    steps: [
      { number: 1, step: "Pat beef dry and season generously with salt and pepper. Toss with flour to lightly coat." },
      { number: 2, step: "Heat oil in a large heavy pot over high heat. Brown beef in batches, 2–3 minutes per side, until well seared. Remove and set aside." },
      { number: 3, step: "Reduce heat to medium. Cook onion and celery 5 minutes, then add garlic, tomato paste, thyme, and rosemary. Stir 1 minute." },
      { number: 4, step: "Return beef to the pot. Add beef stock, diced tomatoes, and Worcestershire sauce. Bring to a boil, then reduce to a gentle simmer." },
      { number: 5, step: "Cover and cook 45 minutes. Add carrots and potatoes, then cover and cook a further 30 minutes until beef is fork-tender and vegetables are soft." },
      { number: 6, step: "Adjust seasoning. Divide into meal prep containers." },
    ],
    fridge_life: { days: "5", label: "5 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Microwave covered for 2.5–3 minutes, stirring halfway. Stew actually tastes better the next day as the flavours deepen." },
  },
  {
    id: 9000030,
    title: "Chicken Pot Pie",
    minutes: 60,
    servings: 6,
    calories: 540,
    n_steps: 7,
    tags: ["american", "chicken", "baked", "main-course", "meal-prep"],
    ingredients: [
      { name: "boneless skinless chicken thighs, diced", amount: 600, unit: "g" },
      { name: "frozen peas", amount: 150, unit: "g" },
      { name: "carrots, diced", amount: 2, unit: "" },
      { name: "celery stalks, sliced", amount: 2, unit: "" },
      { name: "brown onion, diced", amount: 1, unit: "" },
      { name: "garlic cloves, minced", amount: 2, unit: "" },
      { name: "chicken stock", amount: 480, unit: "ml" },
      { name: "whole milk", amount: 180, unit: "ml" },
      { name: "butter", amount: 4, unit: "tbsp" },
      { name: "plain flour", amount: 5, unit: "tbsp" },
      { name: "dried thyme", amount: 1, unit: "tsp" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
      { name: "ready-rolled puff pastry sheet", amount: 1, unit: "" },
      { name: "egg, beaten", amount: 1, unit: "" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 200°C (400°F). Melt butter in a large oven-safe skillet over medium heat. Add onion, carrots, and celery and cook 6 minutes until softened. Add garlic and thyme, cook 1 minute." },
      { number: 2, step: "Add diced chicken and cook until no longer pink, about 5 minutes." },
      { number: 3, step: "Sprinkle flour over the mixture and stir well. Gradually pour in chicken stock and milk, stirring constantly. Bring to a simmer and cook until thick, about 3 minutes." },
      { number: 4, step: "Stir in frozen peas. Season with salt and pepper." },
      { number: 5, step: "Transfer filling to a 23×33 cm baking dish (or keep in oven-safe skillet)." },
      { number: 6, step: "Drape puff pastry over the top. Trim edges and press to seal. Cut 4–5 small slits in the top for steam. Brush with beaten egg." },
      { number: 7, step: "Bake 25–30 minutes until pastry is deep golden brown. Rest 10 minutes before slicing into 6 portions." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "ok", label: "Reheat Gently", tip: "For best results reheat in the oven at 180°C for 10–12 minutes to crisp the pastry. If using microwave, heat filling only and add fresh pastry." },
  },
  {
    id: 9000031,
    title: "Chicken Fried Rice",
    minutes: 25,
    servings: 4,
    calories: 430,
    n_steps: 5,
    tags: ["asian-inspired", "chicken", "rice", "main-course", "meal-prep", "quick"],
    ingredients: [
      { name: "cooked jasmine rice (day-old, cold)", amount: 600, unit: "g" },
      { name: "boneless skinless chicken breast, diced small", amount: 400, unit: "g" },
      { name: "eggs", amount: 3, unit: "" },
      { name: "frozen mixed vegetables (peas, corn, carrot)", amount: 200, unit: "g" },
      { name: "spring onions, sliced", amount: 3, unit: "" },
      { name: "garlic cloves, minced", amount: 3, unit: "" },
      { name: "soy sauce", amount: 3, unit: "tbsp" },
      { name: "oyster sauce", amount: 1, unit: "tbsp" },
      { name: "sesame oil", amount: 1, unit: "tsp" },
      { name: "vegetable oil", amount: 2, unit: "tbsp" },
      { name: "white pepper", amount: 0.25, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Heat 1 tbsp oil in a wok or large frying pan over high heat. Add chicken, season with salt and pepper, and stir-fry until cooked through, about 4 minutes. Push to the side." },
      { number: 2, step: "Add remaining oil and scramble the eggs until just set. Break into small pieces." },
      { number: 3, step: "Add frozen vegetables and garlic, stir-fry 2 minutes. Add cold rice and break up any clumps." },
      { number: 4, step: "Stir-fry everything together on high heat for 3–4 minutes until the rice is lightly toasted." },
      { number: 5, step: "Add soy sauce, oyster sauce, sesame oil, and white pepper. Toss to combine. Fold in spring onions and serve." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Sprinkle a little water over the rice before microwaving for 1.5–2 minutes and fluffing with a fork." },
  },
  {
    id: 9000032,
    title: "Beef Tacos",
    minutes: 25,
    servings: 4,
    calories: 480,
    n_steps: 4,
    tags: ["mexican", "beef", "main-course", "meal-prep", "quick"],
    ingredients: [
      { name: "lean ground beef", amount: 600, unit: "g" },
      { name: "taco seasoning", amount: 2, unit: "tbsp" },
      { name: "canned diced tomatoes", amount: 400, unit: "g" },
      { name: "brown onion, diced", amount: 1, unit: "" },
      { name: "garlic cloves, minced", amount: 2, unit: "" },
      { name: "small corn tortillas", amount: 12, unit: "" },
      { name: "shredded lettuce", amount: 2, unit: "cups" },
      { name: "cheddar cheese, shredded", amount: 100, unit: "g" },
      { name: "sour cream", amount: 4, unit: "tbsp" },
      { name: "salsa", amount: 4, unit: "tbsp" },
      { name: "lime", amount: 1, unit: "" },
      { name: "olive oil", amount: 1, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Heat oil in a skillet over medium-high heat. Cook onion 3–4 minutes until soft. Add garlic, cook 30 seconds." },
      { number: 2, step: "Add ground beef, breaking up with a spoon, and cook until well browned, about 5 minutes. Drain excess fat." },
      { number: 3, step: "Add taco seasoning and diced tomatoes. Simmer 5–7 minutes until the sauce has thickened and coats the meat." },
      { number: 4, step: "Warm tortillas in a dry pan or oven. Serve beef filling with shredded lettuce, cheese, sour cream, and salsa. Squeeze lime over. Store beef separately for meal prep." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Reheat beef filling in microwave for 1.5 minutes. Assemble tacos fresh with cold toppings for best texture." },
  },
  {
    id: 9000033,
    title: "Chicken Enchiladas",
    minutes: 50,
    servings: 4,
    calories: 510,
    n_steps: 6,
    tags: ["mexican", "chicken", "baked", "main-course", "meal-prep"],
    ingredients: [
      { name: "boneless skinless chicken breasts", amount: 600, unit: "g" },
      { name: "flour tortillas (20 cm)", amount: 8, unit: "" },
      { name: "canned red enchilada sauce", amount: 400, unit: "ml" },
      { name: "cheddar and mozzarella blend, shredded", amount: 200, unit: "g" },
      { name: "brown onion, diced", amount: 1, unit: "" },
      { name: "garlic cloves, minced", amount: 2, unit: "" },
      { name: "ground cumin", amount: 1, unit: "tsp" },
      { name: "smoked paprika", amount: 0.5, unit: "tsp" },
      { name: "canned black beans, drained", amount: 200, unit: "g" },
      { name: "sour cream", amount: 4, unit: "tbsp" },
      { name: "fresh coriander, chopped", amount: 3, unit: "tbsp" },
      { name: "olive oil", amount: 1, unit: "tbsp" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 190°C (375°F). Season and bake or poach chicken breasts until cooked through. Shred with two forks." },
      { number: 2, step: "Heat oil in a pan, cook onion until soft. Add garlic, cumin, and paprika, cook 1 minute. Add shredded chicken and black beans. Stir in 3–4 tbsp enchilada sauce. Season with salt and pepper." },
      { number: 3, step: "Spread a thin layer of enchilada sauce on the base of a 23×33 cm baking dish." },
      { number: 4, step: "Spoon chicken filling into each tortilla, roll tightly, and place seam-side down in the dish." },
      { number: 5, step: "Pour remaining enchilada sauce over the rolls and scatter cheese on top." },
      { number: 6, step: "Bake uncovered for 20–25 minutes until cheese is bubbly and golden. Garnish with sour cream and fresh coriander." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Cover with a damp paper towel and microwave for 2–2.5 minutes. The enchilada sauce keeps everything moist." },
  },
  {
    id: 9000034,
    title: "Shepherd's Pie",
    minutes: 65,
    servings: 6,
    calories: 480,
    n_steps: 7,
    tags: ["british", "lamb", "baked", "main-course", "meal-prep"],
    ingredients: [
      { name: "lean ground lamb (or beef for cottage pie)", amount: 700, unit: "g" },
      { name: "potatoes, peeled and chopped", amount: 900, unit: "g" },
      { name: "frozen peas", amount: 150, unit: "g" },
      { name: "carrots, diced", amount: 2, unit: "" },
      { name: "brown onion, diced", amount: 1, unit: "" },
      { name: "garlic cloves, minced", amount: 2, unit: "" },
      { name: "lamb or beef stock", amount: 300, unit: "ml" },
      { name: "tomato paste", amount: 2, unit: "tbsp" },
      { name: "Worcestershire sauce", amount: 1, unit: "tbsp" },
      { name: "dried rosemary", amount: 1, unit: "tsp" },
      { name: "dried thyme", amount: 0.5, unit: "tsp" },
      { name: "butter", amount: 50, unit: "g" },
      { name: "whole milk", amount: 80, unit: "ml" },
      { name: "olive oil", amount: 1, unit: "tbsp" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 200°C (400°F). Boil potatoes in salted water until tender, about 15 minutes." },
      { number: 2, step: "Heat oil in a large oven-safe pan. Brown ground lamb in batches over high heat, 4–5 minutes. Remove excess fat, leaving about 1 tbsp." },
      { number: 3, step: "Add onion, carrots, and garlic, cook 5 minutes. Stir in tomato paste, rosemary, thyme, Worcestershire sauce, and stock. Simmer 15 minutes until thick." },
      { number: 4, step: "Stir in peas. Season with salt and pepper." },
      { number: 5, step: "Drain and mash potatoes with butter and milk until smooth. Season well." },
      { number: 6, step: "Spoon mash over the meat filling and smooth the top. Use a fork to create a ridged pattern." },
      { number: 7, step: "Bake 25–30 minutes until the topping is golden. Rest 5 minutes before serving. Divide into 6 portions." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Microwave covered for 2.5–3 minutes. The mashed potato topping reheats beautifully and stays creamy." },
  },
  {
    id: 9000035,
    title: "Honey Garlic Chicken",
    minutes: 30,
    servings: 4,
    calories: 420,
    n_steps: 5,
    tags: ["asian-inspired", "chicken", "main-course", "meal-prep", "quick", "gluten-free"],
    ingredients: [
      { name: "boneless skinless chicken thighs", amount: 700, unit: "g" },
      { name: "garlic cloves, minced", amount: 5, unit: "" },
      { name: "honey", amount: 3, unit: "tbsp" },
      { name: "soy sauce", amount: 3, unit: "tbsp" },
      { name: "rice vinegar", amount: 1, unit: "tbsp" },
      { name: "sesame oil", amount: 1, unit: "tsp" },
      { name: "cornstarch", amount: 1, unit: "tsp" },
      { name: "water", amount: 2, unit: "tbsp" },
      { name: "olive oil", amount: 1, unit: "tbsp" },
      { name: "sesame seeds", amount: 1, unit: "tbsp" },
      { name: "spring onions, sliced", amount: 2, unit: "" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
    ],
    steps: [
      { number: 1, step: "Season chicken thighs with salt and pepper. Heat oil in a skillet over medium-high heat." },
      { number: 2, step: "Cook chicken 5–6 minutes per side until golden brown and cooked through. Remove and set aside." },
      { number: 3, step: "In the same pan, reduce heat to medium. Add garlic and cook 30 seconds until fragrant." },
      { number: 4, step: "Whisk together honey, soy sauce, rice vinegar, sesame oil, and cornstarch mixed with water. Pour into the pan and simmer 2–3 minutes until the sauce thickens and becomes glossy." },
      { number: 5, step: "Return chicken to the pan and toss to coat in the sauce. Garnish with sesame seeds and spring onions. Serve over steamed rice." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Microwave with a spoonful of sauce for 1.5–2 minutes. The honey glaze keeps the chicken juicy." },
  },
  {
    id: 9000036,
    title: "Stuffed Bell Peppers",
    minutes: 55,
    servings: 4,
    calories: 420,
    n_steps: 6,
    tags: ["american", "beef", "baked", "main-course", "meal-prep", "gluten-free"],
    ingredients: [
      { name: "large bell peppers (mixed colours)", amount: 4, unit: "" },
      { name: "lean ground beef", amount: 400, unit: "g" },
      { name: "cooked white rice", amount: 250, unit: "g" },
      { name: "canned diced tomatoes", amount: 400, unit: "g" },
      { name: "brown onion, diced", amount: 1, unit: "" },
      { name: "garlic cloves, minced", amount: 2, unit: "" },
      { name: "tomato paste", amount: 1, unit: "tbsp" },
      { name: "Italian seasoning", amount: 1, unit: "tsp" },
      { name: "mozzarella, shredded", amount: 100, unit: "g" },
      { name: "parmesan, grated", amount: 30, unit: "g" },
      { name: "olive oil", amount: 1, unit: "tbsp" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 190°C (375°F). Slice the tops off the peppers and scoop out seeds and membranes. Brush lightly with oil, season inside, and place in a baking dish." },
      { number: 2, step: "Pre-bake empty peppers for 10 minutes to soften slightly." },
      { number: 3, step: "Heat oil in a skillet, cook onion until soft, add garlic, then ground beef. Cook until browned." },
      { number: 4, step: "Add tomato paste, diced tomatoes, Italian seasoning, salt, and pepper. Simmer 5 minutes. Remove from heat and stir in cooked rice." },
      { number: 5, step: "Fill each pepper generously with the beef and rice mixture. Top with mozzarella and parmesan." },
      { number: 6, step: "Cover dish with foil and bake 20 minutes. Remove foil and bake a further 10 minutes until cheese is golden and bubbling." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Microwave covered for 2–2.5 minutes. The pepper softens nicely on reheating and the filling stays moist." },
  },
  {
    id: 9000037,
    title: "Meatballs in Tomato Sauce",
    minutes: 45,
    servings: 4,
    calories: 490,
    n_steps: 6,
    tags: ["italian", "beef", "main-course", "meal-prep"],
    ingredients: [
      { name: "lean ground beef", amount: 500, unit: "g" },
      { name: "breadcrumbs", amount: 40, unit: "g" },
      { name: "egg", amount: 1, unit: "" },
      { name: "parmesan, grated", amount: 30, unit: "g" },
      { name: "garlic cloves, minced", amount: 4, unit: "" },
      { name: "fresh parsley, chopped", amount: 3, unit: "tbsp" },
      { name: "canned crushed tomatoes", amount: 800, unit: "g" },
      { name: "brown onion, diced", amount: 1, unit: "" },
      { name: "tomato paste", amount: 2, unit: "tbsp" },
      { name: "dried basil", amount: 1, unit: "tsp" },
      { name: "dried oregano", amount: 1, unit: "tsp" },
      { name: "olive oil", amount: 2, unit: "tbsp" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
    ],
    steps: [
      { number: 1, step: "Combine ground beef, breadcrumbs, egg, parmesan, half the garlic, parsley, salt, and pepper. Mix until just combined. Roll into 20 golf ball-sized meatballs." },
      { number: 2, step: "Heat oil in a large pan over medium-high heat. Brown meatballs in batches on all sides, about 5 minutes total. Remove and set aside (they don't need to be cooked through)." },
      { number: 3, step: "In the same pan, cook onion over medium heat until soft. Add remaining garlic and tomato paste, cook 1 minute." },
      { number: 4, step: "Add crushed tomatoes, basil, and oregano. Season with salt and pepper. Bring to a simmer." },
      { number: 5, step: "Return meatballs to the pan. Cover and simmer on low heat for 20 minutes until cooked through and the sauce is thick." },
      { number: 6, step: "Serve over spaghetti or with crusty bread. Divide into meal prep containers with sauce." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Microwave covered for 2 minutes. Meatballs reheat very well in the tomato sauce which keeps them moist." },
  },
  {
    id: 9000038,
    title: "Chicken Curry",
    minutes: 45,
    servings: 4,
    calories: 440,
    n_steps: 6,
    tags: ["indian", "chicken", "curry", "main-course", "meal-prep", "gluten-free"],
    ingredients: [
      { name: "boneless skinless chicken thighs, cubed", amount: 700, unit: "g" },
      { name: "canned coconut milk", amount: 400, unit: "ml" },
      { name: "canned crushed tomatoes", amount: 400, unit: "g" },
      { name: "brown onion, diced", amount: 1, unit: "" },
      { name: "garlic cloves, minced", amount: 4, unit: "" },
      { name: "fresh ginger, grated", amount: 1, unit: "tbsp" },
      { name: "curry powder", amount: 2, unit: "tbsp" },
      { name: "ground cumin", amount: 1, unit: "tsp" },
      { name: "ground coriander", amount: 1, unit: "tsp" },
      { name: "turmeric", amount: 0.5, unit: "tsp" },
      { name: "vegetable oil", amount: 2, unit: "tbsp" },
      { name: "fresh coriander, chopped", amount: 3, unit: "tbsp" },
      { name: "salt", amount: 0.75, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Heat oil in a large pan over medium heat. Cook onion until golden, about 8 minutes." },
      { number: 2, step: "Add garlic and ginger, cook 1 minute. Add curry powder, cumin, coriander, and turmeric. Stir constantly for 1–2 minutes until fragrant." },
      { number: 3, step: "Add chicken and stir to coat with the spices. Cook 3–4 minutes until the outside is sealed." },
      { number: 4, step: "Add crushed tomatoes and coconut milk. Stir to combine and bring to a gentle simmer." },
      { number: 5, step: "Simmer uncovered for 20–25 minutes, stirring occasionally, until chicken is cooked through and the sauce has thickened." },
      { number: 6, step: "Season with salt, garnish with fresh coriander, and serve with steamed basmati rice or naan." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Microwave covered for 2 minutes. The coconut milk sauce keeps the chicken moist and the flavour intensifies overnight." },
  },
  {
    id: 9000039,
    title: "Beef Chili",
    minutes: 55,
    servings: 6,
    calories: 420,
    n_steps: 5,
    tags: ["american", "beef", "main-course", "meal-prep", "gluten-free", "high-protein"],
    ingredients: [
      { name: "lean ground beef", amount: 700, unit: "g" },
      { name: "canned kidney beans, drained", amount: 400, unit: "g" },
      { name: "canned black beans, drained", amount: 400, unit: "g" },
      { name: "canned crushed tomatoes", amount: 800, unit: "g" },
      { name: "beef stock", amount: 240, unit: "ml" },
      { name: "brown onion, diced", amount: 1, unit: "" },
      { name: "garlic cloves, minced", amount: 4, unit: "" },
      { name: "red bell pepper, diced", amount: 1, unit: "" },
      { name: "chili powder", amount: 2, unit: "tbsp" },
      { name: "ground cumin", amount: 1, unit: "tsp" },
      { name: "smoked paprika", amount: 1, unit: "tsp" },
      { name: "dried oregano", amount: 0.5, unit: "tsp" },
      { name: "olive oil", amount: 1, unit: "tbsp" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
    ],
    steps: [
      { number: 1, step: "Heat oil in a large heavy pot over medium-high heat. Cook onion and bell pepper until soft, about 5 minutes. Add garlic, cook 30 seconds." },
      { number: 2, step: "Add ground beef and cook until browned, about 5 minutes, breaking up lumps. Drain excess fat." },
      { number: 3, step: "Add chili powder, cumin, paprika, and oregano. Stir 1 minute." },
      { number: 4, step: "Add crushed tomatoes, beef stock, kidney beans, and black beans. Bring to a boil, then reduce heat." },
      { number: 5, step: "Simmer uncovered for 30 minutes, stirring occasionally, until thick and rich. Season with salt and pepper. Serve with sour cream, shredded cheese, and cornbread." },
    ],
    fridge_life: { days: "5", label: "5 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Microwave covered for 2–2.5 minutes, stirring halfway. Chili tastes even better the next day as flavours develop." },
  },
  {
    id: 9000040,
    title: "Banana Bread",
    minutes: 70,
    servings: 8,
    calories: 280,
    n_steps: 5,
    tags: ["baking", "breakfast", "snack", "vegetarian", "meal-prep"],
    ingredients: [
      { name: "ripe bananas, mashed", amount: 3, unit: "" },
      { name: "plain flour", amount: 200, unit: "g" },
      { name: "unsalted butter, melted", amount: 80, unit: "g" },
      { name: "brown sugar", amount: 120, unit: "g" },
      { name: "eggs", amount: 2, unit: "" },
      { name: "vanilla extract", amount: 1, unit: "tsp" },
      { name: "baking soda", amount: 1, unit: "tsp" },
      { name: "cinnamon", amount: 0.5, unit: "tsp" },
      { name: "salt", amount: 0.25, unit: "tsp" },
      { name: "sour cream or Greek yoghurt", amount: 60, unit: "g" },
      { name: "walnuts or chocolate chips (optional)", amount: 60, unit: "g" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 175°C (350°F). Grease and line a 23×13 cm loaf tin with baking paper." },
      { number: 2, step: "Mash bananas in a large bowl until smooth. Stir in melted butter, brown sugar, eggs, vanilla, and sour cream." },
      { number: 3, step: "Sift in flour, baking soda, cinnamon, and salt. Fold gently until just combined — do not overmix. Fold in walnuts or chocolate chips if using." },
      { number: 4, step: "Pour batter into the prepared tin. Bake 55–65 minutes until a skewer inserted into the centre comes out clean. If the top browns too quickly, tent with foil." },
      { number: 5, step: "Cool in the tin for 10 minutes, then transfer to a wire rack. Slice into 8 portions once fully cooled." },
    ],
    fridge_life: { days: "5", label: "5 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Microwave a slice for 20–30 seconds. Optionally spread with butter after heating for a fresh-baked feel." },
  },
];

// ─── Upsert recipes ───────────────────────────────────────────────────────────

async function upsertRecipes() {
  console.log("Upserting recipes to Supabase...");
  const { data: existing } = await supabase
    .from("recipes")
    .select("id, image_url")
    .in("id", RECIPES.map((r) => r.id));

  const existingImages = new Map<number, string>(
    (existing ?? [])
      .filter((r: { id: number; image_url: string | null }) => r.image_url)
      .map((r: { id: number; image_url: string }) => [r.id, r.image_url])
  );

  const records = RECIPES.map((r) => ({
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
      content: `Given this meal prep recipe, fill in only the [DISH NAME] placeholder in the prompt below with a vivid 10-15 word description of the finished dish's appearance (colours, textures, key visible ingredients). Output the complete prompt and nothing else.

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
  } catch (err) {
    prompt = `Professional food photography of ${title}, served on a clean ceramic plate or bowl, 45-degree overhead angle, soft diffused natural light from one side, shallow depth of field with sharp focus on the hero ingredient, minimal elegant plating with a small fresh herb or garnish accent, neutral background (white, light stone, warm wood, or linen), warm and inviting color tone, photorealistic, editorial food styling, appetizing and fresh, 4K detail`;
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
