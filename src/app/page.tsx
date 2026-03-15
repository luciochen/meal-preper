"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import RecipeCard from "@/components/RecipeCard";
import RecipeModal from "@/components/RecipeModal";
import { useApp } from "@/context/AppContext";
import { Recipe } from "@/lib/mockData";

const FILTER_CATEGORIES = [
  {
    key: "diets" as const,
    label: "Diet",
    chips: [
      { id: "vegan", label: "Vegan", icon: "🌱" },
      { id: "vegetarian", label: "Vegetarian", icon: "🥦" },
      { id: "easy", label: "Easy", icon: "👨‍🍳" },
      { id: "make-ahead", label: "Make ahead", icon: "📦" },
      { id: "freeze-it", label: "Freezer-friendly", icon: "🧊" },
      { id: "low calorie", label: "Low calorie", icon: "⚡" },
    ],
  },
  {
    key: "cuisines" as const,
    label: "Cuisine",
    chips: [
      { id: "italian", label: "Italian", icon: "🍝" },
      { id: "chinese", label: "Chinese", icon: "🥢" },
      { id: "mexican", label: "Mexican", icon: "🌮" },
      { id: "japanese", label: "Japanese", icon: "🍱" },
      { id: "korean", label: "Korean", icon: "🍜" },
      { id: "indian", label: "Indian", icon: "🍛" },
      { id: "thai", label: "Thai", icon: "🌶️" },
      { id: "french", label: "French", icon: "🥐" },
      { id: "mediterranean", label: "Mediterranean", icon: "🫒" },
    ],
  },
  {
    key: "types" as const,
    label: "Type",
    chips: [
      { id: "quick", label: "Quick ≤30 min", icon: "⚡" },
      { id: "microwave", label: "Microwave ok", icon: "📡" },
    ],
  },
  {
    key: "allergies" as const,
    label: "Allergies",
    chips: [
      { id: "dairy", label: "No dairy", icon: "🥛" },
      { id: "eggs", label: "No eggs", icon: "🥚" },
      { id: "peanuts", label: "No peanuts", icon: "🥜" },
      { id: "tree nuts", label: "No tree nuts", icon: "🌰" },
      { id: "soy", label: "No soy", icon: "🫘" },
      { id: "gluten", label: "No gluten", icon: "🌾" },
      { id: "fish", label: "No fish", icon: "🐟" },
      { id: "shellfish", label: "No shellfish", icon: "🦐" },
    ],
  },
];

interface Filters {
  diets: string[];
  cuisines: string[];
  types: string[];
  allergies: string[];
}

