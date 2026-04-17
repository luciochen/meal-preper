import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ScrapedRecipe } from "@/app/api/recipe-import/route";

const VALID_CUISINES = [
  "Italian", "Chinese", "Mexican", "Japanese", "Korean",
  "Indian", "Thai", "French", "Mediterranean", "American", "Middle Eastern",
];
const VALID_DIET_TAGS = ["Vegan", "Vegetarian", "High protein", "Low calorie", "Easy to cook"];

const anthropic = new Anthropic();

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    // youtu.be/<id>
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0] || null;
    // youtube.com/shorts/<id>
    const shortsMatch = u.pathname.match(/\/shorts\/([^/?&]+)/);
    if (shortsMatch) return shortsMatch[1];
    // youtube.com/embed/<id>
    const embedMatch = u.pathname.match(/\/embed\/([^/?&]+)/);
    if (embedMatch) return embedMatch[1];
    // youtube.com/watch?v=<id>
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

/** Parse ISO 8601 duration (e.g. "PT5M30S") → total seconds */
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");
  return h * 3600 + m * 60 + s;
}

const EXTRACT_PROMPT = `You are a recipe extraction assistant. Extract the recipe from the provided content.

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
instructions: one clear action per step, no filler words, keep all times and temperatures.
If no recipe is present, return: { "error": "no_recipe_found" }`;

function buildScrapedRecipe(
  data: Record<string, unknown>,
  sourceUrl: string,
  imageUrl: string
): ScrapedRecipe & { _parsed_ingredients?: { quantity: string; unit: string; name: string }[] } {
  return {
    title: String(data.title ?? "").trim(),
    description: String(data.description ?? "").trim(),
    image_url: imageUrl,
    ingredients: Array.isArray(data.ingredients) ? data.ingredients.map(String) : [],
    instructions: Array.isArray(data.instructions) ? data.instructions.map(String) : [],
    prep_time: typeof data.prep_time === "number" ? data.prep_time : null,
    cook_time: typeof data.cook_time === "number" ? data.cook_time : null,
    servings: data.servings != null ? String(data.servings) : null,
    cuisine: VALID_CUISINES.includes(data.cuisine as string) ? (data.cuisine as string) : null,
    diet_tags: Array.isArray(data.diet_tags)
      ? (data.diet_tags as string[]).filter((t) => VALID_DIET_TAGS.includes(t))
      : [],
    source_url: sourceUrl,
    _parsed_ingredients: Array.isArray(data.parsed_ingredients)
      ? (data.parsed_ingredients as { quantity: string; unit: string; name: string }[])
      : undefined,
  };
}

function parseJsonResponse(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/** Ask Claude (haiku) if the description contains both ingredients and instructions */
async function descriptionHasRecipe(description: string): Promise<boolean> {
  const prompt = `Does the following text contain BOTH a list of ingredients AND cooking instructions for a recipe? Answer with only "yes" or "no".

Text:
${description.slice(0, 3000)}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [{ role: "user", content: prompt }],
    });
    const text = (msg.content[0] as { type: string; text: string }).text.trim().toLowerCase();
    return text.startsWith("yes");
  } catch {
    return false;
  }
}

/** Extract recipe from the video description text */
async function extractFromDescription(
  description: string,
  title: string
): Promise<Record<string, unknown> | null> {
  const prompt = `${EXTRACT_PROMPT}

Video title: ${title}

Description:
${description.slice(0, 6000)}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    const text = (msg.content[0] as { type: string; text: string }).text.trim();
    const data = parseJsonResponse(text);
    if (!data || data.error || !data.title) return null;
    return data;
  } catch {
    return null;
  }
}

/** Fetch auto-generated captions by parsing the YouTube watch page */
async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    // Fetch the watch page — this works for both regular videos and Shorts
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!pageRes.ok) return null;
    const html = await pageRes.text();

    // Extract ytInitialPlayerResponse JSON blob
    const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
    if (!match) return null;

    let playerResponse: Record<string, unknown>;
    try {
      playerResponse = JSON.parse(match[1]);
    } catch {
      return null;
    }

    // Find caption tracks
    const tracks = (
      playerResponse?.captions as Record<string, unknown> | undefined
    )?.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined;
    const captionList = tracks?.captionTracks as Array<{ baseUrl: string; languageCode: string; kind?: string }> | undefined;
    if (!captionList?.length) return null;

    // Prefer English auto-generated, then any English, then first available
    const preferred =
      captionList.find((t) => t.languageCode === "en" && t.kind === "asr") ||
      captionList.find((t) => t.languageCode.startsWith("en")) ||
      captionList[0];

    if (!preferred?.baseUrl) return null;

    // Fetch the caption XML
    const captionRes = await fetch(preferred.baseUrl + "&fmt=json3", {
      signal: AbortSignal.timeout(8000),
    });
    if (!captionRes.ok) return null;

    const captionData = await captionRes.json();
    if (!captionData.events?.length) return null;

    const text = (captionData.events as Array<{ segs?: Array<{ utf8?: string }> }>)
      .filter((e) => e.segs)
      .map((e) => e.segs!.map((s) => s.utf8 ?? "").join(""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return text.length > 50 ? text : null;
  } catch {
    return null;
  }
}

/** Extract recipe from auto-generated transcript (for short videos) */
async function extractFromTranscript(
  videoId: string,
  title: string
): Promise<Record<string, unknown> | null> {
  const transcript = await fetchTranscript(videoId);
  if (!transcript) return null;

  const prompt = `${EXTRACT_PROMPT}

Video title: ${title}

Auto-generated transcript:
${transcript.slice(0, 6000)}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    const text = (msg.content[0] as { type: string; text: string }).text.trim();
    const data = parseJsonResponse(text);
    if (!data || data.error || !data.title) return null;
    return data;
  } catch {
    return null;
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const url = (body.url ?? "").trim();
  if (!url) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  // 1. Extract video ID
  const videoId = extractVideoId(url);
  if (!videoId) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  // 2. Fetch YouTube metadata
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "fetch_failed" }, { status: 500 });

  let description = "";
  let durationSeconds = 0;
  let videoTitle = "";

  try {
    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!ytRes.ok) return NextResponse.json({ error: "fetch_failed" }, { status: 502 });

    const ytData = await ytRes.json();
    const item = ytData.items?.[0];
    if (!item) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

    description = item.snippet?.description ?? "";
    videoTitle = item.snippet?.title ?? "";
    durationSeconds = parseDuration(item.contentDetails?.duration ?? "");
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }

  // 3. Thumbnail (no API call needed)
  const imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  // 4. Extraction logic
  let extracted: Record<string, unknown> | null = null;

  if (description.length > 100) {
    const hasRecipe = await descriptionHasRecipe(description);
    if (hasRecipe) {
      extracted = await extractFromDescription(description, videoTitle);
    }
  }

  if (!extracted) {
    if (durationSeconds <= 300) {
      // Short video — try transcript/captions
      extracted = await extractFromTranscript(videoId, videoTitle);
    } else {
      // Long video, no recipe in description
      return NextResponse.json({ error: "no_recipe_found" }, { status: 400 });
    }
  }

  if (!extracted) {
    return NextResponse.json({ error: "no_recipe_found" }, { status: 400 });
  }

  return NextResponse.json(buildScrapedRecipe(extracted, url, imageUrl));
}
