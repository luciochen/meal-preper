"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import RecipeCard from "@/components/RecipeCard";
import RecipeModal from "@/components/RecipeModal";
import SearchInput from "@/components/ui/SearchInput";
import FilterDropdown from "@/components/ui/FilterDropdown";
import AddRecipeModal from "@/components/AddRecipeModal";
import RecipeFormModal from "@/components/RecipeFormModal";
import ImportWebsiteModal from "@/components/ImportWebsiteModal";
import LoginModal from "@/components/LoginModal";
import { useApp } from "@/context/AppContext";
import { Recipe } from "@/lib/mockData";
import { ScrapedRecipe } from "@/app/api/recipe-import/route";
import { trackViewRecipeList, trackSearchNoResults, trackFilterApplied } from "@/lib/analytics";
import { adjustScore, rankRecipes } from "@/lib/recipeScores";

type AddStep = "idle" | "choose" | "scratch" | "website" | "confirm-import";

const FILTER_CATEGORIES = [
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
      { id: "american", label: "American", icon: "🍔" },
    ],
  },
  {
    key: "diets" as const,
    label: "Diet preference",
    chips: [
      { id: "vegan", label: "Vegan", icon: "🌱" },
      { id: "vegetarian", label: "Vegetarian", icon: "🥦" },
      { id: "high protein", label: "High protein", icon: "💪" },
      { id: "low calorie", label: "Low calorie", icon: "⚡" },
      { id: "easy to cook", label: "Easy to cook", icon: "👨‍🍳" },
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


export default function HomePageClient() {
  const { preferences, setPreferences, user, pendingAction, clearPendingAction } = useApp();
  const [addStep, setAddStep] = useState<AddStep>("idle");
  const [scrapedData, setScrapedData] = useState<ScrapedRecipe | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (pendingAction === "add_recipe" && user) {
      clearPendingAction();
      setAddStep("choose");
    }
  }, [pendingAction, user, clearPendingAction]);

  const handleAddRecipe = () => {
    if (!user) { setShowLogin(true); return; }
    setAddStep("choose");
  };

const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<Filters>(() => {
    try {
      const saved = localStorage.getItem("zest_filters");
      if (saved) return JSON.parse(saved) as Filters;
    } catch {}
    return { diets: preferences.diets, cuisines: preferences.cuisines, types: [], allergies: preferences.allergies };
  });
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | string | null>(null);
  const searchParams = useSearchParams();
  useEffect(() => {
    const id = searchParams.get("recipe");
    if (id) setSelectedRecipeId(isNaN(Number(id)) ? id : Number(id));
  }, [searchParams]);
  const [searchQuery, setSearchQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offsetRef = useRef(0);
  const filtersRef = useRef(filters);
  const queryRef = useRef("");
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);
const impressedIds = useRef<Set<string>>(new Set());
  const clickedIds = useRef<Set<string>>(new Set());
  const cardObserverRef = useRef<IntersectionObserver | null>(null);

  // Flush impressed-but-not-clicked recipes with -1 penalty
  const flushImpressions = useCallback(() => {
    impressedIds.current.forEach((id) => {
      if (!clickedIds.current.has(id)) adjustScore(id, -1);
    });
    impressedIds.current.clear();
  }, []);

  // Card impression observer — created once, reused across recipe renders
  useEffect(() => {
    cardObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.recipeId;
            if (id) impressedIds.current.add(id);
          }
        });
      },
      { threshold: 0.5 }
    );
    return () => {
      cardObserverRef.current?.disconnect();
      cardObserverRef.current = null;
    };
  }, []);

  // Flush on tab hide and on unmount
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") flushImpressions(); };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      flushImpressions();
    };
  }, [flushImpressions]);

  // Flush old impressions when recipes reload (new search/filter)
  useEffect(() => {
    impressedIds.current.clear();
  }, [recipes]);

  const handleOpenRecipe = useCallback((id: number | string) => {
    clickedIds.current.add(String(id));
    setSelectedRecipeId(id);
  }, []);

  const buildParams = (f: Filters, offset: number) => {
    const params = new URLSearchParams();
    if (queryRef.current) params.set("query", queryRef.current);
    if (f.diets.length) params.set("diet", f.diets.join(","));
    // Never send "chinese" to Spoonacular — those come from Supabase only
    const spoonCuisines = f.cuisines.filter((c) => c !== "chinese");
    if (spoonCuisines.length) params.set("cuisine", spoonCuisines.join(","));
    if (f.allergies.length) params.set("intolerances", f.allergies.join(","));
    params.set("offset", String(offset));
    return params;
  };

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    fetch(`/api/spoonacular/search?${buildParams(filtersRef.current, offsetRef.current)}`)
      .then((r) => r.json())
      .then((d) => {
        setRecipes((prev) => [...prev, ...(d.results || [])]);
        offsetRef.current += 16;
        hasMoreRef.current = d.hasMore ?? false;
      })
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, []);

  // Scroll-based infinite load — only fires when user actively scrolls near the bottom
  useEffect(() => {
    const onScroll = () => {
      if (loadingMoreRef.current || !hasMoreRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollHeight - scrollTop - clientHeight < 300) loadMore();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [loadMore]);

  const fetchRecipes = useCallback((f: Filters) => {
    filtersRef.current = f;
    offsetRef.current = 0;
    hasMoreRef.current = false;
    setLoading(true);
    setRecipes([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const hasChinese = f.cuisines.includes("chinese");
      const nonChineseCuisines = f.cuisines.filter((c) => c !== "chinese");
      // Only call Spoonacular if there are non-Chinese filters or no cuisine filter at all
      const needsSpoon = !hasChinese || nonChineseCuisines.length > 0;
      const spoonFetch = needsSpoon
        ? fetch(`/api/spoonacular/search?${buildParams(f, 0)}`).then((r) => r.json())
        : Promise.resolve({ results: [], hasMore: false });
      const chinParams = new URLSearchParams({ cuisine: "chinese" });
      if (queryRef.current) chinParams.set("query", queryRef.current);
      const chinFetch = hasChinese
        ? fetch(`/api/recipes/search?${chinParams}`).then((r) => r.json())
        : Promise.resolve({ results: [] });
      Promise.all([spoonFetch, chinFetch])
        .then(([spoon, chin]) => {
          const chinResults: Recipe[] = chin.results || [];
          const spoonResults: Recipe[] = spoon.results || [];
          const seenIds = new Set(chinResults.map((r) => String(r.id)));
          const merged = [...chinResults, ...spoonResults.filter((r) => !seenIds.has(String(r.id)))];
          setRecipes(rankRecipes(merged));
          offsetRef.current = 16;
          hasMoreRef.current = spoon.hasMore ?? false;
          if (merged.length === 0) {
            const activeFilters = Object.entries(filtersRef.current).flatMap(([k, ids]) => (ids as string[]).map((id) => `${k}:${id}`));
            trackSearchNoResults(queryRef.current, activeFilters);
          } else {
            trackViewRecipeList(merged.length);
          }
        })
        .finally(() => setLoading(false));
    }, 400);
  }, []);

  useEffect(() => { fetchRecipes(filters); }, [fetchRecipes]);

  const saveFilters = (next: Filters) => {
    setFilters(next);
    try { localStorage.setItem("zest_filters", JSON.stringify(next)); } catch {}
    setPreferences({ diets: next.diets, cuisines: next.cuisines, allergies: next.allergies });
    fetchRecipes(next);
  };

  const updateFilter = (key: keyof Filters, id: string) => {
    const next = { ...filters, [key]: toggle(id, filters[key]) };
    trackFilterApplied(key, id, next);
    saveFilters(next);
  };

  const clearAllFilters = () => {
    saveFilters({ diets: [], cuisines: [], types: [], allergies: [] });
    setOpenCategory(null);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    queryRef.current = q;
    fetchRecipes(filters);
  };

  const totalActive = filters.diets.length + filters.cuisines.length + filters.types.length + filters.allergies.length;
  const openCat = FILTER_CATEGORIES.find((c) => c.key === openCategory) ?? null;

  return (
    <div>
      {/* Recipes section */}
      <section className="pt-0">
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-navy">For you</h2>
          <button
            onClick={handleAddRecipe}
            className="border border-gray-200 text-navy font-semibold px-4 py-2 rounded-2xl hover:border-gray-300 transition-colors text-sm flex items-center gap-1.5"
          >
            <span className="text-base leading-none">+</span> Add recipe
          </button>
        </div>

        {/* Search + Filter bar */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            className="flex-1 min-w-[160px] max-w-xs"
          />
          {FILTER_CATEGORIES.map((cat) => (
            <FilterDropdown
              key={cat.key}
              label={cat.label}
              count={filters[cat.key].length}
              isOpen={openCategory === cat.key}
              onToggleOpen={() => setOpenCategory(openCategory === cat.key ? null : cat.key)}
            />
          ))}
          {totalActive > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 underline whitespace-nowrap"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
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
            <p className="text-gray-400 text-sm mb-4">
              {searchQuery && totalActive > 0
                ? `No results for "${searchQuery}" with your current filters`
                : searchQuery
                ? `No results for "${searchQuery}"`
                : "Try adjusting your filters"}
            </p>
            <div className="flex items-center justify-center gap-4">
              {searchQuery && (
                <button onClick={() => handleSearchChange("")} className="text-sm text-green-600 font-semibold hover:underline">
                  Clear search
                </button>
              )}
              {totalActive > 0 && (
                <button onClick={clearAllFilters} className="text-sm text-green-600 font-semibold hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  data-recipe-id={String(recipe.id)}
                  ref={(el) => { if (el) cardObserverRef.current?.observe(el); }}
                >
                  <RecipeCard recipe={recipe} onOpen={handleOpenRecipe} />
                </div>
              ))}
            </div>
            {loadingMore && (
              <div className="mt-6 flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin" />
              </div>
            )}
          </>
        )}
      </section>

      {selectedRecipeId !== null && (
        <RecipeModal
          recipeId={selectedRecipeId}
          onClose={() => setSelectedRecipeId(null)}
          onOpenRecipe={handleOpenRecipe}
        />
      )}

      {addStep === "choose" && (
        <AddRecipeModal
          onClose={() => setAddStep("idle")}
          onSelect={(method) => setAddStep(method === "website" ? "website" : "scratch")}
        />
      )}
      {addStep === "website" && (
        <ImportWebsiteModal
          onClose={() => setAddStep("choose")}
          onImported={(data) => { setScrapedData(data); setAddStep("confirm-import"); }}
          onAddManually={() => setAddStep("scratch")}
        />
      )}
      {(addStep === "scratch" || addStep === "confirm-import") && (
        <RecipeFormModal
          mode="create"
          sourceType={addStep === "confirm-import" ? "website" : "scratch"}
          sourceUrl={addStep === "confirm-import" ? scrapedData?.source_url : undefined}
          scrapedData={addStep === "confirm-import" ? scrapedData ?? undefined : undefined}
          onClose={() => { setAddStep("idle"); setScrapedData(null); }}
          onSaved={() => setAddStep("idle")}
        />
      )}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

    </div>
  );
}
