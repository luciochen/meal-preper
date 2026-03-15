/**
 * Import Food.com recipes into Supabase.
 *
 * Usage:
 *   npm run import-recipes -- \
 *     --file=/path/to/RAW_recipes.csv \
 *     --interactions=/path/to/RAW_interactions.csv \
 *     --ingredients-file=/path/to/recipes_ingredients.csv
 *
 * Requires in .env.local: SUPABASE_URL, SUPABASE_ANON_KEY
 */

import * as fs from "fs";
import * as readline from "readline";
import * as path from "path";
import * as dotenv from "dotenv";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Helpers ────────────────────────────────────────────────────────────────

function parsePythonList(s: string): string[] {
  if (!s || s.trim() === "[]") return [];
  try { return eval(s) as string[]; } catch { return []; }
}

function computeFridgeLife(title: string, tags: string[]): { days: string; label: string } {
  const t = title.toLowerCase();
  if (t.includes("fish") || t.includes("salmon") || t.includes("tuna") || t.includes("shrimp"))
    return { days: "2-3", label: "2-3 Days" };
  if (tags.some(d => d.includes("salad"))) return { days: "3-4", label: "3-4 Days" };
  if (tags.some(d => d === "vegetarian" || d === "vegan")) return { days: "5", label: "5 Days" };
  if (tags.some(d => d.includes("soup") || d.includes("stew"))) return { days: "5", label: "5 Days" };
  return { days: "4", label: "4 Days" };
}

function computeMicrowaveScore(title: string, tags: string[]): {
  level: "excellent" | "good" | "fair" | "poor"; label: string; tip: string;
} {
  const t = title.toLowerCase();
  if (t.includes("fried") || t.includes("crispy") || t.includes("tempura"))
    return { level: "poor", label: "Not Recommended", tip: "Reheat in an air fryer or oven at 180°C for 5 min." };
  if (tags.some(d => d.includes("salad")))
    return { level: "poor", label: "Serve Cold", tip: "Do not microwave. Best served cold." };
  if (t.includes("fish") || t.includes("salmon") || t.includes("shrimp"))
    return { level: "fair", label: "Reheat Gently", tip: "Microwave at 60% power for 90 seconds." };
  if (tags.some(d => d.includes("soup") || d.includes("stew") || d.includes("curry")))
    return { level: "excellent", label: "Microwave Friendly", tip: "Heat for 2–3 minutes, stirring once halfway." };
  return { level: "good", label: "Reheats Well", tip: "Cover with a damp paper towel and heat for 1.5–2 minutes." };
}

// ─── Tag lists ───────────────────────────────────────────────────────────────

const BLACKLIST = new Set([
  "dessert", "desserts", "breakfast", "brunch",
  "drinks", "beverages", "cocktail", "cocktails",
  "snack", "snacks", "sauces", "condiments-etc",
  "dips", "dressings", "marinades",
  "candy", "cookies-and-brownies", "cake", "pies", "punch",
]);

const WHITELIST = new Set([
  "dinner", "lunch", "main-dish", "one-dish-meal",
  "casseroles", "stews", "one-pot-meals",
  "freeze-it", "easy", "make-ahead",
  "weeknight", "weeknight-dinner",
]);

// ─── Ratings map from interactions.csv ──────────────────────────────────────

async function buildRatingsMap(
  interactionsPath: string
): Promise<Map<number, { sum: number; count: number }>> {
  console.log("Loading ratings from interactions file...");
  const map = new Map<number, { sum: number; count: number }>();

  const rl = readline.createInterface({
    input: fs.createReadStream(interactionsPath),
    crlfDelay: Infinity,
  });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue; // skip header: user_id,recipe_id,date,rating,review
    // Only need recipe_id (col 1) and rating (col 3) — safe to split by comma since these cols have no commas
    const comma1 = line.indexOf(",");
    const comma2 = line.indexOf(",", comma1 + 1);
    const comma3 = line.indexOf(",", comma2 + 1);
    const comma4 = line.indexOf(",", comma3 + 1);
    if (comma1 < 0 || comma3 < 0) continue;

    const recipeId = parseInt(line.slice(comma1 + 1, comma2));
    const rating = parseFloat(line.slice(comma3 + 1, comma4 > 0 ? comma4 : undefined));
    if (isNaN(recipeId) || isNaN(rating) || rating < 1 || rating > 5) continue;

    const existing = map.get(recipeId);
    if (existing) { existing.sum += rating; existing.count++; }
    else map.set(recipeId, { sum: rating, count: 1 });

    if (lineNum % 200000 === 0) process.stdout.write(`\r  Read ${lineNum.toLocaleString()} interactions...`);
  }
  console.log(`\n  Ratings loaded for ${map.size.toLocaleString()} unique recipes.`);
  return map;
}

// ─── Ingredients raw map from recipes_ingredients.csv ────────────────────────