function toggle(id: string, list: string[]): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export default function HomePage() {
  const { onboardingDone, preferences, setPreferences } = useApp();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    diets: preferences.diets,
    cuisines: preferences.cuisines,
    types: [],
    allergies: preferences.allergies,
  });
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(48);
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | string | null>(null);

  const fetchRecipes = useCallback(
    (f: Filters) => {
      setLoading(true);
      const params = new URLSearchParams();

      if (f.diets.length) params.set("diet", f.diets.join(","));
      if (f.cuisines.length) params.set("cuisine", f.cuisines.join(","));
      if (f.allergies.length) params.set("intolerances", f.allergies.join(","));
      if (f.types.includes("quick")) params.set("minutes_max", "30");
      if (f.types.includes("microwave")) params.set("microwave", "1");

      setVisibleCount(48);
      fetch(`/api/recipes/search?${params}`)
        .then((r) => r.json())
        .then((d) => setRecipes(d.results || []))
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => { fetchRecipes(filters); }, [fetchRecipes]);

  const saveFilters = (next: Filters) => {
    setFilters(next);
    setPreferences({ diets: next.diets, cuisines: next.cuisines, allergies: next.allergies });
    fetchRecipes(next);
  };

  const updateFilter = (key: keyof Filters, id: string) => {
    saveFilters({ ...filters, [key]: toggle(id, filters[key]) });
  };

  const clearAllFilters = () => {
    saveFilters({ diets: [], cuisines: [], types: [], allergies: [] });
    setOpenCategory(null);
  };

  const totalActive = filters.diets.length + filters.cuisines.length + filters.types.length + filters.allergies.length;
  const openCat = FILTER_CATEGORIES.find((c) => c.key === openCategory) ?? null;

  return (
    <div className="max-w-5xl mx-auto px-4 pb-16">
      {/* Hero */}
      <section className="py-10">
        <div className="bg-white rounded-3xl p-7 shadow-sm">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <span className="w-4 h-4 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">⚡</span>
            Meal prep made easy
          </div>
          <h1 className="text-3xl font-extrabold text-navy leading-tight mb-2">
            Plan your weekly<br />
            <span className="text-green-500">meal prep</span> in 5 minutes.
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            Personalized meal prep recipes with fridge life tracking and a smart grocery list — everything you need for effortless weekday eating.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/onboarding" className="inline-flex items-center gap-2 bg-green-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-green-600 transition-colors">
              Get personalized recipes →
            </Link>
            <Link href="/meal-plan" className={`inline-flex items-center gap-2 font-semibold px-5 py-3 rounded-xl transition-colors ${onboardingDone ? "bg-navy text-white hover:bg-navy/90" : "bg-white text-navy border border-gray-200 hover:border-gray-300"}`}>
              My meal plan →
            </Link>
          </div>
        </div>

      </section>

      {/* Recipes section */}
      <section>
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-extrabold text-navy">Popular recipes</h2>
          {!loading && <span className="text-xs text-gray-400">{recipes.length} recipes</span>}
        </div>

        {/* Category tab row */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mb-1">
          {FILTER_CATEGORIES.map((cat) => {
            const count = filters[cat.key].length;
            const isOpen = openCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setOpenCategory(isOpen ? null : cat.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all ${
                  count > 0 || isOpen
                    ? "bg-navy text-white border-navy"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {cat.label}
                {count > 0 && (
                  <span className="bg-white/25 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold leading-none">
                    {count}
                  </span>
                )}
                <span className="opacity-50 text-[9px]">{isOpen ? "▲" : "▼"}</span>
              </button>
            );
          })}
          {totalActive > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 px-2 py-2 underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Inline chip panel — pushes content down, no overflow clipping */}
        {openCat && (
          <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-3 flex flex-wrap gap-2">
            {openCat.chips.map((c) => {
              const active = filters[openCat.key].includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => updateFilter(openCat.key, c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                    active
                      ? "bg-navy text-white border-navy"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Active filter pills */}
        {totalActive > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar mb-3">
            {FILTER_CATEGORIES.flatMap((cat) =>
              filters[cat.key].map((id) => {
                const chip = cat.chips.find((c) => c.id === id);
                return (
                  <button
                    key={`${cat.key}-${id}`}
                    onClick={() => updateFilter(cat.key, id)}
                    className="flex-shrink-0 flex items-center gap-1 text-xs bg-navy/10 text-navy font-medium px-2.5 py-1 rounded-full hover:bg-navy/20 transition-colors"
                  >
                    {chip?.label ?? id} ×
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🥗</p>
            <p className="text-navy font-bold text-lg mb-1">No recipes found</p>
            <p className="text-gray-400 text-sm">Try adjusting your filters</p>
            <button onClick={clearAllFilters} className="mt-4 text-sm text-green-600 font-semibold hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {recipes.slice(0, visibleCount).map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} onOpen={setSelectedRecipeId} />
              ))}
            </div>
            {visibleCount < recipes.length && (
              <div className="text-center mt-6">
                <button
                  onClick={() => setVisibleCount((n) => n + 48)}
                  className="bg-white text-navy font-semibold px-6 py-3 rounded-xl border border-gray-200 hover:border-gray-400 transition-colors text-sm"
                >
                  Load more ({recipes.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {selectedRecipeId !== null && (
        <RecipeModal
          recipeId={selectedRecipeId}
          onClose={() => setSelectedRecipeId(null)}
          onOpenRecipe={setSelectedRecipeId}
        />
      )}
    </div>
  );
}
