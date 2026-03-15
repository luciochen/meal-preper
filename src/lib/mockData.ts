export interface Ingredient {
  id?: number;
  name: string;
  raw?: string;
  amount?: number;
  amountDisplay?: string;
  unit?: string;
  aisle?: string;
}

export interface Recipe {
  id: number | string;
  title: string;
  image?: string;
  readyInMinutes: number;
  servings: number;
  calories?: number | null;
  diets: string[];
  cuisines: string[];
  dishTypes: string[];
  summary?: string;
  fridgeLife?: { days: string; label: string };
  microwaveScore?: { level: "excellent" | "good" | "fair" | "poor"; label: string; tip: string };
  extendedIngredients: Ingredient[];
  analyzedInstructions: { steps: { number: number; step: string }[] }[];
}

export const MOCK_RECIPES: Recipe[] = [
  {
    id: 1,
    title: "Honey Garlic Salmon",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&auto=format&fit=crop&q=80",
    readyInMinutes: 25,
    servings: 4,
    calories: 450,
    diets: ["gluten free", "dairy free"],
    cuisines: ["american"],
    dishTypes: ["main course"],
    summary: "A flavorful honey garlic glazed salmon that's perfect for meal prep.",
    fridgeLife: { days: "3", label: "3 Days" },
    microwaveScore: { level: "fair", label: "Reheat Gently", tip: "Heat at 60% power for 90 seconds. Avoid overcooking or the fish will dry out." },
    extendedIngredients: [
      { id: 1, name: "salmon fillets", amount: 4, unit: "pieces", aisle: "Seafood" },
      { id: 2, name: "honey", amount: 3, unit: "tbsp", aisle: "Condiments" },
      { id: 3, name: "garlic", amount: 4, unit: "cloves", aisle: "Produce" },
      { id: 4, name: "soy sauce", amount: 2, unit: "tbsp", aisle: "Condiments" },
      { id: 5, name: "lemon juice", amount: 1, unit: "tbsp", aisle: "Produce" },
      { id: 6, name: "olive oil", amount: 1, unit: "tbsp", aisle: "Oil, Vinegar, Salad Dressing" },
      { id: 7, name: "salt", amount: 0.5, unit: "tsp", aisle: "Spices and Seasonings" },
      { id: 8, name: "black pepper", amount: 0.25, unit: "tsp", aisle: "Spices and Seasonings" },
    ],
    analyzedInstructions: [{
      steps: [
        { number: 1, step: "Whisk honey, soy sauce, lemon juice, and minced garlic in a small bowl until smooth." },
        { number: 2, step: "Heat oil in a large skillet over medium-high heat. Season salmon with salt and pepper and sear flesh-side down for 3–4 minutes." },
        { number: 3, step: "Flip salmon, pour in marinade and cook for another 3 minutes until sauce reduces and salmon is cooked through." },
        { number: 4, step: "Let cool completely before portioning into meal prep containers." },
      ]
    }],
  },
  {
    id: 2,
    title: "Chicken Teriyaki Bowl",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
    readyInMinutes: 30,
    servings: 4,
    calories: 520,
    diets: ["dairy free"],
    cuisines: ["japanese"],
    dishTypes: ["main course"],
    summary: "Classic Japanese-inspired chicken teriyaki over steamed rice, perfect for batch cooking.",
    fridgeLife: { days: "4", label: "4 Days" },
    microwaveScore: { level: "excellent", label: "Microwave Friendly", tip: "Cover with a damp paper towel and heat for 2–2.5 minutes, stirring rice halfway through." },
    extendedIngredients: [
      { id: 1, name: "chicken thighs", amount: 600, unit: "g", aisle: "Meat" },
      { id: 2, name: "soy sauce", amount: 4, unit: "tbsp", aisle: "Condiments" },
      { id: 3, name: "mirin", amount: 2, unit: "tbsp", aisle: "Ethnic Foods" },
      { id: 4, name: "sake", amount: 2, unit: "tbsp", aisle: "Ethnic Foods" },
      { id: 5, name: "sugar", amount: 1, unit: "tbsp", aisle: "Baking" },
      { id: 6, name: "sesame oil", amount: 1, unit: "tsp", aisle: "Oil, Vinegar, Salad Dressing" },
      { id: 7, name: "jasmine rice", amount: 2, unit: "cups", aisle: "Pasta and Rice" },
      { id: 8, name: "broccoli", amount: 2, unit: "cups", aisle: "Produce" },
      { id: 9, name: "sesame seeds", amount: 1, unit: "tbsp", aisle: "Spices and Seasonings" },
    ],
    analyzedInstructions: [{
      steps: [
        { number: 1, step: "Cook jasmine rice according to package instructions and steam broccoli until tender-crisp." },
        { number: 2, step: "Mix soy sauce, mirin, sake, and sugar in a small bowl to make teriyaki sauce." },
        { number: 3, step: "Heat sesame oil in a pan over medium-high heat. Cook chicken thighs for 5–6 minutes per side." },
        { number: 4, step: "Pour teriyaki sauce over chicken and cook for another 2 minutes until sauce thickens and coats the chicken." },
        { number: 5, step: "Slice chicken and divide into containers with rice and broccoli. Sprinkle with sesame seeds." },
      ]
    }],
  },
  {
    id: 3,
    title: "Mediterranean Quinoa Salad",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80",
    readyInMinutes: 20,
    servings: 4,
    calories: 320,
    diets: ["vegan", "vegetarian", "gluten free", "dairy free"],
    cuisines: ["mediterranean"],
    dishTypes: ["salad", "side dish"],
    summary: "A vibrant, protein-packed quinoa salad loaded with fresh Mediterranean flavors.",
    fridgeLife: { days: "5", label: "5 Days" },
    microwaveScore: { level: "poor", label: "Serve Cold", tip: "Best enjoyed cold or at room temperature. Do not microwave — the vegetables will become soggy." },
    extendedIngredients: [
      { id: 1, name: "quinoa", amount: 1.5, unit: "cups", aisle: "Pasta and Rice" },
      { id: 2, name: "cherry tomatoes", amount: 1, unit: "cup", aisle: "Produce" },
      { id: 3, name: "cucumber", amount: 1, unit: "large", aisle: "Produce" },
      { id: 4, name: "red onion", amount: 0.5, unit: "medium", aisle: "Produce" },
      { id: 5, name: "kalamata olives", amount: 0.5, unit: "cup", aisle: "Canned and Jarred" },
      { id: 6, name: "feta cheese", amount: 100, unit: "g", aisle: "Cheese" },
      { id: 7, name: "olive oil", amount: 3, unit: "tbsp", aisle: "Oil, Vinegar, Salad Dressing" },
      { id: 8, name: "lemon juice", amount: 2, unit: "tbsp", aisle: "Produce" },
      { id: 9, name: "dried oregano", amount: 1, unit: "tsp", aisle: "Spices and Seasonings" },
      { id: 10, name: "fresh parsley", amount: 0.25, unit: "cup", aisle: "Produce" },
    ],
    analyzedInstructions: [{
      steps: [
        { number: 1, step: "Cook quinoa in 3 cups of water for 15 minutes until fluffy. Let cool completely." },
        { number: 2, step: "Chop tomatoes, cucumber, and red onion. Halve the olives." },
        { number: 3, step: "Whisk olive oil, lemon juice, and oregano together for the dressing." },
        { number: 4, step: "Combine quinoa with vegetables, drizzle with dressing, and toss to coat." },
        { number: 5, step: "Crumble feta on top and garnish with fresh parsley. Store dressing separately if prepping ahead." },
      ]
    }],
  },
  {
    id: 4,
    title: "Korean BBQ Beef Bowl",
    image: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&auto=format&fit=crop&q=80",
    readyInMinutes: 35,
    servings: 4,
    calories: 580,
    diets: ["dairy free"],
    cuisines: ["korean"],
    dishTypes: ["main course"],
    summary: "Tender marinated beef bulgogi over rice with pickled vegetables.",
    fridgeLife: { days: "4", label: "4 Days" },
    microwaveScore: { level: "excellent", label: "Microwave Friendly", tip: "Heat for 2–3 minutes, stirring halfway. Add a splash of water to keep the beef moist." },
    extendedIngredients: [
      { id: 1, name: "beef sirloin", amount: 500, unit: "g", aisle: "Meat" },
      { id: 2, name: "soy sauce", amount: 4, unit: "tbsp", aisle: "Condiments" },
      { id: 3, name: "pear", amount: 1, unit: "small", aisle: "Produce" },
      { id: 4, name: "sesame oil", amount: 2, unit: "tbsp", aisle: "Oil, Vinegar, Salad Dressing" },
      { id: 5, name: "garlic", amount: 4, unit: "cloves", aisle: "Produce" },
      { id: 6, name: "ginger", amount: 1, unit: "tsp", aisle: "Produce" },
      { id: 7, name: "brown sugar", amount: 2, unit: "tbsp", aisle: "Baking" },
      { id: 8, name: "jasmine rice", amount: 2, unit: "cups", aisle: "Pasta and Rice" },
      { id: 9, name: "green onions", amount: 3, unit: "stalks", aisle: "Produce" },
      { id: 10, name: "sesame seeds", amount: 1, unit: "tbsp", aisle: "Spices and Seasonings" },
    ],
    analyzedInstructions: [{
      steps: [
        { number: 1, step: "Blend soy sauce, pear, sesame oil, garlic, ginger, and brown sugar into a marinade." },
        { number: 2, step: "Slice beef very thinly and marinate for at least 30 minutes (overnight is best)." },
        { number: 3, step: "Cook rice according to package instructions." },
        { number: 4, step: "Cook marinated beef in a hot skillet for 2–3 minutes until caramelized." },
        { number: 5, step: "Serve over rice, garnish with green onions and sesame seeds." },
      ]
    }],
  },
  {
    id: 5,
    title: "Lemon Herb Chicken",
    image: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80",
    readyInMinutes: 30,
    servings: 4,
    calories: 380,
    diets: ["gluten free", "dairy free", "high protein"],
    cuisines: ["american"],
    dishTypes: ["main course"],
    summary: "Juicy oven-roasted chicken breasts infused with lemon and fresh herbs.",
    fridgeLife: { days: "4", label: "4 Days" },
    microwaveScore: { level: "good", label: "Reheat Well", tip: "Add a tablespoon of water or broth, cover, and heat for 1.5–2 minutes to keep it juicy." },
    extendedIngredients: [
      { id: 1, name: "chicken breast", amount: 4, unit: "pieces", aisle: "Meat" },
      { id: 2, name: "lemon", amount: 2, unit: "whole", aisle: "Produce" },
      { id: 3, name: "garlic", amount: 4, unit: "cloves", aisle: "Produce" },
      { id: 4, name: "fresh rosemary", amount: 2, unit: "sprigs", aisle: "Produce" },
      { id: 5, name: "fresh thyme", amount: 2, unit: "sprigs", aisle: "Produce" },
      { id: 6, name: "olive oil", amount: 3, unit: "tbsp", aisle: "Oil, Vinegar, Salad Dressing" },
      { id: 7, name: "salt", amount: 1, unit: "tsp", aisle: "Spices and Seasonings" },
      { id: 8, name: "black pepper", amount: 0.5, unit: "tsp", aisle: "Spices and Seasonings" },
    ],
    analyzedInstructions: [{
      steps: [
        { number: 1, step: "Preheat oven to 200°C (400°F). Mix olive oil, lemon juice, zest, garlic, rosemary, and thyme." },
        { number: 2, step: "Score chicken breasts lightly and coat well with the herb mixture. Season with salt and pepper." },
        { number: 3, step: "Roast for 22–25 minutes until internal temperature reaches 75°C (165°F)." },
        { number: 4, step: "Rest for 5 minutes before slicing. Store sliced for easy portioning." },
      ]
    }],
  },
  {
    id: 6,
    title: "Black Bean & Veggie Tacos",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&auto=format&fit=crop&q=80",
    readyInMinutes: 20,
    servings: 4,
    calories: 290,
    diets: ["vegan", "vegetarian", "gluten free", "dairy free"],
    cuisines: ["mexican"],
    dishTypes: ["main course"],
    summary: "Quick and flavorful plant-based tacos packed with spiced black beans and roasted vegetables.",
    fridgeLife: { days: "4", label: "4 Days" },
    microwaveScore: { level: "good", label: "Reheat Well", tip: "Heat filling for 1–2 minutes. Warm tortillas separately in a dry pan for best texture." },
    extendedIngredients: [
      { id: 1, name: "canned black beans", amount: 2, unit: "cans", aisle: "Canned and Jarred" },
      { id: 2, name: "bell peppers", amount: 3, unit: "whole", aisle: "Produce" },
      { id: 3, name: "red onion", amount: 1, unit: "medium", aisle: "Produce" },
      { id: 4, name: "cumin", amount: 2, unit: "tsp", aisle: "Spices and Seasonings" },
      { id: 5, name: "smoked paprika", amount: 1, unit: "tsp", aisle: "Spices and Seasonings" },
      { id: 6, name: "garlic powder", amount: 1, unit: "tsp", aisle: "Spices and Seasonings" },
      { id: 7, name: "corn tortillas", amount: 8, unit: "pieces", aisle: "Pasta and Rice" },
      { id: 8, name: "lime", amount: 2, unit: "whole", aisle: "Produce" },
      { id: 9, name: "fresh cilantro", amount: 0.5, unit: "cup", aisle: "Produce" },
      { id: 10, name: "olive oil", amount: 2, unit: "tbsp", aisle: "Oil, Vinegar, Salad Dressing" },
    ],
    analyzedInstructions: [{
      steps: [
        { number: 1, step: "Slice peppers and onion, toss with olive oil and spices, and roast at 200°C for 20 minutes." },
        { number: 2, step: "Heat black beans in a pan with cumin, paprika, and garlic powder for 5 minutes." },
        { number: 3, step: "Assemble tacos with beans, roasted vegetables, and a squeeze of lime." },
        { number: 4, step: "Store filling separately from tortillas to keep tortillas from getting soggy." },
      ]
    }],
  },
  {
    id: 7,
    title: "Thai Green Curry",
    image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=80",
    readyInMinutes: 35,
    servings: 4,
    calories: 490,
    diets: ["gluten free"],
    cuisines: ["thai"],
    dishTypes: ["main course"],
    summary: "Aromatic and creamy Thai green curry with chicken and vegetables.",
    fridgeLife: { days: "4", label: "4 Days" },
    microwaveScore: { level: "excellent", label: "Microwave Friendly", tip: "Heat for 2–3 minutes, stirring once. Curries reheat beautifully and flavors intensify." },
    extendedIngredients: [
      { id: 1, name: "chicken thighs", amount: 500, unit: "g", aisle: "Meat" },
      { id: 2, name: "coconut milk", amount: 1, unit: "can", aisle: "Canned and Jarred" },
      { id: 3, name: "green curry paste", amount: 3, unit: "tbsp", aisle: "Ethnic Foods" },
      { id: 4, name: "eggplant", amount: 1, unit: "medium", aisle: "Produce" },
      { id: 5, name: "zucchini", amount: 2, unit: "medium", aisle: "Produce" },
      { id: 6, name: "fish sauce", amount: 2, unit: "tbsp", aisle: "Ethnic Foods" },
      { id: 7, name: "palm sugar", amount: 1, unit: "tbsp", aisle: "Ethnic Foods" },
      { id: 8, name: "Thai basil", amount: 1, unit: "cup", aisle: "Produce" },
      { id: 9, name: "jasmine rice", amount: 2, unit: "cups", aisle: "Pasta and Rice" },
      { id: 10, name: "lime leaves", amount: 4, unit: "leaves", aisle: "Produce" },
    ],
    analyzedInstructions: [{
      steps: [
        { number: 1, step: "Cook jasmine rice and set aside." },
        { number: 2, step: "Fry green curry paste in a wok over medium heat for 1 minute until fragrant." },
        { number: 3, step: "Add chicken and cook for 5 minutes, then pour in coconut milk and lime leaves." },
        { number: 4, step: "Add eggplant and zucchini and simmer for 15 minutes." },
        { number: 5, step: "Season with fish sauce and palm sugar. Finish with fresh Thai basil." },
      ]
    }],
  },
  {
    id: 8,
    title: "Italian Pasta Primavera",
    image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&auto=format&fit=crop&q=80",
    readyInMinutes: 25,
    servings: 4,
    calories: 420,
    diets: ["vegetarian"],
    cuisines: ["italian"],
    dishTypes: ["main course"],
    summary: "Light and colorful pasta loaded with spring vegetables and a simple olive oil sauce.",
    fridgeLife: { days: "3", label: "3 Days" },
    microwaveScore: { level: "good", label: "Reheat Well", tip: "Add a splash of water before microwaving to prevent the pasta from drying out. Heat for 1.5 minutes." },
    extendedIngredients: [
      { id: 1, name: "penne pasta", amount: 400, unit: "g", aisle: "Pasta and Rice" },
      { id: 2, name: "cherry tomatoes", amount: 1, unit: "cup", aisle: "Produce" },
      { id: 3, name: "asparagus", amount: 200, unit: "g", aisle: "Produce" },
      { id: 4, name: "peas", amount: 1, unit: "cup", aisle: "Produce" },
      { id: 5, name: "zucchini", amount: 1, unit: "medium", aisle: "Produce" },
      { id: 6, name: "garlic", amount: 3, unit: "cloves", aisle: "Produce" },
      { id: 7, name: "olive oil", amount: 4, unit: "tbsp", aisle: "Oil, Vinegar, Salad Dressing" },
      { id: 8, name: "parmesan", amount: 50, unit: "g", aisle: "Cheese" },
      { id: 9, name: "fresh basil", amount: 0.5, unit: "cup", aisle: "Produce" },
      { id: 10, name: "red pepper flakes", amount: 0.5, unit: "tsp", aisle: "Spices and Seasonings" },
    ],
    analyzedInstructions: [{
      steps: [
        { number: 1, step: "Cook pasta according to package instructions, reserve 1 cup of pasta water." },
        { number: 2, step: "Sauté garlic in olive oil for 1 minute. Add asparagus, zucchini, and tomatoes, cook 5 minutes." },
        { number: 3, step: "Add peas and cook for 2 more minutes." },
        { number: 4, step: "Toss pasta with vegetables, adding pasta water to create a light sauce." },
        { number: 5, step: "Top with parmesan, basil, and red pepper flakes." },
      ]
    }],
  },
  {
    id: 9,
    title: "Indian Red Lentil Dal",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format&fit=crop&q=80",
    readyInMinutes: 40,
    servings: 6,
    calories: 310,
    diets: ["vegan", "vegetarian", "gluten free", "dairy free"],
    cuisines: ["indian"],
    dishTypes: ["main course"],
    summary: "Comforting and nutritious red lentil dal with aromatic Indian spices.",
    fridgeLife: { days: "5", label: "5 Days" },
    microwaveScore: { level: "excellent", label: "Microwave Friendly", tip: "Heat for 2–3 minutes, stirring once. Dal actually tastes better the next day as flavors develop." },
    extendedIngredients: [
      { id: 1, name: "red lentils", amount: 2, unit: "cups", aisle: "Pasta and Rice" },
      { id: 2, name: "canned diced tomatoes", amount: 1, unit: "can", aisle: "Canned and Jarred" },
      { id: 3, name: "onion", amount: 1, unit: "large", aisle: "Produce" },
      { id: 4, name: "garlic", amount: 4, unit: "cloves", aisle: "Produce" },
      { id: 5, name: "ginger", amount: 1, unit: "tbsp", aisle: "Produce" },
      { id: 6, name: "cumin seeds", amount: 2, unit: "tsp", aisle: "Spices and Seasonings" },
      { id: 7, name: "turmeric", amount: 1, unit: "tsp", aisle: "Spices and Seasonings" },
      { id: 8, name: "garam masala", amount: 2, unit: "tsp", aisle: "Spices and Seasonings" },
      { id: 9, name: "coconut milk", amount: 0.5, unit: "can", aisle: "Canned and Jarred" },
      { id: 10, name: "spinach", amount: 2, unit: "cups", aisle: "Produce" },
    ],
    analyzedInstructions: [{
      steps: [
        { number: 1, step: "Toast cumin seeds in oil until fragrant. Add onion and cook for 8 minutes until golden." },
        { number: 2, step: "Add garlic, ginger, turmeric, and garam masala. Cook for 2 minutes." },
        { number: 3, step: "Add lentils, diced tomatoes, and 4 cups water. Bring to a boil." },
        { number: 4, step: "Reduce heat and simmer for 20 minutes until lentils break down." },
        { number: 5, step: "Stir in coconut milk and spinach. Cook for 3 more minutes. Serve with rice or naan." },
      ]
    }],
  },
  {
    id: 10,
    title: "Japanese Beef Gyudon",
    image: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&auto=format&fit=crop&q=80",
    readyInMinutes: 25,
    servings: 4,
    calories: 550,
    diets: ["dairy free"],
    cuisines: ["japanese"],
    dishTypes: ["main course"],
    summary: "A classic Japanese beef rice bowl with sweet and savory soy-based sauce.",
    fridgeLife: { days: "3", label: "3 Days" },
    microwaveScore: { level: "excellent", label: "Microwave Friendly", tip: "Heat for 2 minutes with a splash of water. The broth helps keep everything moist." },
    extendedIngredients: [
      { id: 1, name: "beef sirloin", amount: 400, unit: "g", aisle: "Meat" },
      { id: 2, name: "onion", amount: 2, unit: "medium", aisle: "Produce" },
      { id: 3, name: "dashi stock", amount: 1, unit: "cup", aisle: "Ethnic Foods" },
      { id: 4, name: "soy sauce", amount: 3, unit: "tbsp", aisle: "Condiments" },
      { id: 5, name: "mirin", amount: 3, unit: "tbsp", aisle: "Ethnic Foods" },
      { id: 6, name: "sake", amount: 2, unit: "tbsp", aisle: "Ethnic Foods" },
      { id: 7, name: "sugar", amount: 1, unit: "tsp", aisle: "Baking" },
      { id: 8, name: "jasmine rice", amount: 2, unit: "cups", aisle: "Pasta and Rice" },
      { id: 9, name: "pickled ginger", amount: 2, unit: "tbsp", aisle: "Ethnic Foods" },
    ],
    analyzedInstructions: [{
      steps: [
        { number: 1, step: "Cook rice and keep warm." },
        { number: 2, step: "Slice beef paper-thin (easier when partially frozen). Slice onions into half-moons." },
        { number: 3, step: "Combine dashi, soy sauce, mirin, sake, and sugar in a pan and bring to a simmer." },
        { number: 4, step: "Add onions and cook for 3 minutes until softened." },
        { number: 5, step: "Add beef and cook for 2 minutes until just cooked. Spoon over rice and top with pickled ginger." },
      ]
    }],
  },
];

