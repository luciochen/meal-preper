/**
 * Delete tier-1 flagged recipes from Supabase.
 *
 * Reads scripts/audit-results.json and deletes all recipes with tier === "definite".
 * Runs in batches of 50 to avoid hitting query limits.
 *
 * Usage:
 *   npm run delete-flagged-recipes
 *
 * Requires in .env.local: SUPABASE_URL, SUPABASE_ANON_KEY
 */

import * as path from "path";
import * as fs from "fs";
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

interface FlaggedRecipe {
  id: number;
  title: string;
  tier: "definite" | "possible";
  reason: string;
}

const auditPath = path.resolve(process.cwd(), "scripts/audit-results.json");
if (!fs.existsSync(auditPath)) {
  console.error("audit-results.json not found. Run npm run audit-recipes first.");
  process.exit(1);
}

const all: FlaggedRecipe[] = JSON.parse(fs.readFileSync(auditPath, "utf-8"));
const tier1 = all.filter((r) => r.tier === "definite");

console.log(`Found ${tier1.length} tier-1 recipes to delete.`);
console.log("Starting deletion in batches of 50...\n");

const BATCH_SIZE = 50;

async function main() {
  let deleted = 0;

  for (let i = 0; i < tier1.length; i += BATCH_SIZE) {
    const batch = tier1.slice(i, i + BATCH_SIZE);
    const ids = batch.map((r) => r.id);

    const { error } = await supabase.from("recipes").delete().in("id", ids);

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
      process.exit(1);
    }

    deleted += batch.length;
    process.stdout.write(`  Deleted ${deleted}/${tier1.length}...\r`);
  }

  console.log(`\n✓ Successfully deleted ${deleted} tier-1 recipes from Supabase.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
