import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { InteractionEventType } from "@/lib/interactions";

const VALID_EVENTS: InteractionEventType[] = [
  "view_short",
  "view_long",
  "save",
  "impression_miss",
];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { recipe_id, event_type, user_id, anon_id } = body as {
    recipe_id?: string;
    event_type?: string;
    user_id?: string;
    anon_id?: string;
  };

  if (!recipe_id || !event_type || !VALID_EVENTS.includes(event_type as InteractionEventType)) {
    return NextResponse.json({ error: "missing or invalid fields" }, { status: 400 });
  }

  // Exactly one identity must be present
  if ((!user_id && !anon_id) || (user_id && anon_id)) {
    return NextResponse.json({ error: "provide exactly one of user_id or anon_id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "service unavailable" }, { status: 503 });
  }

  // Deduplicate impression_miss within a 3-day window to keep table lean
  if (event_type === "impression_miss") {
    const identityFilter = user_id
      ? supabase.from("recipe_interactions").select("id", { count: "exact", head: true })
          .eq("user_id", user_id)
      : supabase.from("recipe_interactions").select("id", { count: "exact", head: true })
          .eq("anon_id", anon_id!);

    const { count } = await identityFilter
      .eq("recipe_id", recipe_id)
      .eq("event_type", "impression_miss")
      .gte("created_at", new Date(Date.now() - 3 * 86_400_000).toISOString());

    if (count && count > 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }
  }

  const row = user_id
    ? { recipe_id, event_type, user_id }
    : { recipe_id, event_type, anon_id };

  const { error } = await supabase.from("recipe_interactions").insert(row);

  if (error) {
    console.error("[interactions]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
