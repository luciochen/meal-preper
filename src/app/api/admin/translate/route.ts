// POST /api/admin/translate
// Reads all Supabase recipes, generates English translations via Claude,
// and writes them back into the `translations` JSONB column.
//
// Usage:
//   curl -X POST http://localhost:3000/api/admin/translate \
//        -H "x-admin-key: <ADMIN_KEY>"

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const ADMIN_KEY = process.env.ADMIN_KEY;

async function translateRecipe(
  client: Anthropic,
  recipe: {
    id: number | string;
    title: string;
    ingredients: { name: string; raw?: string }[];
    steps: { number: number; step: string }[];
  }
) {
  const prompt = `You are a bilingual Chinese-English food translator specializing in recipes.
Translate the following recipe fields from Chinese to English.
Return ONLY a valid JSON object — no markdown, no explanation.

Rules:
- Convert ALL Chinese units to standard English cooking units:
  克/g→g, 毫升/ml→ml, 升→L, 斤→500g, 公斤/千克→kg,
  汤匙/大匙/大勺→tbsp, 茶匙/小匙/小勺→tsp, 杯→cup,
  个/只/颗/粒/片/块/根/条/瓣/头/把→piece (use natural English equivalent),
  适量→to taste, 少许→a pinch of, 半→½
- In the "raw" field, write the full English quantity+unit+ingredient string (e.g. "2 tbsp soy sauce")
- Ingredient "name" should be just the ingredient name without quantity
- Keep numbers as numbers

Schema:
{
  "title": "<English title>",
  "ingredients": [{ "name": "<English ingredient name>", "raw": "<quantity + English unit + English name>" }],
  "steps": [{ "number": <number>, "step": "<English step>" }]
}

Recipe:
${JSON.stringify({ title: recipe.title, ingredients: recipe.ingredients, steps: recipe.steps }, null, 2)}`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";
  // Strip markdown code fences if present
  const json = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(json);
}

export async function POST(req: NextRequest) {
  const supabase = createPublicClient();
  if (!supabase) return NextResponse.json({ error: "No Supabase" }, { status: 503 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No ANTHROPIC_API_KEY" }, { status: 503 });

  // Simple admin gate
  const reqKey = req.headers.get("x-admin-key");
  if (ADMIN_KEY && reqKey !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("recipes")
    .select("id, title, ingredients, steps, translations")
    .eq("enabled", true);

  if (error || !data) return NextResponse.json({ error: "Fetch failed" }, { status: 500 });

  const client = new Anthropic({ apiKey });
  const results: { id: number | string; status: string; error?: string }[] = [];

  for (const row of data) {
    const existing = row.translations as Record<string, unknown> | null;

    // Skip if English translation already exists and has correct units
    // Pass ?force=1 to re-translate all recipes
    const force = new URL(req.url).searchParams.get("force") === "1";
    if (existing?.en && !force) {
      results.push({ id: row.id, status: "skipped (already translated)" });
      continue;
    }

    // Skip if title contains no Chinese characters — already in English
    const hasChinese = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(row.title as string ?? "");
    if (!hasChinese) {
      results.push({ id: row.id, status: "skipped (already English)" });
      continue;
    }

    try {
      const en = await translateRecipe(client, {
        id: row.id,
        title: row.title as string,
        ingredients: (row.ingredients as { name: string; raw?: string }[]) ?? [],
        steps: (row.steps as { number: number; step: string }[]) ?? [],
      });

      const translations = { ...(existing ?? {}), en };

      const { error: updateErr } = await supabase
        .from("recipes")
        .update({ translations })
        .eq("id", row.id);

      if (updateErr) throw updateErr;
      results.push({ id: row.id, status: "translated" });
    } catch (e) {
      results.push({ id: row.id, status: "error", error: String(e) });
    }
  }

  return NextResponse.json({ results });
}
