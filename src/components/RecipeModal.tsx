"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useApp } from "@/context/AppContext";
import { Recipe, classifyIngredient } from "@/lib/mockData";
import { UserRecipe } from "@/lib/userRecipes";
import RecipeFormModal from "@/components/RecipeFormModal";
import { formatTitle } from "@/lib/formatTitle";
import { trackOpenRecipe, trackAddToMealPlan } from "@/lib/analytics";
import { adjustScore } from "@/lib/recipeScores";

const SECTION_ORDER = ["Produce", "Meat & Seafood", "Dairy & Eggs", "Pantry", "Frozen", "Other"];
const CATEGORY_ICONS: Record<string, string> = {
  "Produce": "🥦",
  "Meat & Seafood": "🥩",
  "Dairy & Eggs": "🥛",
  "Pantry": "🫙",
  "Frozen": "🧊",
  "Other": "📦",
};

const recipeCache = new Map<number | string, Recipe>();
const similarCache = new Map<number | string, Recipe[]>();

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
const sentenceCase = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

interface Props {
  recipeId: number | string;
  onClose: () => void;
  onOpenRecipe: (id: number | string) => void;
  initialRecipe?: Recipe;
  onRecipeSaved?: (recipe: UserRecipe) => void;
  onRecipeDeleted?: () => void;
}

