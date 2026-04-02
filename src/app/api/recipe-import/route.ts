import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export interface ScrapedRecipe {
  title: string;
  description: string;
  image_url: string | null;
  ingredients: string[];
  instructions: string[];
  prep_time: number | null;   // minutes
  cook_time: number | null;   // minutes
  servings: string | null;
  cuisine: string | null;
  diet_tags: string[];
  source_url: string;
}

// ── JSON-LD helpers ───────────────────────────────────────────────────────────

function isRecipeType(t: unknown): boolean {
  if (typeof t === "string") return t === "Recipe";
  if (Array.isArray(t)) return t.includes("Recipe");
  return false;
}

function parseDuration(s: unknown): number | null {
  if (!s || typeof s !== "string") return null;
  const m = s.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return null;
  const mins = (parseInt(m[1] || "0") * 60) + parseInt(m[2] || "0");
  return mins > 0 ? mins : null;
}

function extractInstructions(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === "string") return raw.trim() ? [raw.trim()] : [];
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") { if (item.trim()) out.push(item.trim()); continue; }
    if (item["@type"] === "HowToStep" || item["@type"] === "HowToDirection") {
      const text = (item.text || item.name || "").trim();
      if (text) out.push(text);
      continue;
    }
    if (item["@type"] === "HowToSection" && Array.isArray(item.itemListElement)) {
      for (const step of item.itemListElement) {
        const text = (step.text || step.name || "").trim();
        if (text) out.push(text);
      }
    }
  }
  return out;
}

function extractImageUrl(img: unknown): string | null {
  if (!img) return null;
  if (typeof img === "string") return img || null;
  if (Array.isArray(img)) {
    for (const item of img) {
      const url = typeof item === "string" ? item : (item as Record<string, string>)?.url;
      if (url) return url;
    }
    return null;
  }
  return (img as Record<string, string>)?.url ?? null;
}

function parseJsonLdBlock(data: Record<string, unknown>, url: string): ScrapedRecipe | null {
  if (!isRecipeType(data["@type"])) return null;
  const title = (data.name as string)?.trim();
  if (!title) return null;

  const ingredients = ((data.recipeIngredient as string[]) ?? [])
    .map((s) => String(s).trim()).filter(Boolean);
  const instructions = extractInstructions(data.recipeInstructions);
  const image_url = extractImageUrl(data.image);
  const prep_time = parseDuration(data.prepTime);
  const cook_time = parseDuration(data.cookTime);
  const yieldRaw = Array.isArray(data.recipeYield) ? data.recipeYield[0] : data.recipeYield;
  const servings = yieldRaw != null ? String(yieldRaw) : null;

  return {
    title,
    description: (data.description as string)?.trim() ?? "",
    image_url,
    ingredients,
    instructions,
    prep_time,
    cook_time,
    servings,
    cuisine: null,
    diet_tags: [],
    source_url: url,
  };
}

function scrapeJsonLd(html: string, url: string): ScrapedRecipe | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    try {
      let data = JSON.parse(match[1].trim());
      if (data["@graph"] && Array.isArray(data["@graph"])) {
        const node = data["@graph"].find((x: Record<string, unknown>) => isRecipeType(x["@type"]));
        if (node) data = node;
      }
      if (Array.isArray(data)) {
        const node = data.find((x: Record<string, unknown>) => isRecipeType(x["@type"]));
        if (node) data = node;
      }
      const recipe = parseJsonLdBlock(data, url);
      if (recipe) return recipe;
    } catch { /* keep looking */ }
  }
  return null;
}

function extractMeta(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
  const m = html.match(re) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
  return m?.[1]?.trim() ?? null;
}

// ── AI enrichment ─────────────────────────────────────────────────────────────

const VALID_CUISINES = [
  "Italian", "Chinese", "Mexican", "Japanese", "Korean",
  "Indian", "Thai", "French", "Mediterranean", "American", "Middle Eastern",
];
const VALID_DIET_TAGS = ["Vegan", "Vegetarian", "High protein", "Low calorie", "Easy to cook"];

const anthropic = new Anthropic();

/**
 * Given a recipe with scraped content, ask Claude to:
 * 1. Classify cuisine and diet tags
 * 2. Re-parse ingredients into structured {quantity, unit, name} objects
 * 3. Generate a short description if missing
 *
 * Returns the enriched fields merged onto the original recipe.
 */
