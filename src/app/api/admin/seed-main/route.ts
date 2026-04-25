// POST /api/admin/seed-main
//
// Recovers the 39 non-Spoonacular platform recipes that were accidentally deleted.
// Regenerates images via fal.ai recraft-v3.
//
// Usage:
//   curl -X POST "http://localhost:3000/api/admin/seed-main" \
//        -H "x-admin-key: zest-admin-2026"
//
// Add ?update_images=1 to only regenerate images for rows with null image_url.

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

const MAIN_RECIPES: RecipeSeed[] = [
  {
    id: 9000018,
    title: "Honey Soy Chicken Thighs with Brown Rice & Broccoli",
    minutes: 35, servings: 4, calories: 520,
    tags: ["asian-inspired", "chicken", "rice", "broccoli", "meal-prep", "main-course", "gluten-free"],
    ingredients: [
      { name: "chicken thighs", raw: "600g boneless chicken thighs", amount: 600, unit: "g" },
      { name: "soy sauce", raw: "3 tbsp soy sauce", amount: 3, unit: "tbsp" },
      { name: "honey", raw: "2 tbsp honey", amount: 2, unit: "tbsp" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "sesame oil", raw: "1 tbsp sesame oil", amount: 1, unit: "tbsp" },
      { name: "ginger", raw: "1 tsp grated ginger", amount: 1, unit: "tsp" },
      { name: "brown rice", raw: "2 cups brown rice", amount: 2, unit: "cups" },
      { name: "broccoli", raw: "2 cups broccoli florets", amount: 2, unit: "cups" },
      { name: "sesame seeds", raw: "1 tbsp sesame seeds", amount: 1, unit: "tbsp" },
      { name: "scallions", raw: "2 scallions, sliced", amount: 2, unit: "stalks" },
    ],
    steps: [
      { number: 1, step: "Whisk soy sauce, honey, garlic, sesame oil, and ginger into a marinade. Coat chicken and marinate for at least 15 minutes." },
      { number: 2, step: "Cook brown rice according to package instructions." },
      { number: 3, step: "Sear chicken thighs in a hot skillet over medium-high heat for 5–6 minutes per side until cooked through. Pour remaining marinade over and let it reduce." },
      { number: 4, step: "Steam broccoli for 3–4 minutes until bright green and tender-crisp." },
      { number: 5, step: "Slice chicken and serve over brown rice with broccoli. Garnish with sesame seeds and scallions." },
    ],
  },
  {
    id: 9000019,
    title: "Instant Pot Lemon Garlic Chicken Thighs",
    minutes: 30, servings: 4, calories: 420,
    tags: ["chicken", "instant-pot", "lemon", "garlic", "meal-prep", "main-course", "gluten-free", "quick"],
    ingredients: [
      { name: "chicken thighs", raw: "700g bone-in chicken thighs", amount: 700, unit: "g" },
      { name: "garlic", raw: "6 cloves garlic, smashed", amount: 6, unit: "cloves" },
      { name: "lemon", raw: "1 lemon, sliced + juice", amount: 1, unit: "whole" },
      { name: "chicken broth", raw: "120ml chicken broth", amount: 120, unit: "ml" },
      { name: "olive oil", raw: "2 tbsp olive oil", amount: 2, unit: "tbsp" },
      { name: "dried oregano", raw: "1 tsp dried oregano", amount: 1, unit: "tsp" },
      { name: "dried thyme", raw: "1 tsp dried thyme", amount: 1, unit: "tsp" },
      { name: "paprika", raw: "1 tsp paprika", amount: 1, unit: "tsp" },
      { name: "salt", raw: "1 tsp salt", amount: 1, unit: "tsp" },
      { name: "black pepper", raw: "½ tsp black pepper", amount: 0.5, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Season chicken thighs with oregano, thyme, paprika, salt, and pepper." },
      { number: 2, step: "Set Instant Pot to Sauté. Heat olive oil and sear chicken skin-side down for 3 minutes until golden. Remove and set aside." },
      { number: 3, step: "Add garlic and sauté for 30 seconds. Deglaze with chicken broth and lemon juice, scraping up any brown bits." },
      { number: 4, step: "Return chicken to the pot, add lemon slices. Seal lid, cook on High Pressure for 12 minutes. Natural release for 5 minutes, then quick release." },
      { number: 5, step: "Serve over rice or with roasted vegetables, spooning the pan juices over top." },
    ],
  },
  {
    id: 9000020,
    title: "Egg Muffins with Vegetables & Cheese",
    minutes: 25, servings: 6, calories: 180,
    tags: ["eggs", "breakfast", "vegetarian", "gluten-free", "meal-prep", "quick", "low-carb"],
    ingredients: [
      { name: "eggs", raw: "8 large eggs", amount: 8, unit: "whole" },
      { name: "cheddar cheese", raw: "80g cheddar cheese, shredded", amount: 80, unit: "g" },
      { name: "bell pepper", raw: "1 bell pepper, diced", amount: 1, unit: "whole" },
      { name: "spinach", raw: "1 cup baby spinach, chopped", amount: 1, unit: "cup" },
      { name: "red onion", raw: "¼ red onion, diced", amount: 0.25, unit: "whole" },
      { name: "cherry tomatoes", raw: "6 cherry tomatoes, halved", amount: 6, unit: "whole" },
      { name: "milk", raw: "3 tbsp milk", amount: 3, unit: "tbsp" },
      { name: "salt", raw: "½ tsp salt", amount: 0.5, unit: "tsp" },
      { name: "black pepper", raw: "¼ tsp black pepper", amount: 0.25, unit: "tsp" },
      { name: "olive oil spray", raw: "olive oil spray", amount: 1, unit: "spray" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 180°C. Spray a 12-cup muffin tin generously with olive oil." },
      { number: 2, step: "Whisk eggs with milk, salt, and pepper in a large bowl." },
      { number: 3, step: "Divide bell pepper, spinach, onion, and tomatoes evenly among muffin cups." },
      { number: 4, step: "Pour the egg mixture over the vegetables, filling each cup about ¾ full." },
      { number: 5, step: "Top with shredded cheese. Bake for 18–20 minutes until eggs are set and tops are lightly golden. Cool before storing." },
    ],
  },
  {
    id: 9000021,
    title: "Greek Lemon Chicken with Potatoes",
    minutes: 55, servings: 4, calories: 560,
    tags: ["greek", "mediterranean", "chicken", "potatoes", "meal-prep", "main-course", "gluten-free"],
    ingredients: [
      { name: "chicken pieces", raw: "1kg chicken thighs and drumsticks", amount: 1000, unit: "g" },
      { name: "potatoes", raw: "600g baby potatoes, halved", amount: 600, unit: "g" },
      { name: "lemon", raw: "2 lemons, juiced and zested", amount: 2, unit: "whole" },
      { name: "olive oil", raw: "4 tbsp olive oil", amount: 4, unit: "tbsp" },
      { name: "garlic", raw: "5 cloves garlic, minced", amount: 5, unit: "cloves" },
      { name: "dried oregano", raw: "2 tsp dried oregano", amount: 2, unit: "tsp" },
      { name: "dried rosemary", raw: "1 tsp dried rosemary", amount: 1, unit: "tsp" },
      { name: "chicken broth", raw: "120ml chicken broth", amount: 120, unit: "ml" },
      { name: "salt", raw: "1½ tsp salt", amount: 1.5, unit: "tsp" },
      { name: "black pepper", raw: "½ tsp black pepper", amount: 0.5, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 200°C. Mix lemon juice, zest, olive oil, garlic, oregano, rosemary, salt, and pepper." },
      { number: 2, step: "Toss chicken and potatoes with the marinade in a large roasting pan." },
      { number: 3, step: "Pour chicken broth into the bottom of the pan. Arrange chicken skin-side up." },
      { number: 4, step: "Roast for 45–50 minutes, basting halfway, until chicken is golden and potatoes are tender." },
      { number: 5, step: "Serve with pan juices spooned over top and a side of Greek salad." },
    ],
  },
  {
    id: 9000022,
    title: "Spicy Buffalo Chicken Rice Bowl",
    minutes: 30, servings: 4, calories: 490,
    tags: ["american", "chicken", "rice", "spicy", "meal-prep", "main-course", "high-protein"],
    ingredients: [
      { name: "chicken breast", raw: "600g chicken breast, cubed", amount: 600, unit: "g" },
      { name: "buffalo hot sauce", raw: "4 tbsp buffalo hot sauce", amount: 4, unit: "tbsp" },
      { name: "butter", raw: "2 tbsp butter", amount: 2, unit: "tbsp" },
      { name: "jasmine rice", raw: "2 cups jasmine rice", amount: 2, unit: "cups" },
      { name: "romaine lettuce", raw: "2 cups romaine lettuce, shredded", amount: 2, unit: "cups" },
      { name: "cherry tomatoes", raw: "1 cup cherry tomatoes, halved", amount: 1, unit: "cup" },
      { name: "blue cheese dressing", raw: "4 tbsp blue cheese dressing", amount: 4, unit: "tbsp" },
      { name: "celery", raw: "2 stalks celery, sliced", amount: 2, unit: "stalks" },
      { name: "garlic powder", raw: "½ tsp garlic powder", amount: 0.5, unit: "tsp" },
      { name: "olive oil", raw: "1 tbsp olive oil", amount: 1, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Cook jasmine rice according to package instructions." },
      { number: 2, step: "Season chicken with garlic powder and salt. Cook in olive oil over medium-high heat for 5–6 minutes until cooked through." },
      { number: 3, step: "Melt butter with buffalo sauce in the pan. Toss chicken in the sauce until well coated." },
      { number: 4, step: "Assemble bowls: rice on the bottom, buffalo chicken on top, followed by lettuce, tomatoes, and celery." },
      { number: 5, step: "Drizzle with blue cheese dressing and serve immediately." },
    ],
  },
  {
    id: 9000024,
    title: "Spaghetti Bolognese",
    minutes: 45, servings: 6, calories: 580,
    tags: ["italian", "pasta", "beef", "main-course", "meal-prep"],
    ingredients: [
      { name: "spaghetti", raw: "500g spaghetti", amount: 500, unit: "g" },
      { name: "ground beef", raw: "500g ground beef", amount: 500, unit: "g" },
      { name: "onion", raw: "1 large onion, diced", amount: 1, unit: "whole" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "canned crushed tomatoes", raw: "800g canned crushed tomatoes", amount: 800, unit: "g" },
      { name: "tomato paste", raw: "2 tbsp tomato paste", amount: 2, unit: "tbsp" },
      { name: "carrot", raw: "1 carrot, finely diced", amount: 1, unit: "whole" },
      { name: "celery", raw: "1 stalk celery, finely diced", amount: 1, unit: "stalk" },
      { name: "red wine", raw: "120ml red wine", amount: 120, unit: "ml" },
      { name: "olive oil", raw: "2 tbsp olive oil", amount: 2, unit: "tbsp" },
      { name: "dried oregano", raw: "1 tsp dried oregano", amount: 1, unit: "tsp" },
      { name: "parmesan", raw: "parmesan to serve", amount: 0, unit: "" },
    ],
    steps: [
      { number: 1, step: "Heat olive oil in a large pot. Sauté onion, carrot, and celery for 8 minutes until softened. Add garlic and cook 1 minute more." },
      { number: 2, step: "Add ground beef and cook, breaking it up, until browned all over. Drain excess fat." },
      { number: 3, step: "Add tomato paste and cook for 2 minutes. Pour in red wine and simmer until reduced by half." },
      { number: 4, step: "Add crushed tomatoes and oregano. Simmer uncovered on low heat for 25–30 minutes, stirring occasionally." },
      { number: 5, step: "Cook spaghetti until al dente. Serve topped with Bolognese sauce and grated parmesan." },
    ],
  },
  {
    id: 9000025,
    title: "Beef Lasagna",
    minutes: 75, servings: 8, calories: 620,
    tags: ["italian", "beef", "pasta", "baked", "main-course", "meal-prep"],
    ingredients: [
      { name: "lasagna sheets", raw: "12 lasagna sheets", amount: 12, unit: "sheets" },
      { name: "ground beef", raw: "600g ground beef", amount: 600, unit: "g" },
      { name: "canned crushed tomatoes", raw: "800g canned crushed tomatoes", amount: 800, unit: "g" },
      { name: "onion", raw: "1 onion, diced", amount: 1, unit: "whole" },
      { name: "garlic", raw: "3 cloves garlic, minced", amount: 3, unit: "cloves" },
      { name: "whole milk", raw: "500ml whole milk", amount: 500, unit: "ml" },
      { name: "butter", raw: "3 tbsp butter", amount: 3, unit: "tbsp" },
      { name: "flour", raw: "3 tbsp flour", amount: 3, unit: "tbsp" },
      { name: "mozzarella", raw: "200g mozzarella, shredded", amount: 200, unit: "g" },
      { name: "parmesan", raw: "80g parmesan, grated", amount: 80, unit: "g" },
      { name: "tomato paste", raw: "2 tbsp tomato paste", amount: 2, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Make the meat sauce: brown beef with onion and garlic, add tomato paste and crushed tomatoes. Simmer 20 minutes." },
      { number: 2, step: "Make béchamel: melt butter, whisk in flour and cook 1 minute. Gradually add milk, stirring constantly until thick. Season with salt and nutmeg." },
      { number: 3, step: "Preheat oven to 180°C. Layer: meat sauce, lasagna sheets, béchamel. Repeat 3 times, finishing with béchamel on top." },
      { number: 4, step: "Top with mozzarella and parmesan. Cover with foil and bake 30 minutes. Uncover and bake 15 more minutes until golden and bubbling." },
      { number: 5, step: "Rest for 10 minutes before slicing. Keeps well in the fridge for 4 days." },
    ],
  },
  {
    id: 9000026,
    title: "Chicken Tikka Masala",
    minutes: 45, servings: 4, calories: 510,
    tags: ["indian", "chicken", "curry", "main-course", "meal-prep", "gluten-free"],
    ingredients: [
      { name: "chicken breast", raw: "700g chicken breast, cubed", amount: 700, unit: "g" },
      { name: "canned crushed tomatoes", raw: "400g canned crushed tomatoes", amount: 400, unit: "g" },
      { name: "heavy cream", raw: "150ml heavy cream", amount: 150, unit: "ml" },
      { name: "onion", raw: "1 large onion, diced", amount: 1, unit: "whole" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "ginger", raw: "1 tbsp fresh ginger, grated", amount: 1, unit: "tbsp" },
      { name: "tikka masala paste", raw: "3 tbsp tikka masala paste", amount: 3, unit: "tbsp" },
      { name: "plain yogurt", raw: "100ml plain yogurt (for marinade)", amount: 100, unit: "ml" },
      { name: "garam masala", raw: "1 tsp garam masala", amount: 1, unit: "tsp" },
      { name: "butter", raw: "2 tbsp butter", amount: 2, unit: "tbsp" },
      { name: "fresh cilantro", raw: "¼ cup cilantro, to serve", amount: 0.25, unit: "cup" },
    ],
    steps: [
      { number: 1, step: "Marinate chicken in yogurt with half the tikka masala paste and garam masala for at least 30 minutes. Broil or pan-fry until slightly charred. Set aside." },
      { number: 2, step: "Melt butter in a large pan. Sauté onion for 8 minutes until soft. Add garlic and ginger, cook 2 minutes." },
      { number: 3, step: "Add remaining tikka masala paste and cook 2 minutes. Add crushed tomatoes and simmer 10 minutes." },
      { number: 4, step: "Stir in cream and cooked chicken. Simmer for 8–10 minutes until sauce is rich." },
      { number: 5, step: "Serve with basmati rice and naan, garnished with fresh cilantro." },
    ],
  },
  {
    id: 9000027,
    title: "Butter Chicken",
    minutes: 40, servings: 4, calories: 530,
    tags: ["indian", "chicken", "curry", "main-course", "meal-prep", "gluten-free"],
    ingredients: [
      { name: "chicken thighs", raw: "700g boneless chicken thighs, cubed", amount: 700, unit: "g" },
      { name: "canned tomatoes", raw: "400g canned tomatoes, blended", amount: 400, unit: "g" },
      { name: "heavy cream", raw: "150ml heavy cream", amount: 150, unit: "ml" },
      { name: "butter", raw: "3 tbsp butter", amount: 3, unit: "tbsp" },
      { name: "onion", raw: "1 onion, diced", amount: 1, unit: "whole" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "ginger", raw: "1 tbsp ginger, grated", amount: 1, unit: "tbsp" },
      { name: "garam masala", raw: "2 tsp garam masala", amount: 2, unit: "tsp" },
      { name: "cumin", raw: "1 tsp cumin", amount: 1, unit: "tsp" },
      { name: "turmeric", raw: "½ tsp turmeric", amount: 0.5, unit: "tsp" },
      { name: "honey", raw: "1 tsp honey", amount: 1, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Melt butter in a large pan. Cook onion until golden, about 8 minutes. Add garlic, ginger, and spices; cook 2 minutes." },
      { number: 2, step: "Add chicken and sear for 4–5 minutes until lightly browned." },
      { number: 3, step: "Pour in blended tomatoes. Simmer 15 minutes until chicken is cooked through." },
      { number: 4, step: "Stir in cream and honey. Simmer gently for 5 minutes until sauce thickens." },
      { number: 5, step: "Serve over basmati rice. The flavour improves significantly the next day." },
    ],
  },
  {
    id: 9000028,
    title: "Chicken Alfredo",
    minutes: 30, servings: 4, calories: 650,
    tags: ["italian", "chicken", "pasta", "main-course", "meal-prep", "quick"],
    ingredients: [
      { name: "fettuccine", raw: "400g fettuccine", amount: 400, unit: "g" },
      { name: "chicken breast", raw: "500g chicken breast, sliced", amount: 500, unit: "g" },
      { name: "heavy cream", raw: "250ml heavy cream", amount: 250, unit: "ml" },
      { name: "parmesan", raw: "100g parmesan, grated", amount: 100, unit: "g" },
      { name: "butter", raw: "3 tbsp butter", amount: 3, unit: "tbsp" },
      { name: "garlic", raw: "3 cloves garlic, minced", amount: 3, unit: "cloves" },
      { name: "olive oil", raw: "1 tbsp olive oil", amount: 1, unit: "tbsp" },
      { name: "salt", raw: "1 tsp salt", amount: 1, unit: "tsp" },
      { name: "black pepper", raw: "½ tsp black pepper", amount: 0.5, unit: "tsp" },
      { name: "fresh parsley", raw: "2 tbsp fresh parsley, chopped", amount: 2, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Cook fettuccine in salted water until al dente. Reserve ½ cup pasta water. Drain." },
      { number: 2, step: "Season and cook chicken in olive oil over medium-high heat, 4–5 minutes per side. Slice and set aside." },
      { number: 3, step: "In the same pan melt butter, sauté garlic 1 minute. Add cream and simmer 3–4 minutes until slightly reduced." },
      { number: 4, step: "Remove from heat. Stir in parmesan until melted. Add pasta water if sauce is too thick." },
      { number: 5, step: "Toss in fettuccine and chicken. Plate and garnish with parsley and extra parmesan." },
    ],
  },
  {
    id: 9000029,
    title: "Beef Stew",
    minutes: 90, servings: 6, calories: 490,
    tags: ["american", "beef", "stew", "main-course", "meal-prep", "gluten-free"],
    ingredients: [
      { name: "beef chuck", raw: "800g beef chuck, cut into 3cm cubes", amount: 800, unit: "g" },
      { name: "potatoes", raw: "400g potatoes, cubed", amount: 400, unit: "g" },
      { name: "carrots", raw: "3 carrots, chopped", amount: 3, unit: "whole" },
      { name: "onion", raw: "1 large onion, diced", amount: 1, unit: "whole" },
      { name: "garlic", raw: "3 cloves garlic, minced", amount: 3, unit: "cloves" },
      { name: "beef broth", raw: "600ml beef broth", amount: 600, unit: "ml" },
      { name: "tomato paste", raw: "2 tbsp tomato paste", amount: 2, unit: "tbsp" },
      { name: "Worcestershire sauce", raw: "1 tbsp Worcestershire sauce", amount: 1, unit: "tbsp" },
      { name: "fresh thyme", raw: "3 sprigs fresh thyme", amount: 3, unit: "sprigs" },
      { name: "bay leaves", raw: "2 bay leaves", amount: 2, unit: "whole" },
      { name: "olive oil", raw: "2 tbsp olive oil", amount: 2, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Season beef with salt and pepper. Sear in batches in olive oil over high heat until browned on all sides. Set aside." },
      { number: 2, step: "In the same pot, cook onion and garlic for 5 minutes. Add tomato paste and cook 2 minutes." },
      { number: 3, step: "Return beef to pot. Add broth, Worcestershire, thyme, and bay leaves. Bring to a boil." },
      { number: 4, step: "Reduce heat, cover, and simmer for 45 minutes. Add potatoes and carrots, cook 30 more minutes until tender." },
      { number: 5, step: "Remove bay leaves and thyme. Adjust seasoning. Serve with crusty bread or over mashed potatoes." },
    ],
  },
  {
    id: 9000030,
    title: "Chicken Pot Pie",
    minutes: 60, servings: 6, calories: 540,
    tags: ["american", "chicken", "baked", "main-course", "meal-prep"],
    ingredients: [
      { name: "cooked chicken", raw: "400g cooked chicken, shredded", amount: 400, unit: "g" },
      { name: "pie crust", raw: "2 sheets ready-made pie crust", amount: 2, unit: "sheets" },
      { name: "frozen peas and carrots", raw: "1 cup frozen peas and carrots", amount: 1, unit: "cup" },
      { name: "celery", raw: "2 stalks celery, sliced", amount: 2, unit: "stalks" },
      { name: "onion", raw: "1 onion, diced", amount: 1, unit: "whole" },
      { name: "chicken broth", raw: "300ml chicken broth", amount: 300, unit: "ml" },
      { name: "whole milk", raw: "150ml whole milk", amount: 150, unit: "ml" },
      { name: "flour", raw: "3 tbsp flour", amount: 3, unit: "tbsp" },
      { name: "butter", raw: "3 tbsp butter", amount: 3, unit: "tbsp" },
      { name: "dried thyme", raw: "½ tsp dried thyme", amount: 0.5, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 200°C. Melt butter in a large skillet. Cook onion and celery for 5 minutes until softened." },
      { number: 2, step: "Whisk in flour and cook 1 minute. Gradually add broth and milk, stirring until smooth and thick." },
      { number: 3, step: "Stir in chicken, peas, carrots, and thyme. Season well. Remove from heat." },
      { number: 4, step: "Line a 9-inch pie dish with one crust. Fill with chicken mixture. Top with second crust, crimp edges, and cut a few vents." },
      { number: 5, step: "Bake for 30–35 minutes until crust is golden brown. Rest 5 minutes before serving." },
    ],
  },
  {
    id: 9000031,
    title: "Chicken Fried Rice",
    minutes: 25, servings: 4, calories: 480,
    tags: ["asian-inspired", "chicken", "rice", "main-course", "meal-prep", "quick"],
    ingredients: [
      { name: "cooked day-old rice", raw: "3 cups cooked day-old rice", amount: 3, unit: "cups" },
      { name: "chicken breast", raw: "300g chicken breast, diced", amount: 300, unit: "g" },
      { name: "eggs", raw: "3 eggs, beaten", amount: 3, unit: "whole" },
      { name: "frozen peas and carrots", raw: "1 cup frozen peas and carrots", amount: 1, unit: "cup" },
      { name: "soy sauce", raw: "3 tbsp soy sauce", amount: 3, unit: "tbsp" },
      { name: "sesame oil", raw: "1 tbsp sesame oil", amount: 1, unit: "tbsp" },
      { name: "garlic", raw: "3 cloves garlic, minced", amount: 3, unit: "cloves" },
      { name: "scallions", raw: "3 scallions, sliced", amount: 3, unit: "stalks" },
      { name: "vegetable oil", raw: "2 tbsp vegetable oil", amount: 2, unit: "tbsp" },
      { name: "oyster sauce", raw: "1 tbsp oyster sauce", amount: 1, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Heat oil in a wok over high heat. Cook chicken until golden, about 4 minutes. Set aside." },
      { number: 2, step: "Add garlic and stir-fry 30 seconds. Push to one side, scramble eggs in the wok until just set." },
      { number: 3, step: "Add peas and carrots, stir-fry 1 minute." },
      { number: 4, step: "Add cold rice, breaking up clumps. Stir-fry 3–4 minutes until heated through and slightly crispy." },
      { number: 5, step: "Return chicken to wok. Add soy sauce, oyster sauce, and sesame oil. Toss well. Top with scallions." },
    ],
  },
  {
    id: 9000032,
    title: "Beef Tacos",
    minutes: 25, servings: 4, calories: 420,
    tags: ["mexican", "beef", "main-course", "meal-prep", "quick"],
    ingredients: [
      { name: "ground beef", raw: "500g ground beef", amount: 500, unit: "g" },
      { name: "taco shells", raw: "8 taco shells or small tortillas", amount: 8, unit: "whole" },
      { name: "onion", raw: "1 onion, diced", amount: 1, unit: "whole" },
      { name: "garlic", raw: "3 cloves garlic, minced", amount: 3, unit: "cloves" },
      { name: "cumin", raw: "2 tsp cumin", amount: 2, unit: "tsp" },
      { name: "chili powder", raw: "1 tsp chili powder", amount: 1, unit: "tsp" },
      { name: "smoked paprika", raw: "1 tsp smoked paprika", amount: 1, unit: "tsp" },
      { name: "shredded lettuce", raw: "2 cups shredded lettuce", amount: 2, unit: "cups" },
      { name: "cheddar cheese", raw: "100g cheddar cheese, shredded", amount: 100, unit: "g" },
      { name: "sour cream", raw: "½ cup sour cream", amount: 0.5, unit: "cup" },
      { name: "salsa", raw: "½ cup salsa", amount: 0.5, unit: "cup" },
    ],
    steps: [
      { number: 1, step: "Cook onion in a skillet over medium heat for 5 minutes. Add garlic and cook 1 minute." },
      { number: 2, step: "Add ground beef, breaking it up, and cook until browned. Drain excess fat." },
      { number: 3, step: "Add cumin, chili powder, and paprika. Stir well and cook 2 minutes. Add a splash of water and simmer until absorbed." },
      { number: 4, step: "Warm taco shells. Fill with beef mixture, then top with lettuce, cheese, sour cream, and salsa." },
      { number: 5, step: "Store taco filling separately to keep shells crisp." },
    ],
  },
  {
    id: 9000033,
    title: "Chicken Enchiladas",
    minutes: 45, servings: 4, calories: 510,
    tags: ["mexican", "chicken", "baked", "main-course", "meal-prep"],
    ingredients: [
      { name: "cooked chicken", raw: "400g cooked chicken, shredded", amount: 400, unit: "g" },
      { name: "flour tortillas", raw: "8 flour tortillas", amount: 8, unit: "whole" },
      { name: "enchilada sauce", raw: "400ml red enchilada sauce", amount: 400, unit: "ml" },
      { name: "cheddar cheese", raw: "200g cheddar cheese, shredded", amount: 200, unit: "g" },
      { name: "onion", raw: "1 onion, diced", amount: 1, unit: "whole" },
      { name: "garlic", raw: "2 cloves garlic, minced", amount: 2, unit: "cloves" },
      { name: "cumin", raw: "1 tsp cumin", amount: 1, unit: "tsp" },
      { name: "chili powder", raw: "1 tsp chili powder", amount: 1, unit: "tsp" },
      { name: "sour cream", raw: "sour cream to serve", amount: 0, unit: "" },
      { name: "fresh cilantro", raw: "fresh cilantro to serve", amount: 0, unit: "" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 190°C. Mix shredded chicken with onion, garlic, cumin, chili powder, and half the enchilada sauce." },
      { number: 2, step: "Spread ¼ of the remaining sauce in the bottom of a 9×13 baking dish." },
      { number: 3, step: "Fill each tortilla with chicken mixture and half the cheese. Roll up and place seam-side down in the dish." },
      { number: 4, step: "Pour remaining sauce over the top. Sprinkle with remaining cheese." },
      { number: 5, step: "Bake 20–25 minutes until bubbly. Serve with sour cream and cilantro." },
    ],
  },
  {
    id: 9000034,
    title: "Shepherd's Pie",
    minutes: 60, servings: 6, calories: 490,
    tags: ["british", "lamb", "baked", "main-course", "meal-prep"],
    ingredients: [
      { name: "ground lamb", raw: "600g ground lamb", amount: 600, unit: "g" },
      { name: "potatoes", raw: "800g potatoes, peeled and chopped", amount: 800, unit: "g" },
      { name: "onion", raw: "1 large onion, diced", amount: 1, unit: "whole" },
      { name: "carrots", raw: "2 carrots, diced", amount: 2, unit: "whole" },
      { name: "frozen peas", raw: "1 cup frozen peas", amount: 1, unit: "cup" },
      { name: "garlic", raw: "3 cloves garlic, minced", amount: 3, unit: "cloves" },
      { name: "tomato paste", raw: "2 tbsp tomato paste", amount: 2, unit: "tbsp" },
      { name: "beef broth", raw: "200ml beef broth", amount: 200, unit: "ml" },
      { name: "Worcestershire sauce", raw: "1 tbsp Worcestershire sauce", amount: 1, unit: "tbsp" },
      { name: "butter", raw: "3 tbsp butter", amount: 3, unit: "tbsp" },
      { name: "milk", raw: "80ml milk", amount: 80, unit: "ml" },
    ],
    steps: [
      { number: 1, step: "Boil potatoes until tender, drain, and mash with butter and milk until smooth. Season well." },
      { number: 2, step: "Preheat oven to 200°C. Brown lamb with onion, garlic, and carrots until meat is cooked through." },
      { number: 3, step: "Add tomato paste, broth, Worcestershire sauce, and peas. Simmer 10 minutes until thickened." },
      { number: 4, step: "Transfer filling to a baking dish. Spoon mashed potato over the top and rough up with a fork." },
      { number: 5, step: "Bake 25–30 minutes until golden and bubbling at the edges." },
    ],
  },
  {
    id: 9000035,
    title: "Honey Garlic Chicken",
    minutes: 25, servings: 4, calories: 410,
    tags: ["asian-inspired", "chicken", "main-course", "meal-prep", "quick", "gluten-free"],
    ingredients: [
      { name: "chicken thighs", raw: "600g boneless chicken thighs", amount: 600, unit: "g" },
      { name: "honey", raw: "3 tbsp honey", amount: 3, unit: "tbsp" },
      { name: "garlic", raw: "5 cloves garlic, minced", amount: 5, unit: "cloves" },
      { name: "soy sauce", raw: "2 tbsp soy sauce", amount: 2, unit: "tbsp" },
      { name: "rice vinegar", raw: "1 tbsp rice vinegar", amount: 1, unit: "tbsp" },
      { name: "butter", raw: "1 tbsp butter", amount: 1, unit: "tbsp" },
      { name: "olive oil", raw: "1 tbsp olive oil", amount: 1, unit: "tbsp" },
      { name: "cornstarch", raw: "1 tsp cornstarch", amount: 1, unit: "tsp" },
      { name: "scallions", raw: "2 scallions, sliced to garnish", amount: 2, unit: "stalks" },
      { name: "sesame seeds", raw: "1 tsp sesame seeds to garnish", amount: 1, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Season chicken with salt and pepper. Sear in olive oil over medium-high heat, 5–6 minutes per side until cooked through. Remove and set aside." },
      { number: 2, step: "Melt butter in the same pan. Sauté garlic for 1 minute until fragrant." },
      { number: 3, step: "Whisk honey, soy sauce, rice vinegar, and cornstarch together. Pour into pan and simmer 2–3 minutes until thickened." },
      { number: 4, step: "Return chicken to pan and coat in the sauce, cooking 1–2 more minutes." },
      { number: 5, step: "Garnish with scallions and sesame seeds. Serve over steamed rice or with stir-fried vegetables." },
    ],
  },
  {
    id: 9000036,
    title: "Stuffed Bell Peppers",
    minutes: 50, servings: 4, calories: 450,
    tags: ["american", "beef", "baked", "main-course", "meal-prep", "gluten-free"],
    ingredients: [
      { name: "bell peppers", raw: "4 large bell peppers, tops cut and cored", amount: 4, unit: "whole" },
      { name: "ground beef", raw: "400g ground beef", amount: 400, unit: "g" },
      { name: "cooked rice", raw: "1 cup cooked rice", amount: 1, unit: "cup" },
      { name: "canned diced tomatoes", raw: "400g canned diced tomatoes", amount: 400, unit: "g" },
      { name: "onion", raw: "1 onion, diced", amount: 1, unit: "whole" },
      { name: "garlic", raw: "2 cloves garlic, minced", amount: 2, unit: "cloves" },
      { name: "mozzarella", raw: "100g mozzarella, shredded", amount: 100, unit: "g" },
      { name: "tomato paste", raw: "1 tbsp tomato paste", amount: 1, unit: "tbsp" },
      { name: "Italian seasoning", raw: "1 tsp Italian seasoning", amount: 1, unit: "tsp" },
      { name: "olive oil", raw: "1 tbsp olive oil", amount: 1, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 190°C. Cut tops off peppers and remove seeds. Blanch in boiling water for 3 minutes, drain and set in a baking dish." },
      { number: 2, step: "Brown beef with onion and garlic in olive oil. Add tomato paste, diced tomatoes, and Italian seasoning. Cook 5 minutes." },
      { number: 3, step: "Stir in cooked rice. Season generously with salt and pepper." },
      { number: 4, step: "Fill each pepper tightly with the beef mixture. Top with mozzarella." },
      { number: 5, step: "Cover with foil and bake 25 minutes. Uncover and bake 10 more minutes until cheese is golden." },
    ],
  },
  {
    id: 9000037,
    title: "Meatballs in Tomato Sauce",
    minutes: 45, servings: 4, calories: 470,
    tags: ["italian", "beef", "main-course", "meal-prep"],
    ingredients: [
      { name: "ground beef", raw: "500g ground beef", amount: 500, unit: "g" },
      { name: "canned crushed tomatoes", raw: "800g canned crushed tomatoes", amount: 800, unit: "g" },
      { name: "breadcrumbs", raw: "50g breadcrumbs", amount: 50, unit: "g" },
      { name: "egg", raw: "1 egg", amount: 1, unit: "whole" },
      { name: "parmesan", raw: "40g parmesan, grated", amount: 40, unit: "g" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "onion", raw: "1 onion, finely grated", amount: 1, unit: "whole" },
      { name: "fresh parsley", raw: "2 tbsp fresh parsley, chopped", amount: 2, unit: "tbsp" },
      { name: "olive oil", raw: "2 tbsp olive oil", amount: 2, unit: "tbsp" },
      { name: "dried oregano", raw: "1 tsp dried oregano", amount: 1, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Combine beef, breadcrumbs, egg, parmesan, half the garlic, onion, and parsley. Mix well and roll into golf ball-sized meatballs." },
      { number: 2, step: "Brown meatballs in olive oil over medium-high heat, about 3 minutes per side. They don't need to be cooked through. Remove." },
      { number: 3, step: "Sauté remaining garlic in the same pan 1 minute. Add crushed tomatoes and oregano. Simmer 10 minutes." },
      { number: 4, step: "Return meatballs to the sauce. Simmer covered on low heat for 20 minutes." },
      { number: 5, step: "Serve over spaghetti or polenta with extra parmesan and fresh basil." },
    ],
  },
  {
    id: 9000038,
    title: "Chicken Curry",
    minutes: 40, servings: 4, calories: 490,
    tags: ["indian", "chicken", "curry", "main-course", "meal-prep", "gluten-free"],
    ingredients: [
      { name: "chicken thighs", raw: "700g boneless chicken thighs, cubed", amount: 700, unit: "g" },
      { name: "canned coconut milk", raw: "400ml coconut milk", amount: 400, unit: "ml" },
      { name: "onion", raw: "1 large onion, diced", amount: 1, unit: "whole" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "ginger", raw: "1 tbsp fresh ginger, grated", amount: 1, unit: "tbsp" },
      { name: "curry powder", raw: "2 tbsp curry powder", amount: 2, unit: "tbsp" },
      { name: "canned diced tomatoes", raw: "400g canned diced tomatoes", amount: 400, unit: "g" },
      { name: "spinach", raw: "2 cups baby spinach", amount: 2, unit: "cups" },
      { name: "vegetable oil", raw: "2 tbsp vegetable oil", amount: 2, unit: "tbsp" },
      { name: "fresh cilantro", raw: "¼ cup cilantro to serve", amount: 0.25, unit: "cup" },
    ],
    steps: [
      { number: 1, step: "Heat oil in a large pan. Cook onion for 8 minutes until golden. Add garlic, ginger, and curry powder; cook 2 minutes." },
      { number: 2, step: "Add chicken and sear 4 minutes until lightly browned." },
      { number: 3, step: "Add diced tomatoes and coconut milk. Bring to a boil." },
      { number: 4, step: "Reduce heat and simmer uncovered for 20 minutes until sauce thickens." },
      { number: 5, step: "Stir in spinach until wilted. Serve over basmati rice, garnished with cilantro." },
    ],
  },
  {
    id: 9000039,
    title: "Beef Chili",
    minutes: 50, servings: 6, calories: 430,
    tags: ["american", "beef", "main-course", "meal-prep", "gluten-free", "high-protein"],
    ingredients: [
      { name: "ground beef", raw: "600g ground beef", amount: 600, unit: "g" },
      { name: "canned kidney beans", raw: "2 cans (800g) kidney beans, drained", amount: 800, unit: "g" },
      { name: "canned crushed tomatoes", raw: "800g canned crushed tomatoes", amount: 800, unit: "g" },
      { name: "onion", raw: "1 large onion, diced", amount: 1, unit: "whole" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "bell pepper", raw: "1 bell pepper, diced", amount: 1, unit: "whole" },
      { name: "cumin", raw: "2 tsp cumin", amount: 2, unit: "tsp" },
      { name: "chili powder", raw: "2 tsp chili powder", amount: 2, unit: "tsp" },
      { name: "smoked paprika", raw: "1 tsp smoked paprika", amount: 1, unit: "tsp" },
      { name: "beef broth", raw: "200ml beef broth", amount: 200, unit: "ml" },
    ],
    steps: [
      { number: 1, step: "Brown ground beef in a large pot over medium-high heat. Drain excess fat. Remove and set aside." },
      { number: 2, step: "Sauté onion and bell pepper in the same pot for 5 minutes. Add garlic and spices; cook 1 minute." },
      { number: 3, step: "Return beef to pot. Add crushed tomatoes, broth, and beans. Stir well." },
      { number: 4, step: "Bring to a boil, then reduce heat and simmer uncovered for 30 minutes, stirring occasionally." },
      { number: 5, step: "Serve topped with cheddar cheese, sour cream, and green onions." },
    ],
  },
  {
    id: 9000040,
    title: "Banana Bread",
    minutes: 65, servings: 10, calories: 210,
    tags: ["baking", "breakfast", "snack", "vegetarian", "meal-prep"],
    ingredients: [
      { name: "ripe bananas", raw: "3 very ripe bananas, mashed", amount: 3, unit: "whole" },
      { name: "flour", raw: "1½ cups all-purpose flour", amount: 1.5, unit: "cups" },
      { name: "sugar", raw: "¾ cup sugar", amount: 0.75, unit: "cups" },
      { name: "butter", raw: "⅓ cup melted butter", amount: 0.33, unit: "cups" },
      { name: "egg", raw: "1 egg, beaten", amount: 1, unit: "whole" },
      { name: "baking soda", raw: "1 tsp baking soda", amount: 1, unit: "tsp" },
      { name: "salt", raw: "pinch of salt", amount: 1, unit: "pinch" },
      { name: "vanilla extract", raw: "1 tsp vanilla extract", amount: 1, unit: "tsp" },
      { name: "walnuts", raw: "½ cup walnuts, chopped (optional)", amount: 0.5, unit: "cups" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 175°C. Grease a 9×5 loaf pan." },
      { number: 2, step: "Mix mashed banana with melted butter in a large bowl." },
      { number: 3, step: "Stir in sugar, beaten egg, and vanilla. Add baking soda and salt, mix well." },
      { number: 4, step: "Fold in flour until just combined — do not overmix. Fold in walnuts if using." },
      { number: 5, step: "Pour into loaf pan and bake 55–60 minutes until a toothpick comes out clean. Cool in pan 10 minutes before slicing." },
    ],
  },
  {
    id: 9000041,
    title: "Beef Stir Fry",
    minutes: 25, servings: 4, calories: 440,
    tags: ["asian-inspired", "beef", "main-course", "meal-prep", "quick"],
    ingredients: [
      { name: "beef sirloin", raw: "500g beef sirloin, thinly sliced", amount: 500, unit: "g" },
      { name: "broccoli", raw: "2 cups broccoli florets", amount: 2, unit: "cups" },
      { name: "bell pepper", raw: "1 bell pepper, sliced", amount: 1, unit: "whole" },
      { name: "snap peas", raw: "1 cup snap peas", amount: 1, unit: "cup" },
      { name: "garlic", raw: "3 cloves garlic, minced", amount: 3, unit: "cloves" },
      { name: "ginger", raw: "1 tsp ginger, grated", amount: 1, unit: "tsp" },
      { name: "soy sauce", raw: "3 tbsp soy sauce", amount: 3, unit: "tbsp" },
      { name: "oyster sauce", raw: "2 tbsp oyster sauce", amount: 2, unit: "tbsp" },
      { name: "sesame oil", raw: "1 tsp sesame oil", amount: 1, unit: "tsp" },
      { name: "vegetable oil", raw: "2 tbsp vegetable oil", amount: 2, unit: "tbsp" },
      { name: "cornstarch", raw: "1 tsp cornstarch", amount: 1, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Toss beef with soy sauce and cornstarch. Set aside 10 minutes." },
      { number: 2, step: "Heat oil in a wok over high heat until smoking. Sear beef in batches for 1–2 minutes until browned. Remove." },
      { number: 3, step: "Add garlic and ginger to wok, stir-fry 30 seconds. Add broccoli, pepper, and snap peas. Cook 3–4 minutes." },
      { number: 4, step: "Return beef to wok. Add oyster sauce and sesame oil. Toss everything together over high heat for 1 minute." },
      { number: 5, step: "Serve immediately over steamed rice or noodles." },
    ],
  },
  {
    id: 9000042,
    title: "Creamy Tomato Pasta",
    minutes: 25, servings: 4, calories: 520,
    tags: ["italian", "vegetarian", "pasta", "main-course", "meal-prep", "quick"],
    ingredients: [
      { name: "penne pasta", raw: "400g penne pasta", amount: 400, unit: "g" },
      { name: "canned crushed tomatoes", raw: "400g canned crushed tomatoes", amount: 400, unit: "g" },
      { name: "heavy cream", raw: "150ml heavy cream", amount: 150, unit: "ml" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "onion", raw: "1 onion, diced", amount: 1, unit: "whole" },
      { name: "tomato paste", raw: "2 tbsp tomato paste", amount: 2, unit: "tbsp" },
      { name: "butter", raw: "2 tbsp butter", amount: 2, unit: "tbsp" },
      { name: "parmesan", raw: "60g parmesan, grated", amount: 60, unit: "g" },
      { name: "fresh basil", raw: "handful of fresh basil", amount: 0.5, unit: "cups" },
      { name: "red pepper flakes", raw: "½ tsp red pepper flakes", amount: 0.5, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Cook pasta in salted water until al dente. Reserve ½ cup pasta water. Drain." },
      { number: 2, step: "Melt butter in a large skillet. Cook onion for 5 minutes until soft. Add garlic and red pepper flakes, cook 1 minute." },
      { number: 3, step: "Add tomato paste and cook 2 minutes. Add crushed tomatoes and simmer 8 minutes until thickened." },
      { number: 4, step: "Stir in cream and simmer 3 minutes. Toss in pasta with a splash of pasta water to coat." },
      { number: 5, step: "Remove from heat. Stir in parmesan and torn basil. Serve immediately." },
    ],
  },
  {
    id: 9000043,
    title: "White Chicken Chili",
    minutes: 40, servings: 6, calories: 410,
    tags: ["american", "chicken", "soup", "main-course", "meal-prep", "gluten-free", "high-protein"],
    ingredients: [
      { name: "cooked chicken", raw: "400g cooked chicken, shredded", amount: 400, unit: "g" },
      { name: "canned white beans", raw: "2 cans (800g) white beans, drained", amount: 800, unit: "g" },
      { name: "chicken broth", raw: "700ml chicken broth", amount: 700, unit: "ml" },
      { name: "green chiles", raw: "2 cans (200g) diced green chiles", amount: 200, unit: "g" },
      { name: "onion", raw: "1 onion, diced", amount: 1, unit: "whole" },
      { name: "garlic", raw: "3 cloves garlic, minced", amount: 3, unit: "cloves" },
      { name: "cumin", raw: "2 tsp cumin", amount: 2, unit: "tsp" },
      { name: "oregano", raw: "1 tsp oregano", amount: 1, unit: "tsp" },
      { name: "heavy cream", raw: "100ml heavy cream", amount: 100, unit: "ml" },
      { name: "olive oil", raw: "1 tbsp olive oil", amount: 1, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Sauté onion in olive oil for 5 minutes. Add garlic, cumin, and oregano; cook 1 minute." },
      { number: 2, step: "Add green chiles, white beans, and chicken broth. Bring to a boil." },
      { number: 3, step: "Mash about ¼ of the beans with a fork or potato masher to thicken the chili." },
      { number: 4, step: "Add shredded chicken and cream. Simmer 10 minutes until flavours meld." },
      { number: 5, step: "Serve topped with shredded cheese, sour cream, and sliced jalapeños." },
    ],
  },
  {
    id: 9000044,
    title: "Lemon Garlic Shrimp Pasta",
    minutes: 25, servings: 4, calories: 490,
    tags: ["italian", "seafood", "pasta", "main-course", "meal-prep", "quick"],
    ingredients: [
      { name: "linguine", raw: "400g linguine", amount: 400, unit: "g" },
      { name: "shrimp", raw: "400g large shrimp, peeled and deveined", amount: 400, unit: "g" },
      { name: "garlic", raw: "5 cloves garlic, minced", amount: 5, unit: "cloves" },
      { name: "lemon", raw: "1 lemon, juiced and zested", amount: 1, unit: "whole" },
      { name: "butter", raw: "3 tbsp butter", amount: 3, unit: "tbsp" },
      { name: "olive oil", raw: "2 tbsp olive oil", amount: 2, unit: "tbsp" },
      { name: "white wine", raw: "80ml dry white wine", amount: 80, unit: "ml" },
      { name: "red pepper flakes", raw: "½ tsp red pepper flakes", amount: 0.5, unit: "tsp" },
      { name: "fresh parsley", raw: "¼ cup fresh parsley, chopped", amount: 0.25, unit: "cups" },
      { name: "parmesan", raw: "parmesan to serve", amount: 0, unit: "" },
    ],
    steps: [
      { number: 1, step: "Cook linguine in salted water until al dente. Reserve ½ cup pasta water. Drain." },
      { number: 2, step: "Heat olive oil in a large skillet. Cook shrimp 1–2 minutes per side until pink. Remove." },
      { number: 3, step: "Melt butter in the same pan. Add garlic and red pepper flakes, cook 1 minute. Add wine and lemon juice, simmer 2 minutes." },
      { number: 4, step: "Return shrimp to pan. Add pasta and enough pasta water to make a light sauce. Toss well." },
      { number: 5, step: "Add lemon zest and parsley. Serve immediately with parmesan." },
    ],
  },
  {
    id: 9000045,
    title: "Pesto Chicken Pasta",
    minutes: 25, servings: 4, calories: 560,
    tags: ["italian", "chicken", "pasta", "main-course", "meal-prep", "quick"],
    ingredients: [
      { name: "penne or fusilli", raw: "400g penne or fusilli", amount: 400, unit: "g" },
      { name: "chicken breast", raw: "400g chicken breast, diced", amount: 400, unit: "g" },
      { name: "basil pesto", raw: "6 tbsp basil pesto", amount: 6, unit: "tbsp" },
      { name: "cherry tomatoes", raw: "200g cherry tomatoes, halved", amount: 200, unit: "g" },
      { name: "parmesan", raw: "60g parmesan, grated", amount: 60, unit: "g" },
      { name: "olive oil", raw: "2 tbsp olive oil", amount: 2, unit: "tbsp" },
      { name: "garlic", raw: "2 cloves garlic, minced", amount: 2, unit: "cloves" },
      { name: "lemon juice", raw: "1 tbsp lemon juice", amount: 1, unit: "tbsp" },
      { name: "fresh basil", raw: "fresh basil to serve", amount: 0.25, unit: "cups" },
      { name: "pine nuts", raw: "2 tbsp pine nuts, toasted", amount: 2, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Cook pasta in salted water until al dente. Reserve ¼ cup pasta water. Drain." },
      { number: 2, step: "Cook chicken in olive oil with garlic over medium-high heat until golden and cooked through, about 6 minutes." },
      { number: 3, step: "In a large bowl, toss hot pasta with pesto, lemon juice, and pasta water to loosen." },
      { number: 4, step: "Add chicken and cherry tomatoes. Toss well." },
      { number: 5, step: "Plate and top with parmesan, pine nuts, and fresh basil." },
    ],
  },
  {
    id: 9000046,
    title: "Teriyaki Salmon Bowl",
    minutes: 25, servings: 2, calories: 520,
    tags: ["japanese", "seafood", "rice", "main-course", "meal-prep", "quick", "gluten-free"],
    ingredients: [
      { name: "salmon fillets", raw: "2 salmon fillets (about 300g)", amount: 300, unit: "g" },
      { name: "soy sauce", raw: "3 tbsp soy sauce", amount: 3, unit: "tbsp" },
      { name: "mirin", raw: "2 tbsp mirin", amount: 2, unit: "tbsp" },
      { name: "honey", raw: "1 tbsp honey", amount: 1, unit: "tbsp" },
      { name: "jasmine rice", raw: "1.5 cups jasmine rice", amount: 1.5, unit: "cups" },
      { name: "edamame", raw: "½ cup shelled edamame", amount: 0.5, unit: "cups" },
      { name: "avocado", raw: "1 avocado, sliced", amount: 1, unit: "whole" },
      { name: "cucumber", raw: "½ cucumber, sliced", amount: 0.5, unit: "whole" },
      { name: "sesame seeds", raw: "1 tsp sesame seeds", amount: 1, unit: "tsp" },
      { name: "sesame oil", raw: "1 tsp sesame oil", amount: 1, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Mix soy sauce, mirin, and honey for the teriyaki sauce." },
      { number: 2, step: "Cook jasmine rice. Pan-fry salmon in sesame oil over medium-high heat, 3 minutes per side." },
      { number: 3, step: "Pour teriyaki sauce over salmon and let it reduce and glaze, about 2 minutes." },
      { number: 4, step: "Assemble bowls: rice, glazed salmon, edamame, avocado, and cucumber." },
      { number: 5, step: "Drizzle any remaining teriyaki sauce over the bowl and garnish with sesame seeds." },
    ],
  },
  {
    id: 9000047,
    title: "Braised Short Ribs",
    minutes: 180, servings: 4, calories: 680,
    tags: ["american", "beef", "braised", "main-course", "meal-prep"],
    ingredients: [
      { name: "beef short ribs", raw: "1.2kg bone-in beef short ribs", amount: 1200, unit: "g" },
      { name: "red wine", raw: "250ml red wine", amount: 250, unit: "ml" },
      { name: "beef broth", raw: "400ml beef broth", amount: 400, unit: "ml" },
      { name: "onion", raw: "1 large onion, diced", amount: 1, unit: "whole" },
      { name: "carrots", raw: "2 carrots, diced", amount: 2, unit: "whole" },
      { name: "celery", raw: "2 stalks celery, diced", amount: 2, unit: "stalks" },
      { name: "garlic", raw: "4 cloves garlic, smashed", amount: 4, unit: "cloves" },
      { name: "tomato paste", raw: "2 tbsp tomato paste", amount: 2, unit: "tbsp" },
      { name: "fresh thyme", raw: "4 sprigs fresh thyme", amount: 4, unit: "sprigs" },
      { name: "bay leaves", raw: "2 bay leaves", amount: 2, unit: "whole" },
      { name: "olive oil", raw: "2 tbsp olive oil", amount: 2, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 160°C. Season short ribs generously. Sear in olive oil over high heat until deeply browned on all sides, about 8 minutes. Remove." },
      { number: 2, step: "In the same pot, cook onion, carrot, and celery for 5 minutes. Add garlic and tomato paste, cook 2 minutes." },
      { number: 3, step: "Pour in red wine, scraping up brown bits. Simmer 3 minutes. Add broth, thyme, and bay leaves." },
      { number: 4, step: "Return short ribs to the pot. The liquid should come halfway up the ribs. Cover and braise in oven for 2.5–3 hours until meat is very tender and falling off the bone." },
      { number: 5, step: "Remove ribs. Strain and reduce braising liquid until slightly thickened. Serve ribs over mashed potatoes with the sauce." },
    ],
  },
  {
    id: 9000048,
    title: "High Protein Overnight Oats",
    minutes: 10, servings: 1, calories: 380,
    tags: ["breakfast", "vegetarian", "high-protein", "meal-prep", "quick", "no-cook"],
    ingredients: [
      { name: "rolled oats", raw: "½ cup rolled oats", amount: 0.5, unit: "cups" },
      { name: "Greek yogurt", raw: "½ cup plain Greek yogurt", amount: 0.5, unit: "cups" },
      { name: "milk", raw: "½ cup milk of choice", amount: 0.5, unit: "cups" },
      { name: "chia seeds", raw: "1 tbsp chia seeds", amount: 1, unit: "tbsp" },
      { name: "protein powder", raw: "1 scoop vanilla protein powder", amount: 1, unit: "scoop" },
      { name: "honey", raw: "1 tsp honey", amount: 1, unit: "tsp" },
      { name: "vanilla extract", raw: "¼ tsp vanilla extract", amount: 0.25, unit: "tsp" },
      { name: "banana", raw: "½ banana, sliced", amount: 0.5, unit: "whole" },
      { name: "blueberries", raw: "¼ cup blueberries", amount: 0.25, unit: "cups" },
      { name: "almond butter", raw: "1 tbsp almond butter", amount: 1, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "In a jar or container, combine oats, yogurt, milk, chia seeds, protein powder, honey, and vanilla. Stir well." },
      { number: 2, step: "Seal and refrigerate overnight or for at least 4 hours." },
      { number: 3, step: "In the morning, give it a stir. Add a splash more milk if too thick." },
      { number: 4, step: "Top with banana slices, blueberries, and a drizzle of almond butter." },
      { number: 5, step: "Can be prepped up to 4 days in advance. Keep toppings separate until ready to eat." },
    ],
  },
  {
    id: 9000049,
    title: "Tuna Noodle Casserole",
    minutes: 40, servings: 6, calories: 480,
    tags: ["american", "seafood", "pasta", "baked", "main-course", "meal-prep"],
    ingredients: [
      { name: "egg noodles", raw: "300g egg noodles", amount: 300, unit: "g" },
      { name: "canned tuna", raw: "2 cans (340g) tuna in water, drained", amount: 340, unit: "g" },
      { name: "cream of mushroom soup", raw: "2 cans cream of mushroom soup", amount: 2, unit: "cans" },
      { name: "frozen peas", raw: "1 cup frozen peas", amount: 1, unit: "cups" },
      { name: "cheddar cheese", raw: "150g cheddar cheese, shredded", amount: 150, unit: "g" },
      { name: "milk", raw: "120ml milk", amount: 120, unit: "ml" },
      { name: "onion", raw: "½ onion, diced", amount: 0.5, unit: "whole" },
      { name: "celery", raw: "2 stalks celery, diced", amount: 2, unit: "stalks" },
      { name: "breadcrumbs", raw: "½ cup breadcrumbs", amount: 0.5, unit: "cups" },
      { name: "butter", raw: "2 tbsp butter, melted", amount: 2, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 180°C. Cook noodles until just al dente. Drain." },
      { number: 2, step: "Mix cream of mushroom soup with milk until smooth. Stir in tuna, peas, onion, celery, and half the cheese." },
      { number: 3, step: "Add noodles and stir to combine. Transfer to a greased 9×13 baking dish." },
      { number: 4, step: "Top with remaining cheese. Mix breadcrumbs with melted butter and sprinkle over the top." },
      { number: 5, step: "Bake 25–30 minutes until bubbly and topping is golden." },
    ],
  },
  {
    id: 9000050,
    title: "Philly Cheesesteak Bowl",
    minutes: 25, servings: 4, calories: 520,
    tags: ["american", "beef", "main-course", "meal-prep", "quick", "high-protein"],
    ingredients: [
      { name: "ribeye or sirloin steak", raw: "500g ribeye steak, very thinly sliced", amount: 500, unit: "g" },
      { name: "provolone cheese", raw: "100g provolone cheese, sliced", amount: 100, unit: "g" },
      { name: "green bell pepper", raw: "1 green bell pepper, sliced", amount: 1, unit: "whole" },
      { name: "onion", raw: "1 large onion, thinly sliced", amount: 1, unit: "whole" },
      { name: "mushrooms", raw: "200g mushrooms, sliced", amount: 200, unit: "g" },
      { name: "cooked rice or cauliflower rice", raw: "3 cups cooked rice", amount: 3, unit: "cups" },
      { name: "Worcestershire sauce", raw: "1 tbsp Worcestershire sauce", amount: 1, unit: "tbsp" },
      { name: "garlic powder", raw: "1 tsp garlic powder", amount: 1, unit: "tsp" },
      { name: "salt", raw: "1 tsp salt", amount: 1, unit: "tsp" },
      { name: "vegetable oil", raw: "2 tbsp vegetable oil", amount: 2, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Sauté onions and bell pepper in oil over medium-high heat for 5 minutes until softened and slightly charred. Add mushrooms, cook 3 more minutes. Remove." },
      { number: 2, step: "In the same pan over high heat, cook thin steak slices in batches — 1–2 minutes only. Season with garlic powder, salt, and Worcestershire sauce." },
      { number: 3, step: "Return vegetables to the pan and toss with beef." },
      { number: 4, step: "Place provolone slices on top, cover with a lid for 30 seconds until melted." },
      { number: 5, step: "Serve over rice bowls." },
    ],
  },
  {
    id: 9000051,
    title: "Pork Belly Rice Bowl",
    minutes: 90, servings: 4, calories: 680,
    tags: ["asian-inspired", "pork", "rice", "main-course", "meal-prep"],
    ingredients: [
      { name: "pork belly", raw: "600g pork belly, sliced into thick strips", amount: 600, unit: "g" },
      { name: "soy sauce", raw: "4 tbsp soy sauce", amount: 4, unit: "tbsp" },
      { name: "rice wine or sake", raw: "3 tbsp rice wine", amount: 3, unit: "tbsp" },
      { name: "brown sugar", raw: "2 tbsp brown sugar", amount: 2, unit: "tbsp" },
      { name: "garlic", raw: "4 cloves garlic, minced", amount: 4, unit: "cloves" },
      { name: "ginger", raw: "1 tbsp ginger, sliced", amount: 1, unit: "tbsp" },
      { name: "five spice powder", raw: "½ tsp five spice powder", amount: 0.5, unit: "tsp" },
      { name: "jasmine rice", raw: "2 cups jasmine rice", amount: 2, unit: "cups" },
      { name: "bok choy", raw: "2 baby bok choy, halved", amount: 2, unit: "whole" },
      { name: "soft-boiled eggs", raw: "2 soft-boiled eggs, halved", amount: 2, unit: "whole" },
    ],
    steps: [
      { number: 1, step: "Blanch pork belly in boiling water for 5 minutes. Drain and pat dry." },
      { number: 2, step: "Combine soy sauce, rice wine, brown sugar, garlic, ginger, and five spice. Add pork belly and marinate 30 minutes." },
      { number: 3, step: "Sear pork in a pan over high heat until caramelized on all sides. Add marinade and 100ml water. Braise covered on low heat for 40 minutes." },
      { number: 4, step: "Cook jasmine rice. Blanch bok choy in salted water for 2 minutes." },
      { number: 5, step: "Assemble bowls with rice, glazed pork belly, bok choy, and a soft-boiled egg. Spoon braising liquid over the top." },
    ],
  },
  {
    id: 9000052,
    title: "BLT (Bacon, Lettuce & Tomato)",
    minutes: 15, servings: 2, calories: 420,
    tags: ["american", "sandwich", "lunch", "meal-prep", "quick"],
    ingredients: [
      { name: "streaky bacon", raw: "6 rashers streaky bacon", amount: 6, unit: "rashers" },
      { name: "sandwich bread", raw: "4 slices sandwich bread, toasted", amount: 4, unit: "slices" },
      { name: "tomato", raw: "1 large tomato, sliced", amount: 1, unit: "whole" },
      { name: "romaine lettuce", raw: "4 leaves romaine lettuce", amount: 4, unit: "leaves" },
      { name: "mayonnaise", raw: "2 tbsp mayonnaise", amount: 2, unit: "tbsp" },
      { name: "salt", raw: "pinch of salt", amount: 1, unit: "pinch" },
      { name: "black pepper", raw: "pinch of black pepper", amount: 1, unit: "pinch" },
    ],
    steps: [
      { number: 1, step: "Cook bacon in a skillet over medium heat until crispy. Drain on paper towels." },
      { number: 2, step: "Toast bread until golden." },
      { number: 3, step: "Spread mayonnaise on both slices of toast." },
      { number: 4, step: "Layer lettuce, tomato slices, and bacon on one slice. Season tomatoes with salt and pepper." },
      { number: 5, step: "Top with the second slice. Cut diagonally and serve immediately." },
    ],
  },
  {
    id: 9000053,
    title: "Classic Club Sandwich",
    minutes: 20, servings: 2, calories: 560,
    tags: ["american", "sandwich", "chicken", "lunch", "meal-prep", "quick"],
    ingredients: [
      { name: "bread", raw: "6 slices white or sourdough bread, toasted", amount: 6, unit: "slices" },
      { name: "cooked chicken breast", raw: "150g cooked chicken breast, sliced", amount: 150, unit: "g" },
      { name: "bacon", raw: "4 rashers bacon, cooked until crispy", amount: 4, unit: "rashers" },
      { name: "tomato", raw: "1 tomato, sliced", amount: 1, unit: "whole" },
      { name: "lettuce", raw: "4 leaves lettuce", amount: 4, unit: "leaves" },
      { name: "mayonnaise", raw: "3 tbsp mayonnaise", amount: 3, unit: "tbsp" },
      { name: "Dijon mustard", raw: "1 tsp Dijon mustard", amount: 1, unit: "tsp" },
      { name: "cheddar cheese", raw: "2 slices cheddar cheese", amount: 2, unit: "slices" },
      { name: "avocado", raw: "½ avocado, sliced", amount: 0.5, unit: "whole" },
    ],
    steps: [
      { number: 1, step: "Mix mayonnaise with Dijon mustard. Spread on all three slices of toast." },
      { number: 2, step: "First layer: lettuce, chicken, and cheese." },
      { number: 3, step: "Add the middle slice of toast." },
      { number: 4, step: "Second layer: bacon, tomato, and avocado. Season with salt and pepper." },
      { number: 5, step: "Top with the third slice. Secure with toothpicks and cut into triangles or quarters." },
    ],
  },
  {
    id: 9000054,
    title: "Chicken Caesar Wrap",
    minutes: 15, servings: 2, calories: 490,
    tags: ["american", "chicken", "wrap", "lunch", "meal-prep", "quick"],
    ingredients: [
      { name: "large flour tortillas", raw: "2 large flour tortillas", amount: 2, unit: "whole" },
      { name: "cooked chicken breast", raw: "200g cooked chicken breast, sliced", amount: 200, unit: "g" },
      { name: "romaine lettuce", raw: "2 cups romaine lettuce, chopped", amount: 2, unit: "cups" },
      { name: "Caesar dressing", raw: "3 tbsp Caesar dressing", amount: 3, unit: "tbsp" },
      { name: "parmesan", raw: "30g parmesan, shaved", amount: 30, unit: "g" },
      { name: "croutons", raw: "¼ cup croutons, roughly crushed", amount: 0.25, unit: "cups" },
      { name: "lemon juice", raw: "1 tsp lemon juice", amount: 1, unit: "tsp" },
      { name: "black pepper", raw: "freshly cracked black pepper", amount: 1, unit: "pinch" },
    ],
    steps: [
      { number: 1, step: "Toss romaine, parmesan, and crushed croutons with Caesar dressing and lemon juice." },
      { number: 2, step: "Warm tortillas in a dry pan for 30 seconds per side." },
      { number: 3, step: "Lay out the tortilla. Place the Caesar salad in the centre, then top with sliced chicken." },
      { number: 4, step: "Season with black pepper." },
      { number: 5, step: "Fold in the sides and roll up tightly. Cut in half diagonally. Wrap in parchment for meal prep." },
    ],
  },
  {
    id: 9000055,
    title: "Italian Sub",
    minutes: 15, servings: 2, calories: 580,
    tags: ["italian", "sandwich", "lunch", "meal-prep", "quick"],
    ingredients: [
      { name: "sub rolls", raw: "2 Italian sub rolls", amount: 2, unit: "whole" },
      { name: "salami", raw: "60g salami, thinly sliced", amount: 60, unit: "g" },
      { name: "pepperoni", raw: "60g pepperoni, thinly sliced", amount: 60, unit: "g" },
      { name: "ham", raw: "60g ham, thinly sliced", amount: 60, unit: "g" },
      { name: "provolone cheese", raw: "4 slices provolone cheese", amount: 4, unit: "slices" },
      { name: "romaine lettuce", raw: "2 leaves romaine lettuce, shredded", amount: 2, unit: "leaves" },
      { name: "tomato", raw: "1 tomato, sliced", amount: 1, unit: "whole" },
      { name: "red onion", raw: "¼ red onion, thinly sliced", amount: 0.25, unit: "whole" },
      { name: "olive oil", raw: "1 tbsp olive oil", amount: 1, unit: "tbsp" },
      { name: "red wine vinegar", raw: "1 tbsp red wine vinegar", amount: 1, unit: "tbsp" },
      { name: "dried oregano", raw: "½ tsp dried oregano", amount: 0.5, unit: "tsp" },
    ],
    steps: [
      { number: 1, step: "Slice rolls and drizzle the cut sides with olive oil and red wine vinegar." },
      { number: 2, step: "Layer provolone cheese on the bottom half." },
      { number: 3, step: "Add salami, pepperoni, and ham." },
      { number: 4, step: "Top with lettuce, tomato, and red onion. Season with oregano, salt, and pepper." },
      { number: 5, step: "Press the top half down firmly. Wrap in parchment paper for at least 10 minutes to let the flavours meld before eating." },
    ],
  },
  {
    id: 9000056,
    title: "Grilled Cheese",
    minutes: 10, servings: 1, calories: 450,
    tags: ["american", "sandwich", "vegetarian", "lunch", "meal-prep", "quick"],
    ingredients: [
      { name: "sourdough bread", raw: "2 thick slices sourdough bread", amount: 2, unit: "slices" },
      { name: "cheddar cheese", raw: "60g cheddar cheese, sliced", amount: 60, unit: "g" },
      { name: "gruyère cheese", raw: "40g gruyère cheese, sliced", amount: 40, unit: "g" },
      { name: "butter", raw: "2 tbsp softened butter", amount: 2, unit: "tbsp" },
      { name: "Dijon mustard", raw: "1 tsp Dijon mustard", amount: 1, unit: "tsp" },
      { name: "garlic powder", raw: "pinch of garlic powder", amount: 1, unit: "pinch" },
    ],
    steps: [
      { number: 1, step: "Spread softened butter on the outside of both bread slices. Mix a pinch of garlic powder into the butter for extra flavour." },
      { number: 2, step: "Spread Dijon mustard on the inside of one slice." },
      { number: 3, step: "Layer cheddar and gruyère on the mustard side. Top with the second slice, butter-side out." },
      { number: 4, step: "Cook in a skillet over medium-low heat for 3–4 minutes per side until deep golden brown and cheese is fully melted." },
      { number: 5, step: "Cut diagonally. Serve immediately with tomato soup or a side salad." },
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

  const url = new URL(req.url);
  const updateImagesOnly = url.searchParams.get("update_images") === "1";

  const results: { title: string; status: string; imageUrl?: string; error?: string }[] = [];

  await processInBatches(MAIN_RECIPES, 3, async (recipe) => {
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

  return NextResponse.json({ total: MAIN_RECIPES.length, created, skipped, errors, results });
}
