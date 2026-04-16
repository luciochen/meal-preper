export type FeedPhase = 1 | 2 | 3;

/**
 * Current rollout phase. Change this to activate personalization:
 *   1 = random shuffle (no personalization, existing behavior)
 *   2 = view_penalty + affinity_boost + diversity
 *   3 = full social scoring enabled (requires ~50% recipes with 5+ savers)
 */
// eslint-disable-next-line @typescript-eslint/no-inferrable-types
export const CURRENT_PHASE: FeedPhase = 2 as FeedPhase;

export const FEED_FLAGS = {
  randomShuffle:    CURRENT_PHASE === 1,
  useViewPenalty:   CURRENT_PHASE >= 2,
  useAffinityBoost: CURRENT_PHASE >= 2,
  useSocialScore:   CURRENT_PHASE >= 3,
  useDiversity:     CURRENT_PHASE >= 2,
} as const;

// ── Decay constants ────────────────────────────────────────────────────────────
/** view_penalty half-life: score halves every 3.5 days, ~87% recovered at 10 days */
export const VIEW_PENALTY_HALF_LIFE_DAYS = 3.5;
/** impression_penalty half-life: 1 day, ~95% recovered at 3 days */
export const IMPRESSION_PENALTY_HALF_LIFE_DAYS = 1;
/** Floor for view_penalty: heavily-viewed recipes keep 5% of their score */
export const VIEW_PENALTY_FLOOR = 0.05;
/** Floor for impression_penalty: repeatedly-ignored recipes keep 60% */
export const IMPRESSION_PENALTY_FLOOR = 0.6;

// ── Social score ───────────────────────────────────────────────────────────────
/** Zero social_score until recipe has this many distinct savers */
export const SOCIAL_SCORE_MIN_SAVERS = 5;

// ── Diversity rules ────────────────────────────────────────────────────────────
export const DIVERSITY_WINDOW            = 8;
export const MAX_SAME_CUISINE_PER_WINDOW = 2;
export const MAX_SAME_PROTEIN_PER_WINDOW = 2;
/** Guarantee at least 1 vegan/vegetarian recipe per N slots */
export const VEGAN_VEG_GUARANTEE_SLOTS   = 16;