async function buildIngredientsMap(
  ingredientsPath: string
): Promise<Map<number, string[]>> {
  console.log("Loading ingredients_raw from ingredients file...");
  const map = new Map<number, string[]>();

  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(ingredientsPath, { encoding: "utf-8" });
    Papa.parse(stream, {
      header: true,
      skipEmptyLines: true,
      step: (result: Papa.ParseStepResult<{ id: string; ingredients_raw: string }>) => {
        const row = result.data;
        const id = parseInt(row.id);
        if (isNaN(id)) return;
        const raws = parsePythonList(row.ingredients_raw);
        if (raws.length > 0) map.set(id, raws);
        if (map.size % 100000 === 0 && map.size > 0)
          process.stdout.write(`\r  Loaded ${map.size.toLocaleString()} ingredient entries...`);
      },
      complete: () => resolve(),
      error: (err: Error) => reject(err),
    });
  });
  console.log(`\n  ingredients_raw loaded for ${map.size.toLocaleString()} recipes.`);
  return map;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

/**
 * Popularity score: avg_rating × log10(reviews + 1)
 * Rewards high ratings with meaningful review volume.
 * A recipe with 4.8★ × 1 review scores less than 4.5★ × 50 reviews.
 */
function popularityScore(sum: number, count: number): number {
  const avg = sum / count;
  return avg * Math.log10(count + 1);
}

/**
 * Quality boost multiplier (1.0–1.3×): rewards nutritionally balanced,
 * well-documented recipes without penalizing good ones.
 */
function qualityBoost(nSteps: number, nIng: number, calories: number, proteinPdv: number): number {
  let boost = 1.0;
  if (nSteps >= 5 && nSteps <= 12 && nIng >= 5 && nIng <= 12) boost += 0.15;
  if (calories >= 250 && calories <= 800 && proteinPdv >= 12) boost += 0.15;
  return boost;
}

// ─── Main ────────────────────────────────────────────────────────────────────

interface RawRow {
  id: string; name: string; minutes: string; tags: string;
  nutrition: string; n_steps: string; steps: string;
  ingredients: string; n_ingredients: string; description: string;
  [key: string]: string;
}