// Spoonacular diet tags → our preference labels
export const DIET_MAP: Record<string, string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  "high protein": "High Protein",
  "low calorie": "Low Calorie",
  "very easy to make": "Easy to Cook",
};

export const AISLE_CATEGORY_MAP: Record<string, string> = {
  Produce: "Produce",
  Meat: "Meat & Seafood",
  Seafood: "Meat & Seafood",
  Poultry: "Meat & Seafood",
  Dairy: "Dairy & Eggs",
  Eggs: "Dairy & Eggs",
  Cheese: "Dairy & Eggs",
  "Pasta and Rice": "Pantry",
  Baking: "Pantry",
  "Canned and Jarred": "Pantry",
  Condiments: "Pantry",
  "Spices and Seasonings": "Pantry",
  "Oil, Vinegar, Salad Dressing": "Pantry",
  "Ethnic Foods": "Pantry",
  Nuts: "Pantry",
  Frozen: "Frozen",
  Beverages: "Beverages",
};

export function getCategory(aisle: string): string {
  for (const [key, value] of Object.entries(AISLE_CATEGORY_MAP)) {
    if (aisle.includes(key)) return value;
  }
  return "Other";
}

const CATEGORY_KEYWORDS: [string, string[]][] = [
  ["Produce", ["garlic","onion","shallot","ginger","carrot","celery","pepper","tomato","potato","mushroom","spinach","lettuce","kale","broccoli","zucchini","cucumber","corn","pea","lemon","lime","orange","apple","mango","banana","avocado","herb","basil","parsley","cilantro","thyme","rosemary","mint","dill","chive","scallion","leek","fennel","cabbage","cauliflower","eggplant","squash","pumpkin","asparagus","artichoke","beet","sweet potato","yam","chard","arugula","okra","jalapeno","habanero","serrano","chipotle","green bean","snap pea","bok choy","tomatillo","plantain","fig","grape","berry","blueberry","strawberry","raspberry","cherry","peach","pear","plum","apricot","melon","watermelon","pineapple","papaya","kiwi","coconut"]],
  ["Meat & Seafood", ["chicken","beef","pork","lamb","turkey","duck","veal","bison","venison","salmon","tuna","shrimp","prawn","crab","lobster","scallop","clam","mussel","oyster","squid","octopus","anchovy","sardine","tilapia","cod","halibut","snapper","trout","bass","sausage","bacon","ham","salami","pepperoni","chorizo","pancetta","prosciutto","ground beef","ground turkey","ground pork","steak","brisket","tenderloin","breast","thigh","drumstick","wing"]],
  ["Dairy & Eggs", ["egg","butter","milk","cream","cheese","yogurt","sour cream","cottage cheese","ricotta","mozzarella","parmesan","cheddar","brie","feta","gouda","gruyere","provolone","cream cheese","buttermilk","ghee","whipping cream","heavy cream"]],
];

export function classifyIngredient(name: string): string {
  const lower = name.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return "Pantry";
}
