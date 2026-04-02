"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { Recipe } from "@/lib/mockData";
import { adjustScore } from "@/lib/recipeScores";
import { createClient } from "@/lib/supabase/client";

export interface MealPlanItem {
  recipe: Recipe;
  servings: number;
}

export interface UserPreferences {
  diets: string[];
  cuisines: string[];
  allergies: string[];
}

export interface UserProfile {
  displayName: string;
}

interface AppContextType {
  // Auth
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  pendingAction: string | null;
  clearPendingAction: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // Data
  preferences: UserPreferences;
  setPreferences: (prefs: UserPreferences) => void;
  onboardingDone: boolean;
  setOnboardingDone: (done: boolean) => void;
  mealPlan: MealPlanItem[];
  addToMealPlan: (recipe: Recipe, servings: number) => void;
  removeFromMealPlan: (recipeId: number | string) => void;
  clearMealPlan: () => void;
  updateServings: (recipeId: number | string, servings: number) => void;
  isInMealPlan: (recipeId: number | string) => boolean;
  getMealPlanServings: (recipeId: number | string) => number;
}

const AppContext = createContext<AppContextType | null>(null);

// ── localStorage helpers ─────────────────────────────────────────────────────

function lsGetPrefs(): UserPreferences {
  try {
    const s = localStorage.getItem("mealpreper_prefs");
    return s ? JSON.parse(s) : { diets: [], cuisines: [], allergies: [] };
  } catch { return { diets: [], cuisines: [], allergies: [] }; }
}