async function enrichScrapedRecipe(recipe: ScrapedRecipe): Promise<ScrapedRecipe> {
  const prompt = `You are a recipe data assistant. Given the following recipe information, return a JSON object with enriched fields.

Recipe title: ${recipe.title}
Description: ${recipe.description || "(none)"}
Ingredients:
${recipe.ingredients.map((ing, i) => `${i + 1}. ${ing}`).join("\n")}

Tasks:
1. Identify the cuisine. Choose ONE from this list (or null if none fits):
   ${VALID_CUISINES.join(", ")}

2. Identify applicable diet tags. Choose any from this list that clearly apply:
   ${VALID_DIET_TAGS.join(", ")}
   Rules:
   - "Vegan": no animal products whatsoever (no meat, dairy, eggs, honey)
   - "Vegetarian": no meat or fish, but dairy/eggs are ok
   - "High protein": main protein source is meat, fish, eggs, legumes, or tofu; substantial amount
   - "Low calorie": light dish, mostly vegetables, minimal fat/starch
   - "Easy to cook": 6 or fewer ingredients, or under 20 minutes total, or very simple technique

3. Parse each ingredient string into structured form. For each ingredient return:
   { "quantity": "2", "unit": "cups", "name": "all-purpose flour" }
   If no quantity, use "". If no unit, use "". Name should be the ingredient without quantity/unit.

4. If description is empty or very short (under 20 words), write a 1–2 sentence description of the dish.

Return ONLY valid JSON in this exact shape, no other text:
{
  "cuisine": "Italian" | null,
  "diet_tags": ["Vegetarian"],
  "description": "string",
  "parsed_ingredients": [
    { "quantity": "2", "unit": "cups", "name": "flour" }
  ]
}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return recipe;

    const enriched = JSON.parse(jsonMatch[0]);

    return {
      ...recipe,
      cuisine: VALID_CUISINES.includes(enriched.cuisine) ? enriched.cuisine : null,
      diet_tags: Array.isArray(enriched.diet_tags)
        ? enriched.diet_tags.filter((t: string) => VALID_DIET_TAGS.includes(t))
        : [],
      description: enriched.description?.trim() || recipe.description,
      // Store parsed ingredients as JSON string array for the form to consume
      ingredients: Array.isArray(enriched.parsed_ingredients)
        ? enriched.parsed_ingredients.map((p: { quantity?: string; unit?: string; name?: string }) =>
            [p.quantity, p.unit, p.name].filter(Boolean).join(" ").trim()
          )
        : recipe.ingredients,
      // Attach parsed form for RecipeFormModal to use directly
      _parsed_ingredients: Array.isArray(enriched.parsed_ingredients)
        ? enriched.parsed_ingredients
        : undefined,
    } as ScrapedRecipe & { _parsed_ingredients?: { quantity: string; unit: string; name: string }[] };
  } catch {
    return recipe; // AI failed — return original, still usable
  }
}

/**
 * When JSON-LD scraping found nothing, send the page HTML to Claude
 * to extract the full recipe structure.
 */
async function extractRecipeFromHtml(html: string, url: string): Promise<ScrapedRecipe | null> {
  // Strip scripts/styles and trim to keep token cost low (~20k chars)
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{3,}/g, "\n")
    .trim()
    .slice(0, 20000);

  const prompt = `You are a recipe extraction assistant. Extract recipe data from the following webpage text.

URL: ${url}

Page text:
${cleaned}

Return ONLY valid JSON in this exact shape (no other text). Use null for fields you cannot find:
{
  "title": "Recipe name",
  "description": "Short description (1–2 sentences)",
  "ingredients": ["2 cups flour", "1 tsp salt"],
  "instructions": ["Step 1 text", "Step 2 text"],
  "prep_time": 15,
  "cook_time": 30,
  "servings": "4",
  "cuisine": "Italian" | null,
  "diet_tags": [],
  "parsed_ingredients": [
    { "quantity": "2", "unit": "cups", "name": "flour" }
  ]
}

cuisine must be one of: ${VALID_CUISINES.join(", ")}, or null.
diet_tags must be a subset of: ${VALID_DIET_TAGS.join(", ")}.
If this page does not contain a recipe, return: { "error": "no_recipe_found" }`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);
    if (data.error || !data.title) return null;

    return {
      title: String(data.title).trim(),
      description: String(data.description ?? "").trim(),
      image_url: extractMeta(html, "og:image"),
      ingredients: Array.isArray(data.ingredients) ? data.ingredients.map(String) : [],
      instructions: Array.isArray(data.instructions) ? data.instructions.map(String) : [],
      prep_time: typeof data.prep_time === "number" ? data.prep_time : null,
      cook_time: typeof data.cook_time === "number" ? data.cook_time : null,
      servings: data.servings != null ? String(data.servings) : null,
      cuisine: VALID_CUISINES.includes(data.cuisine) ? data.cuisine : null,
      diet_tags: Array.isArray(data.diet_tags)
        ? data.diet_tags.filter((t: string) => VALID_DIET_TAGS.includes(t))
        : [],
      source_url: url,
      _parsed_ingredients: Array.isArray(data.parsed_ingredients)
        ? data.parsed_ingredients
        : undefined,
    } as ScrapedRecipe & { _parsed_ingredients?: { quantity: string; unit: string; name: string }[] };
  } catch {
    return null;
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const url = body.url as string | undefined;

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  let lastHtml: string | null = null;

  for (const ua of USER_AGENTS) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": ua,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(15000),
        redirect: "follow",
      });

      if (!res.ok) continue;
      const html = await res.text();
      lastHtml = html;

      // Try JSON-LD first
      const recipe = scrapeJsonLd(html, url);
      if (recipe && (recipe.ingredients.length > 0 || recipe.instructions.length > 0)) {
        if (!recipe.image_url) recipe.image_url = extractMeta(html, "og:image");
        // Enrich with AI (cuisine, diet tags, parsed ingredients, description)
        const enriched = await enrichScrapedRecipe(recipe);
        return NextResponse.json(enriched);
      }

      break; // Got HTML but no JSON-LD — try AI fallback below
    } catch {
      // try next user-agent
    }
  }

  // AI fallback: extract full recipe from raw HTML
  if (lastHtml) {
    const aiRecipe = await extractRecipeFromHtml(lastHtml, url);
    if (aiRecipe) return NextResponse.json(aiRecipe);
  }

  return NextResponse.json({ error: "no_recipe_found" }, { status: 400 });
}
