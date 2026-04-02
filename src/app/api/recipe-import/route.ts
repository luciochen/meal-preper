import { NextResponse } from "next/server";

export interface ScrapedRecipe {
  title: string;
  description: string;
  image_url: string | null;
  ingredients: string[];
  instructions: string[];
  prep_time: number | null;   // minutes
  cook_time: number | null;   // minutes
  servings: string | null;
  source_url: string;
}

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
    .map((s) => String(s).trim())
    .filter(Boolean);

  const instructions = extractInstructions(data.recipeInstructions);
  const image_url = extractImageUrl(data.image);

  const prep_time = parseDuration(data.prepTime);
  const cook_time = parseDuration(data.cookTime);

  // recipeYield can be "4 servings", "4", or ["4"]
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
    } catch {
      // malformed JSON — keep looking
    }
  }
  return null;
}

function extractMeta(html: string, prop: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const m =
    html.match(re) ||
    html.match(
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i")
    );
  return m?.[1]?.trim() ?? null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const url = body.url as string | undefined;

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const userAgents = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  ];

  for (const ua of userAgents) {
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

      const recipe = scrapeJsonLd(html, url);
      if (recipe) {
        // Fill missing image from OG tags
        if (!recipe.image_url) {
          recipe.image_url = extractMeta(html, "og:image");
        }
        if (recipe.ingredients.length > 0 || recipe.instructions.length > 0) {
          return NextResponse.json(recipe);
        }
      }

      // Try OG-only fallback if JSON-LD had no recipe content
      const title =
        extractMeta(html, "og:title") ||
        html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
      if (title) {
        const fallback: ScrapedRecipe = {
          title,
          description: extractMeta(html, "og:description") ?? "",
          image_url: extractMeta(html, "og:image"),
          ingredients: [],
          instructions: [],
          prep_time: null,
          cook_time: null,
          servings: null,
          source_url: url,
        };
        return NextResponse.json(fallback);
      }
    } catch {
      // try next user-agent
    }
  }

  // If we got here with no result at all
  return NextResponse.json({ error: "no_recipe_found" }, { status: 400 });
}