export default function RecipeModal({ recipeId, onClose, onOpenRecipe, initialRecipe, onRecipeSaved, onRecipeDeleted }: Props) {
  const { addToMealPlan, isInMealPlan, getMealPlanServings, user } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const openedAt = useRef<number>(Date.now());
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [similar, setSimilar] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(1);
  const [addExpanded, setAddExpanded] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inPlan = recipe ? isInMealPlan(recipe.id) : false;

  const handleShare = async () => {
    const url = `${window.location.origin}/?recipe=${recipeId}`;
    await navigator.clipboard.writeText(url);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2000);
  };

  const fetchRecipe = useCallback((id: number | string) => {
    // If caller provided the full recipe (user recipe), use it directly
    if (initialRecipe) {
      setRecipe(initialRecipe);
      setServings(getMealPlanServings(initialRecipe.id) || 1);
      setLoading(false);
      return;
    }

    setLoading(true);
    setRecipe(null);
    setSimilar([]);
    setAddExpanded(false);

    const isCustomRecipe = Number(id) >= 9000000;
    const detailEndpoint = isCustomRecipe ? `/api/recipes/${id}` : `/api/spoonacular/${id}`;

    if (recipeCache.has(id)) {
      const cached = recipeCache.get(id)!;
      setRecipe(cached);
      setServings(getMealPlanServings(cached.id) || 1);
      setLoading(false);
    } else {
      fetch(detailEndpoint)
        .then((r) => r.json())
        .then((d) => {
          recipeCache.set(id, d);
          setRecipe(d);
          setServings(getMealPlanServings(d.id) || 1);
          trackOpenRecipe(d.id, d.title);
        })
        .finally(() => setLoading(false));
    }

    if (similarCache.has(id)) {
      setSimilar(similarCache.get(id)!);
    } else if (!isCustomRecipe) {
      fetch(`/api/spoonacular/${id}/similar`)
        .then((r) => r.json())
        .then((d) => {
          const list = Array.isArray(d) ? d.slice(0, 3) : [];
          similarCache.set(id, list);
          setSimilar(list);
        });
    }
  }, [getMealPlanServings, initialRecipe]);

  useEffect(() => { fetchRecipe(recipeId); }, [recipeId, fetchRecipe]);

  // Behavior scoring: +2 on open, ±delta on close based on dwell time
  useEffect(() => {
    openedAt.current = Date.now();
    adjustScore(recipeId, 2);
    return () => {
      const elapsed = Date.now() - openedAt.current;
      if (elapsed < 5000) adjustScore(recipeId, -2);
      else if (elapsed > 30000) adjustScore(recipeId, 3);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleAddToMeal = () => {
    if (!recipe) return;
    if (!addExpanded) { setAddExpanded(true); return; }
    addToMealPlan(recipe, servings);
    trackAddToMealPlan(recipe.id, recipe.title, servings);
    adjustScore(recipe.id, 5);
    setAddExpanded(false);
  };

  const steps = recipe?.analyzedInstructions?.[0]?.steps || [];

  // Only one modal open at a time — swap to edit modal when editing
  if (isEditing && recipe?.is_user_recipe) {
    return (
      <RecipeFormModal
        mode="edit"
        editingRecipe={recipe}
        sourceType={(recipe.source_type as "scratch" | "website" | "instagram") ?? "scratch"}
        sourceUrl={recipe.source_url}
        onClose={() => setIsEditing(false)}
        onSaved={(saved) => {
          setIsEditing(false);
          onRecipeSaved?.(saved);
        }}
        onDeleted={() => {
          setIsEditing(false);
          onRecipeDeleted?.();
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative bg-white w-full sm:max-w-[800px] max-h-[96dvh] sm:max-h-[92vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 bg-white/90 backdrop-blur-sm text-navy rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Edit button — only for own user recipes */}
        {recipe?.is_user_recipe && user?.id === recipe.user_id && (
          <button
            onClick={() => setIsEditing(true)}
            className="absolute top-3 right-14 z-10 w-9 h-9 bg-white/90 backdrop-blur-sm text-navy rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
            aria-label="Edit recipe"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </button>
        )}

        {/* Toast */}
        <div className={`absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-300 ${toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
          <div className="bg-navy text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
            Recipe link copied
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="animate-pulse">
              <div className="aspect-[4/3] bg-gray-200" />
              <div className="p-5 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-20 bg-gray-100 rounded-2xl" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
              </div>
            </div>
          ) : !recipe ? (
            <div className="text-center py-20">
              <p className="text-navy font-bold">Recipe not found</p>
            </div>
          ) : (
            <>
              {/* Hero image */}
              <div className="relative h-[420px] bg-gray-100 flex-shrink-0">
                {recipe.image ? (
                  <Image
                    src={recipe.image}
                    alt={recipe.title || "Recipe"}
                    fill
                    className="object-cover"
                    priority
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/600x450/e8f0e8/4a7c4a?text=${encodeURIComponent(recipe.title || "Recipe")}`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <span className="text-6xl">🍽️</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5 space-y-5">

                {/* Title + share */}
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-lg font-bold text-navy leading-snug flex-1">
                    {formatTitle(recipe.title)}
                  </h1>
                  <button
                    onClick={handleShare}
                    className="flex-shrink-0 w-8 h-8 rounded-full border-[1.5px] border-gray-300 text-gray-500 hover:border-navy hover:text-navy inline-flex items-center justify-center transition-all"
                    aria-label="Copy link"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 8.25a2.75 2.75 0 1 0-2.693-2.193L8.42 9.464a2.75 2.75 0 1 0 0 5.072l6.887 3.407a2.75 2.75 0 1 0 .618-1.25L9.038 13.286a2.762 2.762 0 0 0 0-2.572l6.887-3.407A2.748 2.748 0 0 0 18 8.25z"/>
                    </svg>
                  </button>
                </div>

                {/* Stats card */}
                <div className="bg-gray-50 rounded-2xl grid grid-cols-3 divide-x divide-gray-200">
                  <div className="flex flex-col items-center gap-0.5 py-4 px-2">
                    <span className="text-xl mb-0.5">🔥</span>
                    <p className="text-[11px] text-gray-400">Calories</p>
                    <p className="font-bold text-navy text-sm">
                      {recipe.calories != null ? Math.round(recipe.calories) : "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 py-4 px-2">
                    <span className="text-xl mb-0.5">⏱</span>
                    <p className="text-[11px] text-gray-400">Prep time</p>
                    <p className="font-bold text-navy text-sm">
                      {recipe.readyInMinutes ? `${recipe.readyInMinutes} mins` : "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 py-4 px-2">
                    <span className="text-xl mb-0.5">⭐</span>
                    <p className="text-[11px] text-gray-400">Rating score</p>
                    <p className="font-bold text-navy text-sm">
                      {recipe.spoonacularScore != null ? Math.round(recipe.spoonacularScore) : "—"}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {recipe.summary && (
                  <p className="text-sm text-gray-500 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: recipe.summary.replace(/<[^>]*>/g, "").slice(0, 220) + "…"
                    }}
                  />
                )}

                {/* Ingredients — user recipe grouped */}
                {recipe.is_user_recipe && (recipe.ingredients_json?.length ?? 0) > 0 && (
                  <section>
                    <h2 className="text-base font-bold text-navy mb-3">Ingredients</h2>
                    {(() => {
                      const grouped = SECTION_ORDER
                        .map((label) => ({
                          label,
                          items: recipe.ingredients_json!.filter(
                            (ing) => classifyIngredient(ing.name) === label
                          ),
                        }))
                        .filter((g) => g.items.length > 0);

                      return (
                        <div className="space-y-4">
                          {grouped.map((group) => {
                            const pairs: typeof group.items[] = [];
                            for (let i = 0; i < group.items.length; i += 2) {
                              pairs.push(group.items.slice(i, i + 2));
                            }
                            return (
                              <div key={group.label}>
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className="text-base">{CATEGORY_ICONS[group.label] ?? "📦"}</span>
                                  <span className="text-sm font-bold text-navy">{group.label}</span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                  {pairs.map((pair, pi) => (
                                    <div key={pi} className="grid grid-cols-2 gap-4 py-2.5">
                                      {pair.map((ing, ii) => (
                                        <div key={ii}>
                                          <p className="text-sm font-medium text-navy">{cap(ing.name)}</p>
                                          <p className="text-xs text-gray-400 mt-0.5">
                                            {[ing.quantity, ing.unit].filter(Boolean).join(" ") || "—"}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </section>
                )}

                {/* Ingredients — Spoonacular grouped */}
                {!recipe.is_user_recipe && (recipe.extendedIngredients?.length ?? 0) > 0 && (
                  <section>
                    <h2 className="text-base font-bold text-navy mb-3">Ingredients</h2>
                    {(() => {
                      const grouped = SECTION_ORDER
                        .map((label) => ({
                          label,
                          items: (recipe.extendedIngredients ?? []).filter(
                            (ing) => classifyIngredient(ing.name) === label
                          ),
                        }))
                        .filter((g) => g.items.length > 0);

                      return (
                        <div className="space-y-4">
                          {grouped.map((group) => {
                            const pairs: typeof group.items[] = [];
                            for (let i = 0; i < group.items.length; i += 2) {
                              pairs.push(group.items.slice(i, i + 2));
                            }
                            return (
                              <div key={group.label}>
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className="text-base">{CATEGORY_ICONS[group.label] ?? "📦"}</span>
                                  <span className="text-sm font-bold text-navy">{group.label}</span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                  {pairs.map((pair, pi) => (
                                    <div key={pi} className="grid grid-cols-2 gap-4 py-2.5">
                                      {pair.map((ing, ii) => (
                                        <div key={`${ing.id}-${ii}`}>
                                          <p className="text-sm font-medium text-navy">{cap(ing.name)}</p>
                                          <p className="text-xs text-gray-400 mt-0.5">
                                            {ing.amount != null && ing.amount > 0
                                              ? `${ing.amountDisplay ?? (Number.isInteger(ing.amount) ? ing.amount : Math.round(ing.amount * 100) / 100)}${ing.unit ? ` ${ing.unit}` : ""}`
                                              : ing.raw || "—"}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </section>
                )}

                {/* Cooking instructions — user recipe */}
                {recipe.is_user_recipe && (recipe.instructions_json?.length ?? 0) > 0 && (
                  <section>
                    <h2 className="text-base font-bold text-navy mb-3">Cooking instructions</h2>
                    <div className="divide-y divide-gray-100">
                      {recipe.instructions_json!.map((s) => (
                        <div key={s.step} className="flex gap-4 py-3.5">
                          <span className="flex-shrink-0 text-sm text-gray-400 font-medium w-4 pt-px">{s.step}</span>
                          <p className="text-sm text-gray-700 leading-relaxed">{s.text}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Cooking instructions — Spoonacular */}
                {!recipe.is_user_recipe && steps.length > 0 ? (
                  <section>
                    <h2 className="text-base font-bold text-navy mb-3">Cooking instructions</h2>
                    <div className="divide-y divide-gray-100">
                      {steps.map((s) => (
                        <div key={s.number} className="flex gap-4 py-3.5">
                          <span className="flex-shrink-0 text-sm text-gray-400 font-medium w-4 pt-px">
                            {s.number}
                          </span>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {sentenceCase(s.step)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : recipe?.sourceUrl ? (
                  <section>
                    <h2 className="text-base font-bold text-navy mb-2">Cooking instructions</h2>
                    <a
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-green-600 font-semibold hover:underline"
                    >
                      View full recipe on {new URL(recipe.sourceUrl).hostname.replace(/^www\./, "")} →
                    </a>
                  </section>
                ) : null}

                {/* You might also like */}
                {similar.length > 0 && (
                  <section>
                    <h2 className="text-base font-bold text-navy mb-3">You might also like</h2>
                    <div className="grid grid-cols-3 gap-3">
                      {similar.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => onOpenRecipe(r.id)}
                          className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left"
                        >
                          <div className="relative aspect-[4/3] bg-gray-100">
                            {r.image ? (
                              <Image
                                src={r.image}
                                alt={r.title}
                                fill
                                className="object-cover"
                                sizes="150px"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://placehold.co/150x112/e8f0e8/4a7c4a?text=Recipe`;
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-2xl">🍽️</span>
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-bold text-navy line-clamp-2 leading-snug">
                              {formatTitle(r.title)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                <div className="h-1" />
              </div>
            </>
          )}
        </div>

        {/* Sticky CTA footer */}
        {recipe && (
          <div className="px-4 py-3 flex-shrink-0" style={{ backgroundColor: "#06723C" }}>
            {addExpanded ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-white/30 rounded-full overflow-hidden">
                  <button
                    onClick={() => setServings((s) => Math.max(1, s - 1))}
                    className="w-8 h-8 flex items-center justify-center text-white font-bold hover:bg-white/10 transition-colors"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-white">{servings}</span>
                  <button
                    onClick={() => setServings((s) => Math.min(10, s + 1))}
                    className="w-8 h-8 flex items-center justify-center text-white font-bold hover:bg-white/10 transition-colors"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleAddToMeal}
                  className="flex-1 bg-white text-navy font-bold py-2.5 rounded-full text-sm hover:bg-white/90 transition-colors"
                >
                  Add {servings} serving{servings !== 1 ? "s" : ""}
                </button>
                <button
                  onClick={() => setAddExpanded(false)}
                  className="text-white/60 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToMeal}
                className="w-full py-3 font-semibold text-sm flex items-center justify-center gap-2 text-white hover:text-white/80 transition-colors"
              >
                {inPlan ? (
                  <><span className="text-zest">✓</span> In your meal plan — update servings</>
                ) : (
                  <><span className="text-base">+</span> Add to meal plan</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>

  );
}
