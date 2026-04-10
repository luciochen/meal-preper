import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createClient, createServiceClient } from "@/lib/supabase/server";
import { FEATURED_USER_ID } from "@/lib/featured";
import { userRecipeToRecipe, UserRecipe } from "@/lib/userRecipes";
import { filterByIngredients, filterByTitle } from "@/lib/fuzzySearch";
import { getTranslation, DEFAULT_LOCALE, RecipeTranslations } from "@/lib/i18n";
import {
  FEED_FLAGS,
  CURRENT_PHASE,
  SOCIAL_SCORE_MIN_SAVERS,
} from "@/lib/feedConfig";
import {
  socialScore,
  affinityBoost,
  viewPenaltyMultiplier,
  finalScore,
  type RecipeSignals,
  type UserAffinityProfile,
} from "@/lib/feedScoring";
import { applyDiversity, PROTEIN_KEYWORDS } from "@/lib/feedDiversity";
import type { Recipe } from "@/lib/mockData";

// ── Reused filter helpers (mirrors /api/recipes/search) ──────────────────────

const DIET_TAG_MAP: Record<string, string[]> = {
  "vegan":        ["vegan"],
  "vegetarian":   ["vegetarian"],
  "easy":         ["easy"],
  "make-ahead":   ["make-ahead"],
  "freeze-it":    ["freeze-it"],
  "low calorie":  ["low-calorie", "low-in-something"],
  "high protein": [],
};

function dbRowToRecipe(row: Record<string, unknown>): Recipe {
  const t = getTranslation(row.translations as RecipeTranslations | null, DEFAULT_LOCALE);
  const baseIngredients = (row.ingredients as { name: string }[]) ?? [];
  const baseSteps = (row.steps as { number: number; step: string }[]) || [];
  const tags = (row.tags as string[]) ?? [];
  return {
    id: row.id as number,
    title: t?.title ?? (row.title as string),
    image: row.image_url as string | undefined || undefined,
    readyInMinutes: (row.minutes as number) ?? 30,
    servings: (row.servings as number) ?? 4,
    calories: (row.calories as number) ?? null,
    // tags[] contains both cuisine and diet values; put in both fields
    // so affinityBoost can match against user.cuisines AND user.diets
    diets: tags,
    cuisines: tags,
    dishTypes: tags,
    fridgeLife: row.fridge_life as Recipe["fridgeLife"],
    microwaveScore: row.microwave_score as Recipe["microwaveScore"],
    extendedIngredients: baseIngredients.map((ing, i) => ({
      id: i,
      name: t?.ingredients?.[i]?.name ?? ing.name,
      amount: 0,
      unit: "",
      aisle: "",
    })),
    analyzedInstructions: [{ steps: t?.steps ?? baseSteps }],
  };
}

async function fetchDbRecipes(
  supabase: ReturnType<typeof createPublicClient>,
  params: { query: string; diet: string; cuisine: string; intolerances: string; proteins: string; minutesMax: number | null; microwaveOnly: boolean }
): Promise<Recipe[]> {
  if (!supabase) return [];

  const buildBase = () =>
    supabase.from("recipes").select("*").eq("enabled", true).order("id", { ascending: true });

  const applyFilters = (q: ReturnType<typeof buildBase>) => {
    if (params.diet) {
      const dietIds = params.diet.split(",").map((d) => d.trim()).filter(Boolean);
      const mappedTags = dietIds.flatMap((d) => DIET_TAG_MAP[d] ?? [d]);
      if (mappedTags.length > 0) q = q.overlaps("tags", mappedTags);
    }
    if (params.cuisine) {
      const cuisines = params.cuisine.split(",").map((c) => c.trim()).filter(Boolean);
      if (cuisines.length > 0) q = q.overlaps("tags", cuisines);
    }
    if (params.minutesMax) q = q.lte("minutes", params.minutesMax);
    return q;
  };

  let titleRows: Record<string, unknown>[] = [];
  let ingredientPool: Record<string, unknown>[] = [];

  if (params.query) {
    const [ftsFetch, poolFetch] = await Promise.all([
      applyFilters(buildBase().textSearch("search_vec", params.query, { type: "websearch" })).limit(100),
      applyFilters(buildBase()).limit(200),
    ]);
    titleRows = ftsFetch.data ?? [];
    ingredientPool = poolFetch.data ?? [];
  } else {
    const { data } = await applyFilters(buildBase()).limit(200);
    ingredientPool = data ?? [];
  }

  const postFilter = (rows: Record<string, unknown>[]) => {
    let r = rows;
    if (params.microwaveOnly) {
      r = r.filter((row) => {
        const level = (row.microwave_score as { level?: string })?.level;
        return level === "excellent" || level === "good";
      });
    }
    if (params.intolerances) {
      const allergens = params.intolerances.split(",").map((a) => a.trim().toLowerCase());
      r = r.filter((row) => {
        const ings = (row.ingredients as { name: string }[]) ?? [];
        return !allergens.some((a) => ings.some((i) => i.name.toLowerCase().includes(a)));
      });
    }
    if (params.proteins) {
      const selected = params.proteins.split(",").map((p) => p.trim().toLowerCase());
      const keywords = selected.flatMap((p) => PROTEIN_KEYWORDS[p] ?? []);
      if (keywords.length > 0) {
        r = r.filter((row) => {
          const ings = (row.ingredients as { name: string }[]) ?? [];
          const haystack = ings.map((i) => i.name.toLowerCase()).join(" ");
          return keywords.some((k) => haystack.includes(k));
        });
      }
    }
    return r;
  };

  if (!params.query) {
    return postFilter(ingredientPool).map(dbRowToRecipe);
  }

  const titleMapped = postFilter(titleRows).map(dbRowToRecipe);
  const titleIds = new Set(titleMapped.map((r) => String(r.id)));
  const ingMapped = postFilter(ingredientPool).map(dbRowToRecipe).filter((r) => !titleIds.has(String(r.id)));
  const ingMatches = filterByIngredients(ingMapped, params.query);

  return [...titleMapped, ...ingMatches];
}

