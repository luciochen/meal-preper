import { NextResponse } from "next/server";

export interface ScrapedRecipe {
  title: string;
  description?: string;
  imageUrl?: string;
  ingredients: string[];
  instructions: string[];
  prepTimeMinutes?: number;
  servings?: number;
  sourceUrl: string;
}

function isRecipeType(t: unknown): boolean {
  if (typeof t === "string") return t === "Recipe";
  if (Array.isArray(t)) return t.includes("Recipe");
  return false;
}

function parseIsoDuration(s: string): number | undefined {
  if (!s) return undefined;
  const m = s.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return undefined;
  return (parseInt(m[1] || "0") * 60) + parseInt(m[2] || "0");
}

function extractInstructions(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === "string") return [raw].filter(Boolean);
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") { out.push(item); continue; }
    if (item["@type"] === "HowToStep" || item["@type"] === "HowToDirection") {
      out.push(item.text || item.name || "");
      continue;
    }
    if (item["@type"] === "HowToSection" && Array.isArray(item.itemListElement)) {
      for (const step of item.itemListElement) out.push(step.text || step.name || "");
    }
  }
  return out.map((s: string) => s.trim()).filter(Boolean);
}

function extractImage(imgRaw: unknown): string | undefined {
  if (!imgRaw) return undefined;
  if (typeof imgRaw === "string") return imgRaw || undefined;
  if (Array.isArray(imgRaw)) {
    for (const img of imgRaw) {
      const url = typeof img === "string" ? img : (img as Record<string, string>)?.url;
      if (url) return url;
    }
    return undefined;
  }
  return (imgRaw as Record<string, string>)?.url || undefined;
}

function parseJsonLdRecipe(data: Record<string, unknown>, url: string): ScrapedRecipe | null {
  if (!isRecipeType(data["@type"])) return null;
  const title = (data.name as string)?.trim();
  if (!title) return null;

  const imageUrl = extractImage(data.image);
  const ingredients = ((data.recipeIngredient as string[]) || []).map(String).filter(Boolean);
  const instructions = extractInstructions(data.recipeInstructions);

  // Try totalTime first, then cookTime + prepTime combined, then either alone
  let prepTimeMinutes: number | undefined;
  if (data.totalTime) {
    prepTimeMinutes = parseIsoDuration(data.totalTime as string);
  } else if (data.cookTime || data.prepTime) {
    const cook = parseIsoDuration((data.cookTime as string) || "");
    const prep = parseIsoDuration((data.prepTime as string) || "");
    prepTimeMinutes = (cook ?? 0) + (prep ?? 0) || undefined;
  }

  const yieldRaw = data.recipeYield;
  let servings: number | undefined;
  const yieldVal = Array.isArray(yieldRaw) ? yieldRaw[0] : yieldRaw;
  if (yieldVal) {
    const n = parseInt(String(yieldVal));
    if (!isNaN(n)) servings = n;
  }

  return {
    title,
    description: (data.description as string)?.trim() || undefined,
    imageUrl,
    ingredients,
    instructions,
    prepTimeMinutes,
    servings,
    sourceUrl: url,
  };
}

function extractMeta(html: string, property: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const m = html.match(re) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i"));
  return m?.[1]?.trim() || undefined;
}

function scrapeJsonLd(html: string, url: string): ScrapedRecipe | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(html)) !== null) {
    try {
      let data = JSON.parse(match[1].trim());

      // Unwrap @graph
      if (data["@graph"] && Array.isArray(data["@graph"])) {
        const node = data["@graph"].find((x: Record<string, unknown>) => isRecipeType(x["@type"]));
        if (node) data = node;
      }
      // Unwrap top-level array
      if (Array.isArray(data)) {
        const node = data.find((x: Record<string, unknown>) => isRecipeType(x["@type"]));
        if (node) data = node;
      }

      const recipe = parseJsonLdRecipe(data, url);
      if (recipe) return recipe;
    } catch {
      // malformed JSON — keep trying
    }
  }
  return null;
}

// Best-effort HTML fallback: grab OG tags + visible text lists
function scrapeHtmlFallback(html: string, url: string): ScrapedRecipe | null {
  const title =
    extractMeta(html, "og:title") ||
    extractMeta(html, "twitter:title") ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();

  if (!title) return null;

  const imageUrl =
    extractMeta(html, "og:image") ||
    extractMeta(html, "twitter:image");

  const description =
    extractMeta(html, "og:description") ||
    extractMeta(html, "description");

  return {
    title,
    description,
    imageUrl,
    ingredients: [],
    instructions: [],
    sourceUrl: url,
  };
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const url = body.url as string | undefined;

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

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

      // Try JSON-LD first (most reliable)
      const jsonLdResult = scrapeJsonLd(html, url);
      if (jsonLdResult && (jsonLdResult.ingredients.length > 0 || jsonLdResult.instructions.length > 0)) {
        // Fill missing image from OG if needed
        if (!jsonLdResult.imageUrl) {
          jsonLdResult.imageUrl = extractMeta(html, "og:image");
        }
        return NextResponse.json(jsonLdResult);
      }

      // Fall back to OG/meta tags
      const htmlResult = scrapeHtmlFallback(html, url);
      if (htmlResult) return NextResponse.json(htmlResult);

    } catch {
      // try next UA
    }
  }

  return NextResponse.json(
    { error: "No recipe found on this page. Try copying the ingredients manually." },
    { status: 422 }
  );
}
