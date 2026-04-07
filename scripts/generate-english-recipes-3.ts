/**
 * Generate 11 English meal prep recipes (batch 3), upsert to Supabase,
 * then use Claude + Recraft V3 to generate food photos.
 *
 * Usage:
 *   npx tsx scripts/generate-english-recipes-3.ts
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
    id: 9000041,
    title: "Beef Stir Fry",
    minutes: 25,
    servings: 4,
    calories: 420,
    n_steps: 5,
    tags: ["asian-inspired", "beef", "main-course", "meal-prep", "quick"],
    ingredients: [
      { name: "beef sirloin, thinly sliced against the grain", amount: 500, unit: "g" },
      { name: "broccoli florets", amount: 250, unit: "g" },
      { name: "red bell pepper, sliced", amount: 1, unit: "" },
      { name: "snap peas", amount: 150, unit: "g" },
      { name: "garlic cloves, minced", amount: 3, unit: "" },
      { name: "fresh ginger, grated", amount: 1, unit: "tsp" },
      { name: "soy sauce", amount: 3, unit: "tbsp" },
      { name: "oyster sauce", amount: 2, unit: "tbsp" },
      { name: "sesame oil", amount: 1, unit: "tsp" },
      { name: "cornstarch", amount: 1, unit: "tbsp" },
      { name: "vegetable oil", amount: 2, unit: "tbsp" },
      { name: "spring onions, sliced", amount: 2, unit: "" },
      { name: "sesame seeds", amount: 1, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Toss sliced beef with cornstarch, 1 tbsp soy sauce, and a pinch of pepper. Marinate 10 minutes. Whisk together remaining soy sauce, oyster sauce, and sesame oil for the stir-fry sauce." },
      { number: 2, step: "Heat 1 tbsp oil in a wok or large skillet over high heat until smoking. Sear beef in a single layer for 1–2 minutes without stirring, then toss and cook 1 more minute. Remove and set aside." },
      { number: 3, step: "Add remaining oil to the wok. Stir-fry broccoli and snap peas for 2–3 minutes until tender-crisp." },
      { number: 4, step: "Add bell pepper, garlic, and ginger. Stir-fry 1 minute. Return beef to the wok." },
      { number: 5, step: "Pour in the sauce and toss everything together for 1 minute until glossy and well coated. Garnish with spring onions and sesame seeds. Serve over steamed rice." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Microwave for 1.5–2 minutes. Store sauce and vegetables together — they reheat well without drying out." },
  },
  {
    id: 9000042,
    title: "Creamy Tomato Pasta",
    minutes: 30,
    servings: 4,
    calories: 520,
    n_steps: 5,
    tags: ["italian", "vegetarian", "pasta", "main-course", "meal-prep", "quick"],
    ingredients: [
      { name: "penne or rigatoni", amount: 400, unit: "g" },
      { name: "canned crushed tomatoes", amount: 400, unit: "g" },
      { name: "heavy cream", amount: 180, unit: "ml" },
      { name: "garlic cloves, minced", amount: 4, unit: "" },
      { name: "shallots, finely diced", amount: 2, unit: "" },
      { name: "tomato paste", amount: 2, unit: "tbsp" },
      { name: "dried basil", amount: 1, unit: "tsp" },
      { name: "dried oregano", amount: 0.5, unit: "tsp" },
      { name: "chilli flakes", amount: 0.25, unit: "tsp" },
      { name: "butter", amount: 2, unit: "tbsp" },
      { name: "parmesan, grated", amount: 60, unit: "g" },
      { name: "fresh basil leaves", amount: 10, unit: "" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
    ],
    steps: [
      { number: 1, step: "Cook pasta in well-salted boiling water until al dente. Reserve 240 ml pasta water before draining." },
      { number: 2, step: "Melt butter in a large pan over medium heat. Cook shallots until soft, about 3 minutes. Add garlic and chilli flakes, cook 1 minute." },
      { number: 3, step: "Add tomato paste and stir for 1 minute. Pour in crushed tomatoes, basil, and oregano. Simmer 8–10 minutes until slightly thickened." },
      { number: 4, step: "Reduce heat to low and stir in heavy cream. Simmer gently 2–3 minutes. Season with salt and pepper." },
      { number: 5, step: "Toss drained pasta in the sauce, loosening with pasta water as needed. Finish with parmesan and fresh basil. Store sauce and pasta together for meal prep." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "ok", label: "Reheat Gently", tip: "Add a splash of water or milk before microwaving on 70% power for 2 minutes, stirring halfway to prevent the cream sauce from splitting." },
  },
  {
    id: 9000043,
    title: "White Chicken Chili",
    minutes: 45,
    servings: 6,
    calories: 390,
    n_steps: 5,
    tags: ["american", "chicken", "soup", "main-course", "meal-prep", "gluten-free", "high-protein"],
    ingredients: [
      { name: "boneless skinless chicken breasts", amount: 700, unit: "g" },
      { name: "canned white cannellini beans, drained", amount: 800, unit: "g" },
      { name: "chicken stock", amount: 720, unit: "ml" },
      { name: "canned diced green chillies", amount: 120, unit: "g" },
      { name: "brown onion, diced", amount: 1, unit: "" },
      { name: "garlic cloves, minced", amount: 3, unit: "" },
      { name: "ground cumin", amount: 1.5, unit: "tsp" },
      { name: "dried oregano", amount: 1, unit: "tsp" },
      { name: "chilli powder", amount: 0.5, unit: "tsp" },
      { name: "cream cheese, softened", amount: 120, unit: "g" },
      { name: "sour cream", amount: 60, unit: "g" },
      { name: "olive oil", amount: 1, unit: "tbsp" },
      { name: "fresh coriander, chopped", amount: 3, unit: "tbsp" },
      { name: "lime juice", amount: 1, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Heat oil in a large pot. Cook onion until soft, about 5 minutes. Add garlic, cumin, oregano, and chilli powder. Cook 1 minute." },
      { number: 2, step: "Add whole chicken breasts, chicken stock, green chillies, and beans. Bring to a boil, then reduce to a simmer." },
      { number: 3, step: "Cover and cook 20–25 minutes until chicken is cooked through. Remove chicken and shred with two forks." },
      { number: 4, step: "Mash about a quarter of the beans in the pot with the back of a spoon to thicken the broth. Return shredded chicken to the pot." },
      { number: 5, step: "Stir in cream cheese and sour cream until melted and smooth. Add lime juice. Garnish with fresh coriander. Serve with tortilla chips." },
    ],
    fridge_life: { days: "5", label: "5 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Microwave covered for 2–2.5 minutes, stirring halfway. The creamy broth reheats beautifully without separating." },
  },
  {
    id: 9000044,
    title: "Lemon Garlic Shrimp Pasta",
    minutes: 25,
    servings: 4,
    calories: 490,
    n_steps: 5,
    tags: ["italian", "seafood", "pasta", "main-course", "meal-prep", "quick"],
    ingredients: [
      { name: "linguine or spaghetti", amount: 400, unit: "g" },
      { name: "raw shrimp, peeled and deveined", amount: 500, unit: "g" },
      { name: "garlic cloves, thinly sliced", amount: 5, unit: "" },
      { name: "lemon, zested and juiced", amount: 1, unit: "" },
      { name: "dry white wine", amount: 120, unit: "ml" },
      { name: "butter", amount: 3, unit: "tbsp" },
      { name: "olive oil", amount: 2, unit: "tbsp" },
      { name: "chilli flakes", amount: 0.25, unit: "tsp" },
      { name: "fresh parsley, chopped", amount: 4, unit: "tbsp" },
      { name: "parmesan, grated", amount: 40, unit: "g" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
    ],
    steps: [
      { number: 1, step: "Cook pasta in well-salted boiling water until al dente. Reserve 180 ml pasta water before draining." },
      { number: 2, step: "Pat shrimp dry and season with salt, pepper, and chilli flakes." },
      { number: 3, step: "Heat olive oil in a large skillet over medium-high heat. Cook shrimp 1–2 minutes per side until pink and just cooked. Remove and set aside." },
      { number: 4, step: "In the same pan, melt 1 tbsp butter over medium heat. Cook garlic 1 minute until golden. Add white wine and lemon juice, let bubble for 2 minutes. Swirl in remaining butter." },
      { number: 5, step: "Toss pasta in the sauce with a splash of pasta water. Return shrimp, add lemon zest and parsley, toss to combine. Serve with parmesan." },
    ],
    fridge_life: { days: "3", label: "3 Days" },
    microwave_score: { level: "ok", label: "Reheat Gently", tip: "Microwave on 70% power for 1.5 minutes, adding a splash of water. Avoid overcooking — shrimp can turn rubbery. Best eaten within 2 days." },
  },
  {
    id: 9000045,
    title: "Pesto Chicken Pasta",
    minutes: 30,
    servings: 4,
    calories: 570,
    n_steps: 5,
    tags: ["italian", "chicken", "pasta", "main-course", "meal-prep", "quick"],
    ingredients: [
      { name: "penne or fusilli", amount: 400, unit: "g" },
      { name: "boneless skinless chicken breasts, diced", amount: 600, unit: "g" },
      { name: "basil pesto (store-bought or homemade)", amount: 120, unit: "g" },
      { name: "cherry tomatoes, halved", amount: 250, unit: "g" },
      { name: "baby spinach", amount: 60, unit: "g" },
      { name: "garlic cloves, minced", amount: 2, unit: "" },
      { name: "parmesan, grated", amount: 50, unit: "g" },
      { name: "olive oil", amount: 2, unit: "tbsp" },
      { name: "lemon juice", amount: 1, unit: "tbsp" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
    ],
    steps: [
      { number: 1, step: "Cook pasta in well-salted boiling water until al dente. Reserve 120 ml pasta water before draining." },
      { number: 2, step: "Season chicken with salt and pepper. Heat oil in a skillet over medium-high heat and cook chicken until golden and cooked through, about 6–7 minutes. Add garlic in the last minute." },
      { number: 3, step: "Reduce heat to medium-low. Add cherry tomatoes to the pan and cook 2 minutes until just starting to soften." },
      { number: 4, step: "Add drained pasta to the pan. Spoon in pesto and toss well, adding pasta water to loosen to a silky consistency." },
      { number: 5, step: "Fold in baby spinach and lemon juice. Toss until wilted. Top with parmesan and serve." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Add a splash of water and microwave for 1.5–2 minutes. The pesto stays vibrant and the pasta doesn't dry out." },
  },
  {
    id: 9000046,
    title: "Teriyaki Salmon Bowl",
    minutes: 25,
    servings: 4,
    calories: 510,
    n_steps: 5,
    tags: ["japanese", "seafood", "rice", "main-course", "meal-prep", "quick", "gluten-free"],
    ingredients: [
      { name: "salmon fillets", amount: 600, unit: "g" },
      { name: "jasmine rice", amount: 300, unit: "g" },
      { name: "edamame, shelled", amount: 150, unit: "g" },
      { name: "cucumber, sliced", amount: 1, unit: "" },
      { name: "avocado, sliced", amount: 1, unit: "" },
      { name: "soy sauce", amount: 3, unit: "tbsp" },
      { name: "honey", amount: 2, unit: "tbsp" },
      { name: "mirin", amount: 1, unit: "tbsp" },
      { name: "garlic clove, minced", amount: 1, unit: "" },
      { name: "sesame oil", amount: 1, unit: "tsp" },
      { name: "vegetable oil", amount: 1, unit: "tbsp" },
      { name: "sesame seeds", amount: 1, unit: "tbsp" },
      { name: "spring onions, sliced", amount: 2, unit: "" },
    ],
    steps: [
      { number: 1, step: "Cook jasmine rice according to package instructions. Set aside." },
      { number: 2, step: "Whisk together soy sauce, honey, mirin, garlic, and sesame oil to make the teriyaki sauce." },
      { number: 3, step: "Heat oil in a non-stick skillet over medium-high heat. Place salmon skin-side up and cook 3–4 minutes until golden. Flip and cook 2–3 minutes more. Pour teriyaki sauce over and cook 1 minute until caramelised and glossy." },
      { number: 4, step: "Blanch edamame in boiling water for 2 minutes. Drain." },
      { number: 5, step: "Divide rice among 4 bowls. Top with salmon, edamame, cucumber, and avocado. Drizzle with any remaining teriyaki sauce. Garnish with sesame seeds and spring onions." },
    ],
    fridge_life: { days: "3", label: "3 Days" },
    microwave_score: { level: "ok", label: "Reheat Gently", tip: "Reheat rice and salmon separately on 70% power for 1.5 minutes. Store avocado separately and add fresh — it doesn't reheat well." },
  },
  {
    id: 9000047,
    title: "Braised Short Ribs",
    minutes: 180,
    servings: 4,
    calories: 680,
    n_steps: 7,
    tags: ["american", "beef", "braised", "main-course", "meal-prep"],
    ingredients: [
      { name: "bone-in beef short ribs", amount: 1.2, unit: "kg" },
      { name: "brown onion, diced", amount: 1, unit: "" },
      { name: "carrots, diced", amount: 2, unit: "" },
      { name: "celery stalks, diced", amount: 2, unit: "" },
      { name: "garlic cloves, smashed", amount: 4, unit: "" },
      { name: "tomato paste", amount: 2, unit: "tbsp" },
      { name: "dry red wine", amount: 240, unit: "ml" },
      { name: "beef stock", amount: 480, unit: "ml" },
      { name: "canned crushed tomatoes", amount: 400, unit: "g" },
      { name: "fresh thyme sprigs", amount: 3, unit: "" },
      { name: "fresh rosemary sprigs", amount: 2, unit: "" },
      { name: "bay leaves", amount: 2, unit: "" },
      { name: "olive oil", amount: 2, unit: "tbsp" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 160°C (325°F). Generously season short ribs with salt and pepper." },
      { number: 2, step: "Heat oil in a large Dutch oven over high heat. Sear ribs in batches until deeply browned on all sides, 3–4 minutes per side. Remove and set aside." },
      { number: 3, step: "Reduce heat to medium. Cook onion, carrots, and celery until softened, about 6 minutes. Add garlic and tomato paste, cook 2 minutes." },
      { number: 4, step: "Pour in red wine and scrape up all the browned bits. Simmer until reduced by half, about 3 minutes." },
      { number: 5, step: "Add beef stock, crushed tomatoes, thyme, rosemary, and bay leaves. Return short ribs to the pot — the liquid should come halfway up the ribs." },
      { number: 6, step: "Bring to a simmer, then cover and transfer to the oven. Braise for 2.5–3 hours until the meat is fall-off-the-bone tender." },
      { number: 7, step: "Remove ribs. Discard herb sprigs and bay leaves. Skim fat from the braising liquid and reduce on the stovetop if desired for a richer sauce. Serve over mashed potatoes or polenta." },
    ],
    fridge_life: { days: "5", label: "5 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Reheat with braising liquid spooned over the top, covered, for 2.5–3 minutes. The meat stays tender and the sauce reheats beautifully." },
  },
  {
    id: 9000048,
    title: "High Protein Overnight Oats",
    minutes: 10,
    servings: 4,
    calories: 380,
    n_steps: 3,
    tags: ["breakfast", "vegetarian", "high-protein", "meal-prep", "quick", "no-cook"],
    ingredients: [
      { name: "rolled oats", amount: 300, unit: "g" },
      { name: "vanilla protein powder", amount: 80, unit: "g" },
      { name: "Greek yoghurt", amount: 300, unit: "g" },
      { name: "milk (dairy or oat)", amount: 480, unit: "ml" },
      { name: "chia seeds", amount: 2, unit: "tbsp" },
      { name: "honey or maple syrup", amount: 2, unit: "tbsp" },
      { name: "vanilla extract", amount: 1, unit: "tsp" },
      { name: "banana, sliced", amount: 1, unit: "" },
      { name: "mixed berries", amount: 200, unit: "g" },
      { name: "almond butter", amount: 4, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "In a large bowl, whisk together protein powder and milk until smooth. Stir in Greek yoghurt, honey, and vanilla extract." },
      { number: 2, step: "Add rolled oats and chia seeds. Stir well to combine. Divide evenly among 4 jars or containers." },
      { number: 3, step: "Refrigerate overnight (at least 6 hours). In the morning, stir each jar, adding a splash more milk if too thick. Top with banana slices, berries, and a tbsp of almond butter." },
    ],
    fridge_life: { days: "5", label: "5 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Enjoy cold straight from the fridge, or microwave for 60–90 seconds for a warm version. Add toppings after heating." },
  },
  {
    id: 9000049,
    title: "Tuna Noodle Casserole",
    minutes: 45,
    servings: 6,
    calories: 480,
    n_steps: 6,
    tags: ["american", "seafood", "pasta", "baked", "main-course", "meal-prep"],
    ingredients: [
      { name: "egg noodles or penne", amount: 300, unit: "g" },
      { name: "canned tuna in water, drained", amount: 600, unit: "g" },
      { name: "frozen peas", amount: 150, unit: "g" },
      { name: "celery stalks, sliced", amount: 2, unit: "" },
      { name: "brown onion, diced", amount: 1, unit: "" },
      { name: "garlic cloves, minced", amount: 2, unit: "" },
      { name: "whole milk", amount: 360, unit: "ml" },
      { name: "chicken stock", amount: 240, unit: "ml" },
      { name: "butter", amount: 4, unit: "tbsp" },
      { name: "plain flour", amount: 4, unit: "tbsp" },
      { name: "cheddar cheese, shredded", amount: 150, unit: "g" },
      { name: "breadcrumbs", amount: 50, unit: "g" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
    ],
    steps: [
      { number: 1, step: "Preheat oven to 190°C (375°F). Cook pasta until just under al dente (it will continue cooking in the oven). Drain and set aside." },
      { number: 2, step: "Melt 3 tbsp butter in a large oven-safe pan. Cook onion and celery until soft, 5 minutes. Add garlic, cook 1 minute. Sprinkle over flour and stir for 1 minute." },
      { number: 3, step: "Gradually whisk in milk and chicken stock. Cook, stirring constantly, until the sauce thickens, about 4 minutes. Season with salt and pepper." },
      { number: 4, step: "Remove from heat. Stir in half the cheese, then fold in pasta, tuna, and peas." },
      { number: 5, step: "Transfer to a greased 23×33 cm baking dish. Scatter remaining cheese on top. Toss breadcrumbs with remaining melted butter and sprinkle over the cheese." },
      { number: 6, step: "Bake uncovered for 20–25 minutes until golden and bubbling. Rest 5 minutes before serving." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Cover with a damp paper towel and microwave for 2–2.5 minutes. The creamy sauce keeps the pasta moist." },
  },
  {
    id: 9000050,
    title: "Philly Cheesesteak Bowl",
    minutes: 30,
    servings: 4,
    calories: 520,
    n_steps: 5,
    tags: ["american", "beef", "main-course", "meal-prep", "quick", "high-protein"],
    ingredients: [
      { name: "beef ribeye or sirloin, very thinly sliced", amount: 600, unit: "g" },
      { name: "cooked white rice or cauliflower rice", amount: 600, unit: "g" },
      { name: "green bell pepper, sliced", amount: 1, unit: "" },
      { name: "yellow bell pepper, sliced", amount: 1, unit: "" },
      { name: "brown onion, sliced into half-moons", amount: 1, unit: "" },
      { name: "mushrooms, sliced", amount: 200, unit: "g" },
      { name: "garlic cloves, minced", amount: 2, unit: "" },
      { name: "provolone or American cheese, sliced", amount: 100, unit: "g" },
      { name: "Worcestershire sauce", amount: 1, unit: "tbsp" },
      { name: "olive oil", amount: 2, unit: "tbsp" },
      { name: "salt and pepper", amount: 1, unit: "to taste" },
    ],
    steps: [
      { number: 1, step: "Season sliced beef with salt and pepper. Heat 1 tbsp oil in a skillet over high heat. Cook beef in a single layer without stirring for 1–2 minutes, then break apart and cook 1 more minute. Remove and set aside." },
      { number: 2, step: "Add remaining oil to the skillet. Cook onion and peppers over medium-high heat for 6–7 minutes until softened and lightly charred." },
      { number: 3, step: "Add mushrooms and garlic. Cook 3–4 minutes until mushrooms are golden. Splash in Worcestershire sauce." },
      { number: 4, step: "Return beef to the pan. Toss everything together and season to taste. Lay cheese slices over the top, cover the pan with a lid for 1 minute to melt." },
      { number: 5, step: "Divide rice among 4 bowls. Spoon the cheesesteak mixture over the rice. Serve immediately." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Microwave for 1.5–2 minutes. Add a fresh slice of cheese on top before reheating for the best experience." },
  },
  {
    id: 9000051,
    title: "Pork Belly Rice Bowl",
    minutes: 55,
    servings: 4,
    calories: 590,
    n_steps: 6,
    tags: ["asian-inspired", "pork", "rice", "main-course", "meal-prep"],
    ingredients: [
      { name: "pork belly, sliced into 1 cm pieces", amount: 600, unit: "g" },
      { name: "jasmine rice", amount: 300, unit: "g" },
      { name: "soft-boiled eggs", amount: 4, unit: "" },
      { name: "baby bok choy, halved", amount: 4, unit: "" },
      { name: "garlic cloves, minced", amount: 3, unit: "" },
      { name: "fresh ginger, grated", amount: 1, unit: "tbsp" },
      { name: "soy sauce", amount: 3, unit: "tbsp" },
      { name: "dark soy sauce", amount: 1, unit: "tbsp" },
      { name: "mirin", amount: 2, unit: "tbsp" },
      { name: "honey", amount: 1, unit: "tbsp" },
      { name: "rice vinegar", amount: 1, unit: "tbsp" },
      { name: "sesame oil", amount: 1, unit: "tsp" },
      { name: "spring onions, sliced", amount: 2, unit: "" },
      { name: "sesame seeds", amount: 1, unit: "tbsp" },
    ],
    steps: [
      { number: 1, step: "Cook jasmine rice according to package instructions. Cook soft-boiled eggs: boil for 7 minutes, transfer to ice water, peel, and halve." },
      { number: 2, step: "Whisk together soy sauce, dark soy sauce, mirin, honey, rice vinegar, and sesame oil to make the glaze." },
      { number: 3, step: "Heat a skillet over medium-high heat (no oil needed — pork belly is fatty). Cook pork belly slices 3–4 minutes per side until crispy and caramelised." },
      { number: 4, step: "Drain excess fat, leaving about 1 tsp in the pan. Add garlic and ginger, cook 30 seconds. Pour in the glaze and toss pork belly to coat. Simmer 2 minutes until thick and sticky." },
      { number: 5, step: "In the same pan, quickly sauté bok choy with a splash of water and soy sauce for 2 minutes until just wilted." },
      { number: 6, step: "Divide rice among 4 bowls. Top with glazed pork belly, bok choy, and a halved soft-boiled egg. Garnish with spring onions and sesame seeds." },
    ],
    fridge_life: { days: "4", label: "4 Days" },
    microwave_score: { level: "good", label: "Reheats Well", tip: "Microwave rice and pork belly covered for 2 minutes. Store eggs separately and add cold or at room temperature — they don't reheat well." },
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
  const ingredientList = recipe.ingredients.slice(0, 7).map((i) => i.name).join(", ");
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
  } catch {
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
