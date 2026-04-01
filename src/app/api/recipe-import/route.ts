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

function parseIsoDuration(s: string): number | undefined {
  const m = s.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return undefined;
  return (parseInt(m[1] || "0") * 60) + parseInt(m[2] || "0");
}

function extractInstructions(raw: unknown): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") { out.push(item); continue; }
    if (item["@type"] === "HowToStep") { out.push(item.text || item.name || ""); continue; }
    if (item["@type"] === "HowToSection" && Array.isArray(item.itemListElement)) {
      for (const step of item.itemListElement) out.push(step.text || step.name || "");
    }
  }
  return out.map((s) => s.trim()).filter(Boolean);
}

function parseJsonLdRecipe(data: Record<string, unknown>, url: string): ScrapedRecipe | null {
  if (data["@type"] !== "Recipe") return null;
  const title = data.name as string;
  if (!title) return null;

  const imgRaw = data.image;
  const imageUrl = Array.isArray(imgRaw)
    ? (typeof imgRaw[0] === "string" ? imgRaw[0] : (imgRaw[0] as Record<string, string>)?.url)
    : typeof imgRaw === "string"
    ? imgRaw
    : (imgRaw as Record<string, string>)?.url;

  const ingredients = ((data.recipeIngredient as string[]) || []).map(String);
  const instructions = extractInstructions(data.recipeInstructions);

  const timeStr = (data.totalTime || data.cookTime || data.prepTime) as string | undefined;
  const prepTimeMinutes = timeStr ? parseIsoDuration(timeStr) : undefined;

  const yieldRaw = data.recipeYield;
  let servings: number | undefined;
  const yieldVal = Array.isArray(yieldRaw) ? yieldRaw[0] : yieldRaw;
  if (yieldVal) {
    const n = parseInt(String(yieldVal));
    if (!isNaN(n)) servings = n;
  }

  return {
    title: title as string,
    description: data.description as string | undefined,
    imageUrl: imageUrl as string | undefined,
    ingredients,
    instructions,
    prepTimeMinutes,
    servings,
    sourceUrl: url,
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const url = body.url as string | undefined;

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();

    const ldJsonRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = ldJsonRe.exec(html)) !== null) {
      try {
        let data = JSON.parse(match[1]);

        // Handle @graph
        if (data["@graph"] && Array.isArray(data["@graph"])) {
          data = data["@graph"].find((x: Record<string, unknown>) => x["@type"] === "Recipe") || data;
        }
        // Handle top-level array
        if (Array.isArray(data)) {
          data = data.find((x: Record<string, unknown>) => x["@type"] === "Recipe") || data[0];
        }

        const recipe = parseJsonLdRecipe(data, url);
        if (recipe) return NextResponse.json(recipe);
      } catch {
        // continue
      }
    }

    return NextResponse.json({ error: "No recipe found on this page" }, { status: 422 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Could not fetch page: ${msg}` }, { status: 500 });
  }
}
