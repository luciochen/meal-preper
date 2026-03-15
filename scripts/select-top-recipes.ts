/**
 * Select top 100 recipes by review score and enable only those.
 *
 * Reads RAW_interactions.csv to compute a Bayesian average rating per recipe,
 * then sets enabled=true for the top 100 and enabled=false for all others.
 *
 * Usage:
 *   npm run select-top-recipes -- --interactions=/path/to/RAW_interactions.csv
 *
 * Default interactions path: /Users/lucio/Documents/Programs/resources/RAW_interactions.csv
 *
 * Requires in .env.local: SUPABASE_URL, SUPABASE_ANON_KEY
 * Run scripts/migrations/add_enabled_column.sql in Supabase first.
 */

import * as fs from "fs";
import * as readline from "readline";
import * as path from "path";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

const TOP_N = 500;
// Bayesian prior: assume each recipe has C "virtual" reviews at rating m.
// This prevents recipes with 1 glowing review from beating recipes with 100 solid ones.
const PRIOR_COUNT = 10;
const PRIOR_MEAN = 3.5;

// ─── Parse CLI args ───────────────────────────────────────────────────────────

const DEFAULT_CSV = "/Users/lucio/Documents/Programs/resources/RAW_interactions.csv";
const interactionsArg = process.argv.find((a) => a.startsWith("--interactions="));
const csvPath = interactionsArg ? interactionsArg.split("=")[1] : DEFAULT_CSV;

if (!fs.existsSync(csvPath)) {
  console.error(`CSV not found: ${csvPath}`);
  process.exit(1);
}

// ─── Score computation ────────────────────────────────────────────────────────

interface RecipeStats {
  count: number;
  sum: number;
}

async function computeScores(filePath: string): Promise<Map<number, number>> {
  const stats = new Map<number, RecipeStats>();
  let lines = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  let isHeader = true;
  for await (const line of rl) {
    if (isHeader) { isHeader = false; continue; }

    // Format: user_id,recipe_id,date,rating,review
    const p1 = line.indexOf(",");
    const p2 = line.indexOf(",", p1 + 1);
    const p3 = line.indexOf(",", p2 + 1);
    const p4 = line.indexOf(",", p3 + 1);
    const recipeId = parseInt(line.slice(p1 + 1, p2), 10);
    const rating = parseFloat(line.slice(p3 + 1, p4 === -1 ? undefined : p4));

    if (!isNaN(recipeId) && !isNaN(rating)) {
      const s = stats.get(recipeId) ?? { count: 0, sum: 0 };
      s.count += 1;
      s.sum += rating;
      stats.set(recipeId, s);
    }

    lines++;
    if (lines % 100_000 === 0) process.stdout.write(`  Parsed ${lines.toLocaleString()} interactions...\r`);
  }

  console.log(`\n  Total interactions parsed: ${lines.toLocaleString()}`);
  console.log(`  Unique recipes scored: ${stats.size.toLocaleString()}`);

  // Bayesian average: (C*m + sum) / (C + n)
  const scores = new Map<number, number>();
  for (const [id, { count, sum }] of stats) {
    const score = (PRIOR_COUNT * PRIOR_MEAN + sum) / (PRIOR_COUNT + count);
    scores.set(id, score);
  }

  return scores;
}

// ─── Fetch all recipe IDs from Supabase ───────────────────────────────────────

async function fetchAllIds(): Promise<number[]> {
  const PAGE_SIZE = 1000;
  const ids: number[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("recipes")
      .select("id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Supabase error:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    ids.push(...data.map((r: { id: number }) => r.id));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return ids;
}

// ─── Update enabled flag in batches ──────────────────────────────────────────

async function setEnabled(ids: number[], enabled: boolean): Promise<void> {
  const BATCH = 500;
  let done = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const { error } = await supabase
      .from("recipes")
      .update({ enabled })
      .in("id", batch);

    if (error) {
      console.error(`Batch update failed:`, error.message);
      process.exit(1);
    }
    done += batch.length;
    process.stdout.write(`  ${enabled ? "Enabling" : "Disabling"} ${done}/${ids.length}...\r`);
  }
  console.log();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Reading interactions from: ${csvPath}`);
  const scores = await computeScores(csvPath);

  console.log("\nFetching all recipe IDs from Supabase...");
  const allIds = await fetchAllIds();
  console.log(`  Total recipes in DB: ${allIds.length}`);

  // Match CSV scores to IDs that actually exist in the DB
  const dbIdSet = new Set(allIds);
  const ranked = [...scores.entries()]
    .filter(([id]) => dbIdSet.has(id))
    .sort((a, b) => b[1] - a[1]);

  const top100Ids = new Set(ranked.slice(0, TOP_N).map(([id]) => id));
  const enableIds = allIds.filter((id) => top100Ids.has(id));
  const disableIds = allIds.filter((id) => !top100Ids.has(id));

  console.log(`\n  Recipes to enable  : ${enableIds.length}`);
  console.log(`  Recipes to disable : ${disableIds.length}`);

  // Print the top 100
  console.log(`\n${"─".repeat(60)}`);
  console.log(`TOP ${TOP_N} RECIPES BY BAYESIAN RATING`);
  console.log(`${"─".repeat(60)}`);
  console.log(`${"RANK".padEnd(6)}${"ID".padEnd(10)}${"SCORE".padEnd(8)}REVIEWS`);
  console.log(`${"─".repeat(60)}`);
  ranked.slice(0, TOP_N).forEach(([id, score], i) => {
    const stats = scores.get(id)!;
    // re-get original count from the scores map isn't possible directly, but we logged it
    console.log(`${String(i + 1).padEnd(6)}${String(id).padEnd(10)}${score.toFixed(3).padEnd(8)}`);
  });
  console.log(`${"─".repeat(60)}`);

  console.log(`\nDisabling ${disableIds.length} recipes...`);
  await setEnabled(disableIds, false);

  console.log(`Enabling ${enableIds.length} recipes...`);
  await setEnabled(enableIds, true);

  // Save summary
  const outPath = path.resolve(process.cwd(), "scripts/top-recipes.json");
  const summary = ranked.slice(0, TOP_N).map(([id, score], i) => ({
    rank: i + 1,
    id,
    bayesian_score: parseFloat(score.toFixed(4)),
  }));
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));

  console.log(`\n✓ Done. Top ${TOP_N} recipes enabled, rest hidden.`);
  console.log(`✓ Summary saved to scripts/top-recipes.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