async function main() {
  const fileArg = process.argv.find(a => a.startsWith("--file="));
  const interactionsArg = process.argv.find(a => a.startsWith("--interactions="));
  const ingredientsFileArg = process.argv.find(a => a.startsWith("--ingredients-file="));

  if (!fileArg) {
    console.error("Usage: npm run import-recipes -- --file=RAW_recipes.csv [--interactions=RAW_interactions.csv] [--ingredients-file=recipes_ingredients.csv]");
    process.exit(1);
  }

  const csvPath = fileArg.replace("--file=", "");
  const interactionsPath = interactionsArg?.replace("--interactions=", "");
  const ingredientsFilePath = ingredientsFileArg?.replace("--ingredients-file=", "");

  if (!fs.existsSync(csvPath)) { console.error(`File not found: ${csvPath}`); process.exit(1); }

  // Step 1: build ratings map
  let ratingsMap: Map<number, { sum: number; count: number }> | null = null;
  if (interactionsPath && fs.existsSync(interactionsPath)) {
    ratingsMap = await buildRatingsMap(interactionsPath);
  } else {
    console.log("No interactions file — sorting by quality score only.");
  }

  // Step 2: build ingredients_raw map
  let ingredientsMap: Map<number, string[]> | null = null;
  if (ingredientsFilePath && fs.existsSync(ingredientsFilePath)) {
    ingredientsMap = await buildIngredientsMap(ingredientsFilePath);
  } else {
    console.log("No ingredients file — storing ingredient names only (no quantities).");
  }

  // Step 3: parse recipes
  console.log(`\nReading recipes CSV...`);
  const csvText = fs.readFileSync(csvPath, "utf-8");
  const { data: rows } = Papa.parse<RawRow>(csvText, { header: true, skipEmptyLines: true });
  console.log(`Parsed ${rows.length.toLocaleString()} rows. Applying hard filters...`);

  // Step 3: hard filters
  const filtered = rows.filter(row => {
    const minutes = parseInt(row.minutes) || 0;
    if (minutes < 15 || minutes > 60) return false;
    const nSteps = parseInt(row.n_steps) || 0;
    if (nSteps < 4 || nSteps > 20) return false;
    const nIng = parseInt(row.n_ingredients) || 0;
    if (nIng < 3 || nIng > 15) return false;
    // Description quality: must exist and have >= 20 words
    const desc = (row.description || "").trim();
    if (!desc || desc.split(/\s+/).length < 20) return false;
    const tags = parsePythonList(row.tags).map(t => t.toLowerCase().replace(/\s+/g, "-"));
    if (tags.some(t => BLACKLIST.has(t))) return false;
    if (!tags.some(t => WHITELIST.has(t))) return false;
    return true;
  });
  console.log(`After hard filters: ${filtered.length.toLocaleString()} recipes.`);

  // Step 4: score each recipe
  const scored = filtered.map(row => {
    const id = parseInt(row.id);
    const ratingData = ratingsMap?.get(id);
    const nutrition = parsePythonList(row.nutrition);
    const calories = parseFloat(nutrition[0] || "0");
    const proteinPdv = parseFloat(nutrition[4] || "0");

    let score: number;
    if (ratingData && ratingData.count > 0) {
      const pop = popularityScore(ratingData.sum, ratingData.count);
      const boost = qualityBoost(parseInt(row.n_steps), parseInt(row.n_ingredients), calories, proteinPdv);
      score = pop * boost;
    } else {
      // No ratings: use quality score as fallback, discounted vs rated recipes
      const qScore = qualityBoost(parseInt(row.n_steps), parseInt(row.n_ingredients), calories, proteinPdv);
      score = qScore * 0.5; // ranked below any recipe with ratings
    }

    return { row, score, reviewCount: ratingData?.count ?? 0, avgRating: ratingData ? ratingData.sum / ratingData.count : 0 };
  });

  // Step 5: sort by score DESC
  scored.sort((a, b) => b.score - a.score);

  // Step 6: deduplicate by name — keep highest scored (already sorted, so first occurrence wins)
  const seenNames = new Set<string>();
  const deduped = scored.filter(({ row }) => {
    const key = row.name.toLowerCase().trim();
    if (seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });
  console.log(`After deduplication: ${deduped.length.toLocaleString()} unique recipes.`);

  // Step 7: take top 3000
  const top3000 = deduped.slice(0, 3000);

  // Stats
  const ratingDist = { "≥4.5": 0, "4–4.5": 0, "3.5–4": 0, "<3.5": 0, "unrated": 0 };
  top3000.forEach(({ avgRating, reviewCount }) => {
    if (reviewCount === 0) ratingDist["unrated"]++;
    else if (avgRating >= 4.5) ratingDist["≥4.5"]++;
    else if (avgRating >= 4.0) ratingDist["4–4.5"]++;
    else if (avgRating >= 3.5) ratingDist["3.5–4"]++;
    else ratingDist["<3.5"]++;
  });
  const timeDist = { "15–30m": 0, "30–45m": 0, "45–60m": 0 };
  top3000.forEach(({ row }) => {
    const m = parseInt(row.minutes);
    if (m <= 30) timeDist["15–30m"]++;
    else if (m <= 45) timeDist["30–45m"]++;
    else timeDist["45–60m"]++;
  });
  console.log("Rating distribution:", ratingDist);
  console.log("Time distribution:", timeDist);

  // Step 8: clear existing data
  console.log("\nClearing existing data from Supabase...");
  const { error: delErr } = await supabase.from("recipes").delete().gte("id", 0);
  if (delErr) { console.error("Failed to clear:", delErr.message); process.exit(1); }
  console.log("Table cleared.");

  // Step 9: upsert in batches of 100
  console.log(`Importing ${top3000.length} recipes in batches of 100...`);
  const BATCH = 100;
  let imported = 0, failed = 0;

  for (let i = 0; i < top3000.length; i += BATCH) {
    const batch = top3000.slice(i, i + BATCH);

    try {
      const records = batch.map(({ row }) => {
        const tags = parsePythonList(row.tags).map(t => t.toLowerCase().replace(/\s+/g, "-"));
        const nutrition = parsePythonList(row.nutrition);
        const calories = nutrition[0] ? parseFloat(nutrition[0]) : null;
        const steps = parsePythonList(row.steps).map((s, idx) => ({ number: idx + 1, step: s }));
        const id = parseInt(row.id);
        const names = parsePythonList(row.ingredients);
        const rawStrs = ingredientsMap?.get(id) ?? [];
        const ingredients = names.map((name, idx) => ({ name, raw: rawStrs[idx] ?? name }));

        return {
          id,
          title: row.name,
          image_url: null,
          minutes: parseInt(row.minutes) || 30,
          servings: 4,
          tags,
          ingredients,
          steps,
          calories,
          n_steps: parseInt(row.n_steps) || steps.length,
          fridge_life: computeFridgeLife(row.name, tags),
          microwave_score: computeMicrowaveScore(row.name, tags),
        };
      });

      const { error } = await supabase.from("recipes").upsert(records, { onConflict: "id" });
      if (error) {
        console.error(`\nBatch ${Math.floor(i / BATCH) + 1} failed: ${error.message}`);
        failed += batch.length;
      } else {
        imported += batch.length;
        process.stdout.write(`\r  ${imported}/${top3000.length} imported...`);
      }
    } catch (err) {
      console.error(`\nBatch ${Math.floor(i / BATCH) + 1} exception:`, err);
      failed += batch.length;
    }
  }

  console.log(`\nDone! Imported: ${imported}, Failed: ${failed}`);
}

main().catch(err => { console.error(err); process.exit(1); });
