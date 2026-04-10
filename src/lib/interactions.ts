import { getOrCreateAnonId } from "./anonId";

export type InteractionEventType = "view_short" | "view_long" | "save" | "impression_miss";

interface InteractionPayload {
  recipe_id: string;
  event_type: InteractionEventType;
  user_id?: string;
  anon_id?: string;
}

/**
 * Fire-and-forget interaction event.
 *
 * Uses `keepalive: true` so the request survives tab close / modal unmount —
 * critical for view signals fired on the cleanup path of a useEffect.
 *
 * Never throws — errors are silently swallowed in production.
 */
export function sendInteraction(
  recipeId: string | number,
  eventType: InteractionEventType,
  userId?: string,
): void {
  const payload: InteractionPayload = {
    recipe_id: String(recipeId),
    event_type: eventType,
  };

  if (userId) {
    payload.user_id = userId;
  } else {
    const anonId = getOrCreateAnonId();
    if (anonId) payload.anon_id = anonId;
  }

  fetch("/api/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch((e) => {
    if (process.env.NODE_ENV === "development") {
      console.warn("[interactions]", e);
    }
  });
}
