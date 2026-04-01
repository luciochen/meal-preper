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
  username: string;
}

interface AppContextType {
  // Auth
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  pendingAction: string | null;    // action to resume after sign-in
  clearPendingAction: () => void;
  signUpWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  pendingUsername: boolean;
  completeSignUp: (username: string) => Promise<{ error?: string }>;
  cancelSignUp: () => Promise<void>;

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
  return data.map((row) => ({ recipe: row.recipe_snapshot as Recipe, servings: row.servings }));
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
  const [pendingUsername, setPendingUsername] = useState(false);

  const [preferences, setPreferencesState] = useState<UserPreferences>({ diets: [], cuisines: [], allergies: [] });
  const [onboardingDone, setOnboardingDoneState] = useState(true);
  const [mealPlan, setMealPlan] = useState<MealPlanItem[]>([]);

  const supabaseRef = useRef(createClient());

  // Load data from Supabase for a fully signed-up user
  const loadFromSupabase = useCallback(async (userId: string) => {
    const supabase = supabaseRef.current;
    const [prefs, plan] = await Promise.all([
      dbLoadPrefs(supabase, userId),
      dbLoadPlan(supabase, userId),
    ]);
    if (prefs) setPreferencesState(prefs);
    setMealPlan(plan);
  }, []);

  // Migrate localStorage data into Supabase on first sign-up
  const migrateFromLocalStorage = useCallback(async (userId: string) => {
    const supabase = supabaseRef.current;
    const lsPrefs = lsGetPrefs();
    const lsPlan = lsGetPlan();
    await dbSavePrefs(supabase, userId, lsPrefs);
    await Promise.all(lsPlan.map((item) => dbUpsertPlanItem(supabase, userId, item)));
    setPreferencesState(lsPrefs);
    setMealPlan(lsPlan);
    // migrateFromLocalStorage used in completeSignUp below
  }, []);

  // Initial session check + auth state subscription
  useEffect(() => {
    const supabase = supabaseRef.current;
    // Track whether the initial getSession() has resolved, so onAuthStateChange
    // doesn't double-call handleSignedIn for the same session on mount.
    let initialSessionHandled = false;

    const handleSignedIn = async (signedInUser: User) => {
      // Check if profile row exists (= completed sign-up)
      const { data: profileRow } = await supabase
        .from("profiles").select("username").eq("user_id", signedInUser.id).maybeSingle();

      if (profileRow) {
        setUser(signedInUser);
        setProfile({ username: profileRow.username });
        await loadFromSupabase(signedInUser.id);
        // Resume any action that was pending before sign-in
        const action = localStorage.getItem("tangie_pending_action");
        if (action) { localStorage.removeItem("tangie_pending_action"); setPendingAction(action); }
      } else {
        // No profile yet — prompt the user to choose a username
        setUser(signedInUser);
        setPendingUsername(true);
      }
    };

    // Load initial session
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          await handleSignedIn(session.user);
        } else {
          // Signed out — use localStorage
          try {
            const stored = localStorage.getItem("mealpreper_prefs");
            if (stored) setPreferencesState(JSON.parse(stored));
            const done = localStorage.getItem("mealpreper_onboarded");
            if (done === "true") setOnboardingDoneState(true);
            const plan = localStorage.getItem("mealpreper_plan");
            if (plan) setMealPlan(JSON.parse(plan));
          } catch {}
        }
      })
      .catch(() => {
        // Network failure — fall back to localStorage so the UI isn't stuck
        try {
          const stored = localStorage.getItem("mealpreper_prefs");
          if (stored) setPreferencesState(JSON.parse(stored));
          const plan = localStorage.getItem("mealpreper_plan");
          if (plan) setMealPlan(JSON.parse(plan));
        } catch {}
      })
      .finally(() => {
        initialSessionHandled = true;
        setAuthLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        // Skip the first SIGNED_IN that fires on mount — already handled by getSession()
        if (!initialSessionHandled) return;
        await handleSignedIn(session.user);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setAuthLoading(false);
        // Revert to localStorage
        setPreferencesState(lsGetPrefs());
        setMealPlan(lsGetPlan());
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth actions ─────────────────────────────────────────────────────────

  const signUpWithGoogle = useCallback(async () => {
    const supabase = supabaseRef.current;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }, []);

  const clearPendingAction = useCallback(() => setPendingAction(null), []);

  const signOut = useCallback(async () => {
    const supabase = supabaseRef.current;
    await supabase.auth.signOut();
  }, []);

  const completeSignUp = useCallback(async (username: string): Promise<{ error?: string }> => {
    const supabase = supabaseRef.current;
    const currentUser = user;
    if (!currentUser) return { error: "Not signed in" };
    const { error } = await supabase.from("profiles").insert({ user_id: currentUser.id, username });
    if (error) {
      if (error.code === "23505") return { error: "Username already taken" };
      return { error: "Something went wrong, please try again" };
    }
    setProfile({ username });
    setPendingUsername(false);
    await migrateFromLocalStorage(currentUser.id);
    return {};
  }, [user, migrateFromLocalStorage]);

  const cancelSignUp = useCallback(async () => {
    setPendingUsername(false);
    setUser(null);
    setProfile(null);
    setAuthLoading(false);
    try { await supabaseRef.current.auth.signOut(); } catch {}
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
      signUpWithGoogle, signOut, pendingUsername, completeSignUp, cancelSignUp,
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