function lsGetPlan(): MealPlanItem[] {
  try {
    const s = localStorage.getItem("mealpreper_plan");
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function lsSavePrefs(p: UserPreferences) {
  try { localStorage.setItem("mealpreper_prefs", JSON.stringify(p)); } catch {}
}

function lsSavePlan(plan: MealPlanItem[]) {
  try { localStorage.setItem("mealpreper_plan", JSON.stringify(plan)); } catch {}
}

// ── Supabase helpers ─────────────────────────────────────────────────────────

async function dbLoadPrefs(supabase: ReturnType<typeof createClient>, userId: string): Promise<UserPreferences | null> {
  const { data } = await supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  return { diets: data.diets ?? [], cuisines: data.cuisines ?? [], allergies: data.allergies ?? [] };
}

async function dbSavePrefs(supabase: ReturnType<typeof createClient>, userId: string, prefs: UserPreferences) {
  await supabase.from("user_preferences").upsert({
    user_id: userId, ...prefs, updated_at: new Date().toISOString(),
  });
}

async function dbLoadPlan(supabase: ReturnType<typeof createClient>, userId: string): Promise<MealPlanItem[]> {
  const { data } = await supabase.from("meal_plan_items").select("*").eq("user_id", userId).order("added_at");
  if (!data) return [];
  return data.map((row: Record<string, unknown>) => ({ recipe: row.recipe_snapshot as Recipe, servings: row.servings as number }));
}

async function dbUpsertPlanItem(supabase: ReturnType<typeof createClient>, userId: string, item: MealPlanItem) {
  await supabase.from("meal_plan_items").upsert({
    user_id: userId,
    recipe_id: String(item.recipe.id),
    recipe_snapshot: item.recipe,
    servings: item.servings,
  });
}

async function dbDeletePlanItem(supabase: ReturnType<typeof createClient>, userId: string, recipeId: number | string) {
  await supabase.from("meal_plan_items").delete().eq("user_id", userId).eq("recipe_id", String(recipeId));
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const [preferences, setPreferencesState] = useState<UserPreferences>({ diets: [], cuisines: [], allergies: [] });
  const [onboardingDone, setOnboardingDoneState] = useState(true);
  const [mealPlan, setMealPlan] = useState<MealPlanItem[]>([]);

  const supabaseRef = useRef(createClient());

  const loadFromSupabase = useCallback(async (userId: string) => {
    const supabase = supabaseRef.current;
    const [prefs, plan] = await Promise.all([
      dbLoadPrefs(supabase, userId),
      dbLoadPlan(supabase, userId),
    ]);
    if (prefs) setPreferencesState(prefs);
    setMealPlan(plan);
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;

    const handleSignedIn = async (signedInUser: User) => {
      const displayName =
        signedInUser.user_metadata?.full_name ||
        signedInUser.user_metadata?.name ||
        signedInUser.email ||
        "User";
      setUser(signedInUser);
      setProfile({ displayName });

      // Refresh the token before any DB calls — INITIAL_SESSION can fire with
      // a stale JWT (e.g. right after OAuth redirect when old cookies linger),
      // causing 401s on all subsequent REST requests.
      const { data: { session: fresh } } = await supabase.auth.refreshSession();
      if (fresh) {
        await loadFromSupabase(fresh.user.id);
      }

      const action = localStorage.getItem("tangie_pending_action");
      if (action) { localStorage.removeItem("tangie_pending_action"); setPendingAction(action); }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: { user: import("@supabase/supabase-js").User } | null) => {
      console.log("[Auth] event:", event, "session:", session);
      if (event === "INITIAL_SESSION") {
        if (session?.user) {
          await handleSignedIn(session.user);
        } else {
          try {
            const stored = localStorage.getItem("mealpreper_prefs");
            if (stored) setPreferencesState(JSON.parse(stored));
            const done = localStorage.getItem("mealpreper_onboarded");
            if (done === "true") setOnboardingDoneState(true);
            const plan = localStorage.getItem("mealpreper_plan");
            if (plan) setMealPlan(JSON.parse(plan));
          } catch {}
        }
        setAuthLoading(false);
      } else if (event === "SIGNED_IN" && session?.user) {
        await handleSignedIn(session.user);
        setAuthLoading(false);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setAuthLoading(false);
        setPreferencesState(lsGetPrefs());
        setMealPlan(lsGetPlan());
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth actions ─────────────────────────────────────────────────────────

  const signInWithGoogle = useCallback(async () => {
    await supabaseRef.current.auth.signOut({ scope: "local" }).catch(() => {});
    await supabaseRef.current.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }, []);

  const clearPendingAction = useCallback(() => setPendingAction(null), []);

  const signOut = useCallback(async () => {
    await supabaseRef.current.auth.signOut();
  }, []);

  // ── Data actions (dual write) ─────────────────────────────────────────────

  const setPreferences = useCallback((prefs: UserPreferences) => {
    setPreferencesState(prefs);
    if (user) {
      dbSavePrefs(supabaseRef.current, user.id, prefs);
    } else {
      lsSavePrefs(prefs);
    }
  }, [user]);

  const setOnboardingDone = useCallback((done: boolean) => {
    setOnboardingDoneState(done);
    localStorage.setItem("mealpreper_onboarded", String(done));
  }, []);

  const addToMealPlan = useCallback((recipe: Recipe, servings: number) => {
    setMealPlan((prev) => {
      const exists = prev.find((i) => i.recipe.id === recipe.id);
      const next = exists
        ? prev.map((i) => (i.recipe.id === recipe.id ? { ...i, servings } : i))
        : [...prev, { recipe, servings }];
      if (user) {
        dbUpsertPlanItem(supabaseRef.current, user.id, { recipe, servings });
      } else {
        lsSavePlan(next);
      }
      return next;
    });
  }, [user]);

  const removeFromMealPlan = useCallback((recipeId: number | string) => {
    adjustScore(recipeId, -3);
    setMealPlan((prev) => {
      const next = prev.filter((i) => String(i.recipe.id) !== String(recipeId));
      if (user) {
        dbDeletePlanItem(supabaseRef.current, user.id, recipeId);
      } else {
        lsSavePlan(next);
      }
      return next;
    });
  }, [user]);

  const clearMealPlan = useCallback(() => {
    setMealPlan([]);
    if (user) {
      supabaseRef.current.from("meal_plan_items").delete().eq("user_id", user.id);
    } else {
      lsSavePlan([]);
    }
  }, [user]);

  const updateServings = useCallback((recipeId: number | string, servings: number) => {
    setMealPlan((prev) => {
      const next = prev.map((i) => (String(i.recipe.id) === String(recipeId) ? { ...i, servings } : i));
      if (user) {
        const item = next.find((i) => String(i.recipe.id) === String(recipeId));
        if (item) dbUpsertPlanItem(supabaseRef.current, user.id, item);
      } else {
        lsSavePlan(next);
      }
      return next;
    });
  }, [user]);

  const isInMealPlan = useCallback(
    (recipeId: number | string) => mealPlan.some((i) => String(i.recipe.id) === String(recipeId)),
    [mealPlan]
  );
  const getMealPlanServings = useCallback(
    (recipeId: number | string) => mealPlan.find((i) => String(i.recipe.id) === String(recipeId))?.servings ?? 0,
    [mealPlan]
  );

  return (
    <AppContext.Provider value={{
      user, profile, authLoading, pendingAction, clearPendingAction,
      signInWithGoogle, signOut,
      preferences, setPreferences,
      onboardingDone, setOnboardingDone,
      mealPlan, addToMealPlan, removeFromMealPlan, clearMealPlan, updateServings,
      isInMealPlan, getMealPlanServings,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
