/**
 * Audit all recipes in Supabase and flag ones unsuitable for meal prep.
 *
 * Usage:
 *   npm run audit-recipes
 *
 * Outputs:
 *   - stdout: summary table
 *   - scripts/audit-results.json: full flagged list for manual review
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

// ─── Flag criteria ────────────────────────────────────────────────────────────

const TIER1_TITLE_KEYWORDS = [
  "dressing", "sauce", "dip", "spread", "marinade", "glaze", "gravy",
  "syrup", "smoothie", "juice", "shake", "punch", "cocktail", "lemonade",
  "frosting", "icing", "candy", "fudge", "brownie", "muffin", "scone",
  "pancake", "waffle",
  // Desserts
  "pudding", "custard", "cobbler", "crumble", "tiramisu", "parfait",
  "sorbet", "gelatin", "jello", "trifle", "mousse",
];

const TIER1_TAG_BLACKLIST = new Set([
  "dessert", "desserts", "breakfast", "brunch", "drinks", "beverages",
  "cocktail", "cocktails", "snack", "snacks", "sauces", "condiments-etc",
  "dips", "dressings", "marinades", "candy", "cookies-and-brownies",
  "cake", "pies", "punch", "puddings", "custards", "frozen-desserts",
]);

const TIER2_TITLE_KEYWORDS = [
  "relish", "chutney", "salsa", "pickle", "jam", "jelly", "compote",
  "pesto", "hummus", "guacamole",
];

interface Recipe {
  id: number;
  title: string;
  tags: string[];
  microwave_score: { level?: string } | null;
  fridge_life: { days?: string } | null;
}

interface FlaggedRecipe {
  id: number;
  title: string;
  tags: string[];
  tier: "definite" | "possible";
  reason: string;
}

function checkTier1(recipe: Recipe): string | null {
  const titleLower = recipe.title.toLowerCase();

  const matchedKeyword = TIER1_TITLE_KEYWORDS.find((kw) => titleLower.includes(kw));
  if (matchedKeyword) return `Title contains "${matchedKeyword}"`;

  const matchedTag = (recipe.tags || []).find((t) => TIER1_TAG_BLACKLIST.has(t));
  if (matchedTag) return `Tag "${matchedTag}" in blacklist`;

  return null;
}

function checkTier2(recipe: Recipe): string | null {
  const titleLower = recipe.title.toLowerCase();

  const matchedKeyword = TIER2_TITLE_KEYWORDS.find((kw) => {
    const re = new RegExp(`\\b${kw}\\b`);
    return re.test(titleLower);
  });
  if (matchedKeyword) return `Title contains condiment word "${matchedKeyword}"`;

  const microwaveLevel = recipe.microwave_score?.level;
  const fridgeDays = recipe.fridge_life?.days ?? "";
  if (microwaveLevel === "poor" && fridgeDays.startsWith("2")) {
    return `Poor microwave score + short fridge life (${fridgeDays} days)`;
  }

  return null;
}

// ─── Fetch all recipes paginated ─────────────────────────────────────────────

async function fetchAllRecipes(): Promise<Recipe[]> {
  const PAGE_SIZE = 1000;
  const all: Recipe[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("recipes")
      .select("id, title, tags, microwave_score, fridge_life")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Supabase error:", error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    all.push(...(data as Recipe[]));
    process.stdout.write(`  Fetched ${all.length} recipes...\r`);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching all recipes from Supabase...");
  const recipes = await fetchAllRecipes();
  console.log(`\nTotal recipes scanned: ${recipes.length}`);

  const flagged: FlaggedRecipe[] = [];

  for (const recipe of recipes) {
    const tier1Reason = checkTier1(recipe);
    if (tier1Reason) {
      flagged.push({ id: recipe.id, title: recipe.title, tags: recipe.tags || [], tier: "definite", reason: tier1Reason });
      continue;
    }
    const tier2Reason = checkTier2(recipe);
    if (tier2Reason) {
      flagged.push({ id: recipe.id, title: recipe.title, tags: recipe.tags || [], tier: "possible", reason: tier2Reason });
    }
  }

  const tier1 = flagged.filter((f) => f.tier === "definite");
  const tier2 = flagged.filter((f) => f.tier === "possible");

  // Sort: definite first, then possible; alphabetical within each tier
  const sorted = [
    ...tier1.sort((a, b) => a.title.localeCompare(b.title)),
    ...tier2.sort((a, b) => a.title.localeCompare(b.title)),
  ];

  // Print summary
  console.log(`\n${"─".repeat(70)}`);
  console.log(`AUDIT RESULTS`);
  console.log(`${"─".repeat(70)}`);
  console.log(`  Total scanned : ${recipes.length}`);
  console.log(`  Tier 1 (definite) : ${tier1.length}`);
  console.log(`  Tier 2 (possible) : ${tier2.length}`);
  console.log(`  Total flagged : ${flagged.length}`);
  console.log(`${"─".repeat(70)}\n`);

  console.log(`${"TIER".padEnd(10)}${"ID".padEnd(10)}${"TITLE".padEnd(42)}REASON`);
  console.log(`${"─".repeat(70)}`);
  for (const r of sorted) {
    const tier = r.tier === "definite" ? "DEFINITE" : "POSSIBLE";
    const title = r.title.length > 40 ? r.title.slice(0, 39) + "…" : r.title;
    console.log(`${tier.padEnd(10)}${String(r.id).padEnd(10)}${title.padEnd(42)}${r.reason}`);
  }

  // Write JSON output
  const outPath = path.resolve(process.cwd(), "scripts/audit-results.json");
  fs.writeFileSync(outPath, JSON.stringify(sorted, null, 2));
  console.log(`\n✓ Full results saved to scripts/audit-results.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
