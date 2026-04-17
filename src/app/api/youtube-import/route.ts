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
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0] || null;
    const shortsMatch = u.pathname.match(/\/shorts\/([^/?&]+)/);
    if (shortsMatch) return shortsMatch[1];
    const embedMatch = u.pathname.match(/\/embed\/([^/?&]+)/);
    if (embedMatch) return embedMatch[1];
    return u.searchParams.get("v");
  } catch {
    return null;
  }
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
  "cuisine": "Italian",
  "diet_tags": [],
  "parsed_ingredients": [
    { "quantity": "2", "unit": "cups", "name": "flour" }
  ]
}

cuisine must be one of: ${VALID_CUISINES.join(", ")}, or null.
diet_tags must be a subset of: ${VALID_DIET_TAGS.join(", ")}.
instructions: one clear action per step, no filler words, keep all times and temperatures.
If no recipe is present, return: { "error": "no_recipe_found" }`;

interface VideoMeta {
  title: string;
  description: string;
  durationSeconds: number;
  captionTracks: Array<{ baseUrl: string; languageCode: string; kind?: string }>;
}

/** Fetch all video metadata from the YouTube watch page in a single request */
async function fetchVideoMeta(videoId: string): Promise<VideoMeta | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
    if (!match) return null;

    let p: Record<string, unknown>;
    try { p = JSON.parse(match[1]); } catch { return null; }

    const details = p.videoDetails as Record<string, unknown> | undefined;
    if (!details?.videoId) return null; // video not found / private

    const tracks = (
      (p.captions as Record<string, unknown> | undefined)
        ?.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined
    )?.captionTracks as Array<{ baseUrl: string; languageCode: string; kind?: string }> | undefined;

    return {
      title: String(details.title ?? ""),
      description: String(details.shortDescription ?? ""),
      durationSeconds: parseInt(String(details.lengthSeconds ?? "0"), 10),
      captionTracks: tracks ?? [],
    };
  } catch {
    return null;
  }
}

/** Fetch captions text from the best available caption track */
async function fetchCaptionText(
  tracks: Array<{ baseUrl: string; languageCode: string; kind?: string }>
): Promise<string | null> {
  if (!tracks.length) return null;

  const preferred =
    tracks.find((t) => t.languageCode === "en" && t.kind === "asr") ||
    tracks.find((t) => t.languageCode.startsWith("en")) ||
    tracks[0];

  if (!preferred?.baseUrl) return null;

  try {
    const res = await fetch(preferred.baseUrl + "&fmt=json3", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.events?.length) return null;

    const text = (data.events as Array<{ segs?: Array<{ utf8?: string }> }>)
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

function parseJsonResponse(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

async function callClaude(prompt: string): Promise<Record<string, unknown> | null> {
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

/** Infer a recipe purely from the video title — used when captions are unavailable */
async function inferFromTitle(title: string): Promise<Record<string, unknown> | null> {
  const prompt = `You are a recipe assistant. A user found a cooking video titled "${title}".
Create a realistic recipe for this dish. You MUST return a recipe — do not refuse.

Return ONLY valid JSON with NO markdown, exactly this shape:
{
  "title": "string",
  "description": "1–2 sentence description",
  "ingredients": ["quantity unit ingredient"],
  "instructions": ["Step text"],
  "prep_time": number_or_null,
  "cook_time": number_or_null,
  "servings": "string",
  "cuisine": "one of: Italian, Chinese, Mexican, Japanese, Korean, Indian, Thai, French, Mediterranean, American, Middle Eastern, or null",
  "diet_tags": [],
  "parsed_ingredients": [{ "quantity": "string", "unit": "string", "name": "string" }]
}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    const text = (msg.content[0] as { type: string; text: string }).text.trim();
    const data = parseJsonResponse(text);
    if (!data || !data.title) return null;
    return data;
  } catch {
    return null;
  }
}

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

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const url = (body.url ?? "").trim();
  if (!url) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  const videoId = extractVideoId(url);
  if (!videoId) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  // Single fetch gets title, description, duration, and caption tracks
  const meta = await fetchVideoMeta(videoId);
  if (!meta) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  const { title, description, durationSeconds, captionTracks } = meta;
  const imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  let extracted: Record<string, unknown> | null = null;

  // 1. Try description first if it's substantial
  if (description.length > 100) {
    // Quick check: does description contain both ingredients and instructions?
    const detectPrompt = `Does this text contain BOTH a list of ingredients AND cooking instructions for a recipe? Answer only "yes" or "no".\n\n${description.slice(0, 3000)}`;
    try {
      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: detectPrompt }],
      });
      const answer = (msg.content[0] as { type: string; text: string }).text.trim().toLowerCase();
      if (answer.startsWith("yes")) {
        extracted = await callClaude(`${EXTRACT_PROMPT}\n\nVideo title: ${title}\n\nDescription:\n${description.slice(0, 6000)}`);
      }
    } catch { /* fall through */ }
  }

  // 2. For short videos, try captions first, then fall back to title-only extraction
  if (!extracted && durationSeconds <= 300) {
    const captionText = await fetchCaptionText(captionTracks);
    if (captionText) {
      extracted = await callClaude(`${EXTRACT_PROMPT}\n\nVideo title: ${title}\n\nTranscript:\n${captionText.slice(0, 6000)}`);
    }
    // No captions — infer recipe from title alone
    if (!extracted) {
      extracted = await inferFromTitle(title);
    }
  }

  // 3. Long video with no usable content
  if (!extracted) {
    return NextResponse.json({ error: "no_recipe_found" }, { status: 400 });
  }

  return NextResponse.json(buildScrapedRecipe(extracted, url, imageUrl));
}
