"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Recipe } from "@/lib/mockData";

export interface MealPlanItem {
  recipe: Recipe;
  servings: number;
}

export interface UserPreferences {
  diets: string[];
  cuisines: string[];
  allergies: string[];
}

interface AppContextType {
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferencesState] = useState<UserPreferences>({ diets: [], cuisines: [], allergies: [] });
  const [onboardingDone, setOnboardingDoneState] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlanItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mealpreper_prefs");
      if (stored) setPreferencesState(JSON.parse(stored));
      const done = localStorage.getItem("mealpreper_onboarded");
      if (done === "true") setOnboardingDoneState(true);
      const plan = localStorage.getItem("mealpreper_plan");
      if (plan) setMealPlan(JSON.parse(plan));
    } catch {}
    setHydrated(true);
  }, []);

  const setPreferences = useCallback((prefs: UserPreferences) => {
    setPreferencesState(prefs);
    localStorage.setItem("mealpreper_prefs", JSON.stringify(prefs));
  }, []);

  const setOnboardingDone = useCallback((done: boolean) => {
    setOnboardingDoneState(done);
    localStorage.setItem("mealpreper_onboarded", String(done));
  }, []);

  const savePlan = (plan: MealPlanItem[]) => {
    setMealPlan(plan);
    localStorage.setItem("mealpreper_plan", JSON.stringify(plan));
  };

  const addToMealPlan = useCallback((recipe: Recipe, servings: number) => {
    setMealPlan((prev) => {
      const exists = prev.find((i) => i.recipe.id === recipe.id);
      const next = exists
        ? prev.map((i) => (i.recipe.id === recipe.id ? { ...i, servings } : i))
        : [...prev, { recipe, servings }];
      localStorage.setItem("mealpreper_plan", JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFromMealPlan = useCallback((recipeId: number | string) => {
    setMealPlan((prev) => {
      const next = prev.filter((i) => String(i.recipe.id) !== String(recipeId));
      localStorage.setItem("mealpreper_plan", JSON.stringify(next));
      return next;
    });
  }, []);

  const clearMealPlan = useCallback(() => {
    setMealPlan([]);
    localStorage.setItem("mealpreper_plan", JSON.stringify([]));
  }, []);

  const updateServings = useCallback((recipeId: number | string, servings: number) => {
    setMealPlan((prev) => {
      const next = prev.map((i) => (String(i.recipe.id) === String(recipeId) ? { ...i, servings } : i));
      localStorage.setItem("mealpreper_plan", JSON.stringify(next));
      return next;
    });
  }, []);

  const isInMealPlan = useCallback((recipeId: number | string) => mealPlan.some((i) => String(i.recipe.id) === String(recipeId)), [mealPlan]);
  const getMealPlanServings = useCallback((recipeId: number | string) => mealPlan.find((i) => String(i.recipe.id) === String(recipeId))?.servings ?? 0, [mealPlan]);

  if (!hydrated) return null;

  return (
    <AppContext.Provider value={{
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