async function fetchFeaturedRecipes(
  supabase: ReturnType<typeof createPublicClient>,
  params: { query: string; diet: string; cuisine: string; intolerances: string; proteins: string }
): Promise<Recipe[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("user_recipes")
    .select("*")
    .eq("user_id", FEATURED_USER_ID)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  let results = data as UserRecipe[];

  if (params.cuisine) {
    const cuisines = params.cuisine.split(",").map((c) => c.trim().toLowerCase());
    results = results.filter((r) => r.cuisine && cuisines.includes(r.cuisine.toLowerCase()));
  }
  if (params.diet) {
    const diets = params.diet.split(",").map((d) => d.trim().toLowerCase());
    results = results.filter((r) => diets.some((d) => r.diet_tags.some((tag) => tag.toLowerCase() === d)));
  }
  if (params.intolerances) {
    const allergens = params.intolerances.split(",").map((a) => a.trim().toLowerCase());
    results = results.filter((r) =>
      !allergens.some((allergen) => r.ingredients_json.some((ing) => ing.name.toLowerCase().includes(allergen)))
    );
  }
  if (params.proteins) {
    const selected = params.proteins.split(",").map((p) => p.trim().toLowerCase());
    const keywords = selected.flatMap((p) => PROTEIN_KEYWORDS[p] ?? []);
    if (keywords.length > 0) {
      results = results.filter((r) => {
        const haystack = r.ingredients_json.map((i) => i.name.toLowerCase()).join(" ");
        return keywords.some((k) => haystack.includes(k));
      });
    }
  }

  const mapped = results.map(userRecipeToRecipe);
  if (!params.query) return mapped;

  const titleMatches = filterByTitle(mapped, params.query);
  const titleIds = new Set(titleMatches.map((r) => String(r.id)));
  const ingMatches = filterByIngredients(mapped, params.query).filter((r) => !titleIds.has(String(r.id)));
  return [...titleMatches, ...ingMatches];
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query        = searchParams.get("query") || "";
  const diet         = searchParams.get("diet") || "";
  const cuisine      = searchParams.get("cuisine") || "";
  const intolerances = searchParams.get("intolerances") || "";
  const proteins     = searchParams.get("proteins") || "";
  const minutesMax   = searchParams.get("minutes_max") ? parseInt(searchParams.get("minutes_max")!) : null;
  const microwaveOnly = searchParams.get("microwave") === "1";
  const userId       = searchParams.get("user_id") || null;
  const anonId       = searchParams.get("anon_id") || null;

  const filterParams = { query, diet, cuisine, intolerances, proteins, minutesMax, microwaveOnly };

  const publicClient = createPublicClient();

  // Fetch both recipe sources in parallel
  const [dbRecipes, featuredRecipes] = await Promise.all([
    fetchDbRecipes(publicClient, filterParams),
    fetchFeaturedRecipes(publicClient, { query, diet, cuisine, intolerances, proteins }),
  ]);

  // Deduplicate: featured first, then DB (excluding IDs already in featured)
  const featuredIds = new Set(featuredRecipes.map((r) => String(r.id)));
  const merged: Recipe[] = [
    ...featuredRecipes,
    ...dbRecipes.filter((r) => !featuredIds.has(String(r.id))),
  ];

  // ── Phase 1: no personalization ─────────────────────────────────────────────
  if (FEED_FLAGS.randomShuffle) {
    return NextResponse.json({ results: merged, phase: CURRENT_PHASE });
  }

  // ── Phase 2+: personalized scoring ──────────────────────────────────────────

  // Load user affinity profile
  let affinityProfile: UserAffinityProfile = { cuisines: [], diets: [] };
  if (userId || anonId) {
    // For auth users we can load their preferences
    if (userId) {
      const serviceClient = createServiceClient();
      if (serviceClient) {
        const { data: prefs } = await serviceClient
          .from("user_preferences")
          .select("cuisines, diets")
          .eq("user_id", userId)
          .maybeSingle();
        if (prefs) {
          affinityProfile = {
            cuisines: prefs.cuisines ?? [],
            diets: prefs.diets ?? [],
          };
        }
      }
    }
    // For anon users, preferences are client-side only — affinity_boost = 0 (cold start is fine)
  }

  // Load view interactions for view_penalty
  const serviceClient = createServiceClient();
  type ViewRow = { recipe_id: string; event_type: string; created_at: string };
  let viewRows: ViewRow[] = [];

  if (serviceClient && (userId || anonId)) {
    const identityQuery = userId
      ? serviceClient
          .from("recipe_interactions")
          .select("recipe_id, event_type, created_at")
          .eq("user_id", userId)
      : serviceClient
          .from("recipe_interactions")
          .select("recipe_id, event_type, created_at")
          .eq("anon_id", anonId!);

    const { data } = await identityQuery
      .in("event_type", ["view_long", "view_short"])
      .order("created_at", { ascending: false });
    viewRows = (data as ViewRow[]) ?? [];
  }

  // Build a map: recipe_id → most recent view date (for view_penalty)
  const lastViewedMap = new Map<string, Date>();
  for (const row of viewRows) {
    if (!lastViewedMap.has(row.recipe_id)) {
      lastViewedMap.set(row.recipe_id, new Date(row.created_at));
    }
  }

  // Load meal plan items (to apply strong view penalty = t=0)
  const mealPlanIds = new Set<string>();
  if (serviceClient && userId) {
    const { data: planData } = await serviceClient
      .from("meal_plan_items")
      .select("recipe_id")
      .eq("user_id", userId);
    for (const row of planData ?? []) {
      mealPlanIds.add(String(row.recipe_id));
    }
  }

  // Load social scores (Phase 3 only — materialized view)
  type SocialRow = { recipe_id: string; save_count: number; engaged_view_count: number };
  let socialMap = new Map<string, SocialRow>();
  if (FEED_FLAGS.useSocialScore && serviceClient) {
    const recipeIds = merged.map((r) => String(r.id));
    const { data: socialData } = await serviceClient
      .from("recipe_social_scores")
      .select("recipe_id, save_count, engaged_view_count")
      .in("recipe_id", recipeIds);
    for (const row of (socialData as SocialRow[]) ?? []) {
      socialMap.set(row.recipe_id, row);
    }
  }

  // ── Score each recipe ────────────────────────────────────────────────────────
  const now = Date.now();
  const EPOCH = new Date(now); // "just now" for fresh meal-plan penalty

  const scored = merged.map((recipe) => {
    const rid = String(recipe.id);
    const signals: RecipeSignals = {
      cuisines: recipe.cuisines,
      dietTags: recipe.diets,
      minutes: recipe.readyInMinutes,
    };

    const social = FEED_FLAGS.useSocialScore
      ? (() => {
          const s = socialMap.get(rid);
          return s ? socialScore(s.save_count, s.engaged_view_count) : 0;
        })()
      : 0;

    const affinity = FEED_FLAGS.useAffinityBoost
      ? affinityBoost(signals, affinityProfile)
      : 0;

    const viewPenalty = FEED_FLAGS.useViewPenalty
      ? (() => {
          if (mealPlanIds.has(rid)) {
            // Treat meal-plan items as just-viewed: maximum suppression (5%)
            return viewPenaltyMultiplier(EPOCH);
          }
          const lastViewed = lastViewedMap.get(rid);
          return lastViewed ? viewPenaltyMultiplier(lastViewed) : 1;
        })()
      : 1;

    // Impression penalty is applied client-side (session-only data)
    const score = finalScore({
      socialScore: social,
      affinityBoost: affinity,
      viewPenalty,
      impressionPenalty: 1, // client applies this layer on top
    });

    return { ...recipe, _serverScore: score };
  });

  // Sort descending by score (stable — equal scores preserve original order)
  scored.sort((a, b) => b._serverScore - a._serverScore);

  // Apply diversity rules
  const diversified = FEED_FLAGS.useDiversity
    ? applyDiversity(scored as Recipe[])
    : scored;

  return NextResponse.json({ results: diversified, phase: CURRENT_PHASE });
}
