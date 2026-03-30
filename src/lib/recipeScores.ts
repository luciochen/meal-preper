const KEY = "tangie_recipe_scores";
const CLAMP = { min: -30, max: 60 };

function clamp(n: number): number {
  return Math.max(CLAMP.min, Math.min(CLAMP.max, n));
}

export function getScores(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function getScore(id: string | number): number {
  return getScores()[String(id)] ?? 0;
}

export function adjustScore(id: string | number, delta: number): void {
  if (typeof window === "undefined") return;
  const scores = getScores();
  const key = String(id);
  scores[key] = clamp((scores[key] ?? 0) + delta);
  localStorage.setItem(KEY, JSON.stringify(scores));
}

export function rankRecipes<T extends { id: string | number }>(recipes: T[]): T[] {
  const scores = getScores();
  return [...recipes].sort((a, b) => {
    const sa = scores[String(a.id)] ?? 0;
    const sb = scores[String(b.id)] ?? 0;
    return sb - sa; // descending; equal scores keep original (stable) order
  });
}
