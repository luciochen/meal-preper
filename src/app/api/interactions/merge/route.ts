import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/interactions/merge
 * Body: { anon_id: string }
 *
 * Migrates all recipe_interactions rows from an anonymous session into the
 * authenticated user's account. Called once on login, then anon_id is cleared
 * from localStorage.
 *
 * Conflict resolution:
 *   - view_long / view_short: keep earliest created_at (penalty decays sooner)
 *   - impression_miss:        keep most recent created_at (stronger suppression)
 *   - save:                   keep all (COUNT(DISTINCT) in social score handles dupes)
 */
export async function POST(req: NextRequest) {
  // Authenticate the request
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const anon_id: string | undefined = body?.anon_id;
  if (!anon_id) {
    return NextResponse.json({ error: "anon_id required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "service unavailable" }, { status: 503 });
  }

  // Fetch all anon rows
  const { data: anonRows, error: fetchErr } = await supabase
    .from("recipe_interactions")
    .select("id, recipe_id, event_type, created_at")
    .eq("anon_id", anon_id);

  if (fetchErr) {
    console.error("[interactions/merge] fetch:", fetchErr.message);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!anonRows || anonRows.length === 0) {
    return NextResponse.json({ merged: 0 });
  }

  // Fetch existing auth-user rows for the same recipes to resolve conflicts
  const recipeIds = [...new Set(anonRows.map((r) => r.recipe_id))];
  const { data: existingRows } = await supabase
    .from("recipe_interactions")
    .select("id, recipe_id, event_type, created_at")
    .eq("user_id", user.id)
    .in("recipe_id", recipeIds);

  const existingMap = new Map<string, { id: string; created_at: string }>();
  for (const row of existingRows ?? []) {
    // Key: recipe_id + event_type (save is not deduped — insert all)
    if (row.event_type !== "save") {
      existingMap.set(`${row.recipe_id}:${row.event_type}`, {
        id: row.id,
        created_at: row.created_at,
      });
    }
  }

  let merged = 0;
  const toDelete: string[] = [];

  for (const anonRow of anonRows) {
    const key = `${anonRow.recipe_id}:${anonRow.event_type}`;
    const existing = existingMap.get(key);

    if (anonRow.event_type === "save") {
      // Keep all save records — just update identity
      await supabase
        .from("recipe_interactions")
        .update({ user_id: user.id, anon_id: null })
        .eq("id", anonRow.id);
      merged++;
    } else if (!existing) {
      // No conflict — migrate the row
      await supabase
        .from("recipe_interactions")
        .update({ user_id: user.id, anon_id: null })
        .eq("id", anonRow.id);
      merged++;
    } else {
      // Conflict — apply resolution strategy
      const keepAnon =
        anonRow.event_type === "impression_miss"
          ? anonRow.created_at > existing.created_at  // keep most recent miss
          : anonRow.created_at < existing.created_at; // keep earliest view

      if (keepAnon) {
        // Replace existing auth row with the anon row's timestamp
        await supabase
          .from("recipe_interactions")
          .update({ user_id: user.id, anon_id: null, created_at: anonRow.created_at })
          .eq("id", anonRow.id);
        toDelete.push(existing.id);
        merged++;
      } else {
        // Discard the anon row — existing auth row wins
        toDelete.push(anonRow.id);
      }
    }
  }

  // Clean up losing rows
  if (toDelete.length > 0) {
    await supabase.from("recipe_interactions").delete().in("id", toDelete);
  }

  return NextResponse.json({ merged });
}
