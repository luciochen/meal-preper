import {
  VIEW_PENALTY_HALF_LIFE_DAYS,
  IMPRESSION_PENALTY_HALF_LIFE_DAYS,
  VIEW_PENALTY_FLOOR,
  IMPRESSION_PENALTY_FLOOR,
  SOCIAL_SCORE_MIN_SAVERS,
} from "./feedConfig";

// ── Penalty formulas ──────────────────────────────────────────────────────────

/**
 * Exponential decay multiplier for viewed recipes. Range: [VIEW_PENALTY_FLOOR, 1.0]
 *
 * Formula: floor + (1 - floor) × (1 − e^(−λ×t))
 *   where λ = ln(2) / half_life
 *
 * t=0  → VIEW_PENALTY_FLOOR (5%  — nearly hidden)
 * t≈10 → ~0.87              (87% — mostly recovered)
 * t≈14 → ~0.94              (94% — fully recovered)
 */
export function viewPenaltyMultiplier(lastViewedAt: Date): number {
  const t = (Date.now() - lastViewedAt.getTime()) / 86_400_000; // ms → days
  const lambda = Math.LN2 / VIEW_PENALTY_HALF_LIFE_DAYS;
  return VIEW_PENALTY_FLOOR + (1 - VIEW_PENALTY_FLOOR) * (1 - Math.exp(-lambda * t));
}

/**
 * Exponential decay multiplier for unclicked impressions. Range: [IMPRESSION_PENALTY_FLOOR, 1.0]
 * Multiple misses compound by shifting the effective age back 0.5 days per additional miss.
 *
 * t=0, missCount=1 → IMPRESSION_PENALTY_FLOOR (60%)
 * t=1 day         → ~0.80
 * t=3 days        → ~0.95 (essentially recovered)
 */
export function impressionPenaltyMultiplier(lastMissAt: Date, missCount: number): number {
  const t = (Date.now() - lastMissAt.getTime()) / 86_400_000;
  const lambda = Math.LN2 / IMPRESSION_PENALTY_HALF_LIFE_DAYS;
  const effectiveT = Math.max(0, t - (missCount - 1) * 0.5);
  return IMPRESSION_PENALTY_FLOOR + (1 - IMPRESSION_PENALTY_FLOOR) * (1 - Math.exp(-lambda * effectiveT));
}

// ── Social score ──────────────────────────────────────────────────────────────

/**
 * Normalized social score in [0, 1].
 * Zeroed until recipe has SOCIAL_SCORE_MIN_SAVERS distinct savers.
 *
 * saveCount:        cumulative distinct savers (append-only)
 * engagedViewCount: distinct users with view_long (≥30s) events
 */
export function socialScore(saveCount: number, engagedViewCount: number): number {
  if (saveCount < SOCIAL_SCORE_MIN_SAVERS) return 0;
  const raw = saveCount * 0.7 + engagedViewCount * 0.3;
  return Math.min(1, raw / 100);
}

// ── Affinity boost ────────────────────────────────────────────────────────────

export interface RecipeSignals {
  cuisines: string[];
  dietTags: string[];
  minutes: number;
}

export interface UserAffinityProfile {
  cuisines: string[];
  diets: string[];
}

/**
 * Affinity boost in [0, 1] based on how well the recipe matches user preferences.
 *
 * cuisine_score (weight 0.6): binary — recipe shares at least one cuisine with user prefs
 * diet_score   (weight 0.4): proportional — fraction of user diets the recipe satisfies
 * quick_bonus  (+0.2, capped): bonus if user wants "easy to cook" and recipe is <30 min
 *
 * Cold start (zero prefs) → returns 0 for all recipes → stable sort preserved.
 */
export function affinityBoost(recipe: RecipeSignals, user: UserAffinityProfile): number {
  const userCuisines = user.cuisines.map((c) => c.toLowerCase());
  const userDiets    = user.diets.map((d) => d.toLowerCase());
  const recipeCuisines = recipe.cuisines.map((c) => c.toLowerCase());
  const recipeDiets    = recipe.dietTags.map((d) => d.toLowerCase());

  const cuisineScore = userCuisines.length === 0
    ? 0
    : recipeCuisines.some((c) => userCuisines.includes(c)) ? 1 : 0;

  const dietScore = userDiets.length === 0
    ? 0
    : recipeDiets.filter((d) => userDiets.includes(d)).length / userDiets.length;

  const quickBonus =
    userDiets.includes("easy to cook") && recipe.minutes < 30 ? 0.2 : 0;

  return Math.min(1, cuisineScore * 0.6 + dietScore * 0.4 + quickBonus);
}

// ── Final score ───────────────────────────────────────────────────────────────

export interface ScoringInputs {
  socialScore: number;        // 0–1
  affinityBoost: number;      // 0–1
  viewPenalty: number;        // 0.05–1.0
  impressionPenalty: number;  // 0.60–1.0
}

/**
 * final_score = (social_score + affinity_boost) × view_penalty × impression_penalty
 *
 * When both social and affinity are 0 (cold start): score = 0 for all recipes,
 * which degrades to stable original-order (no personalization).
 */
export function finalScore(inputs: ScoringInputs): number {
  const base = inputs.socialScore + inputs.affinityBoost;
  return base * inputs.viewPenalty * inputs.impressionPenalty;
}
