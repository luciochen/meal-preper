const ANON_ID_KEY = "mealpreper_anon_id";

/**
 * Returns the stored anonymous UUID, or creates and stores a new one.
 * Safe to call on every page load — idempotent.
 */
export function getOrCreateAnonId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
    return id;
  } catch {
    return "";
  }
}

/** Read-only — returns null if no anon ID has been created yet. */
export function getAnonId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ANON_ID_KEY);
  } catch {
    return null;
  }
}

/** Called after a successful anon → auth merge to avoid re-merging on next login. */
export function clearAnonId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ANON_ID_KEY);
  } catch {}
}
