"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useApp } from "@/context/AppContext";
import { Recipe, classifyIngredient } from "@/lib/mockData";
import { formatTitle } from "@/lib/formatTitle";

const SECTION_ORDER = ["Produce", "Meat & Seafood", "Dairy & Eggs", "Pantry"];

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
const sentenceCase = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

interface Props {
  recipeId: number | string;
  onClose: () => void;
  onOpenRecipe: (id: number | string) => void;
}

export default function RecipeModal({ recipeId, onClose, onOpenRecipe }: Props) {
  const { addToMealPlan, isInMealPlan, getMealPlanServings } = useApp();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [similar, setSimilar] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(2);
  const [addExpanded, setAddExpanded] = useState(false);
  const inPlan = recipe ? isInMealPlan(recipe.id) : false;

  const fetchRecipe = useCallback((id: number | string) => {
    setLoading(true);
    setRecipe(null);
    setSimilar([]);
    setAddExpanded(false);
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setRecipe(d);
        setServings(getMealPlanServings(d.id) || 1);
      })
      .finally(() => setLoading(false));
    fetch(`/api/recipes/${id}/similar`)
      .then((r) => r.json())
      .then((d) => setSimilar(Array.isArray(d) ? d.slice(0, 6) : []));
  }, [getMealPlanServings]);

  useEffect(() => { fetchRecipe(recipeId); }, [recipeId, fetchRecipe]);

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
    setAddExpanded(false);
  };

  const steps = recipe?.analyzedInstructions?.[0]?.steps || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative bg-[#eef2ee] w-full sm:max-w-2xl max-h-[94dvh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors text-xl leading-none font-light"
          aria-label="Close"
        >
          <span style={{ lineHeight: 1, marginTop: "-1px" }}>×</span>
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="animate-pulse">
              <div className="aspect-[16/9] bg-gray-200" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="grid grid-cols-3 gap-3">
                  {[0,1,2].map(i => <div key={i} className="h-20 bg-gray-200 rounded-2xl" />)}
                </div>
                <div className="h-32 bg-gray-200 rounded-2xl" />
              </div>
            </div>
          ) : !recipe ? (
            <div className="text-center py-20">
              <p className="text-navy font-bold">Recipe not found</p>
            </div>
          ) : (
            <>
              {/* Hero */}
              <div className="relative aspect-[16/9] bg-gray-200">
                {recipe.image ? (
                  <Image
                    src={recipe.image}
                    alt={recipe.title || "Recipe"}
                    fill
                    className="object-cover"
                    priority
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/600x338/e8f0e8/4a7c4a?text=${encodeURIComponent(recipe.title || "Recipe")}`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <span className="text-6xl">🍽️</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-12">
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      ⏱ {recipe.readyInMinutes}m
                    </span>
                    <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      🍽️ {recipe.servings} servings
                    </span>
                  </div>
                  <h1 className="text-lg font-extrabold text-white leading-snug">{formatTitle(recipe.title)}</h1>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* 3-col stat row */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-white rounded-2xl p-3 flex flex-col gap-1">
                    <span className="text-base">🧊</span>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Fridge life</p>
                    <p className="font-bold text-navy text-sm">{recipe.fridgeLife?.label ?? "4 days"}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-3 flex flex-col gap-1">
                    <span className="text-base">⚡</span>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Calories</p>
                    <p className="font-bold text-navy text-sm">{recipe.calories != null ? `${Math.round(recipe.calories)} kcal` : "—"}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-3 flex flex-col gap-1">
                    <span className="text-base">📡</span>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Microwave</p>
                    <p className="font-bold text-navy text-sm">{recipe.microwaveScore?.label ?? "Good"}</p>
                  </div>
                </div>

                {/* Ingredients */}
                <section>
                  <h2 className="text-sm font-extrabold text-navy mb-2 uppercase tracking-wide">Ingredients</h2>
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
                      <div className="bg-white rounded-2xl overflow-hidden">
                        {grouped.map((group, gi) => (
                          <div key={group.label}>
                            <div className="px-4 pt-3 pb-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{group.label}</span>
                            </div>
                            <div className="divide-y divide-gray-50">
                              {group.items.map((ing, idx) => (
                                <div key={`${ing.id}-${idx}`} className="flex items-center justify-between px-4 py-2.5 gap-4">
                                  <span className="text-sm text-gray-700">{cap(ing.name)}</span>
                                  {(ing.amount != null && ing.amount > 0) ? (
                                    <span className="text-sm font-semibold text-navy whitespace-nowrap flex-shrink-0">
                                      {ing.amountDisplay ?? (Number.isInteger(ing.amount) ? ing.amount : Math.round(ing.amount * 100) / 100)}{ing.unit ? ` ${ing.unit}` : ""}
                                    </span>
                                  ) : ing.raw ? (
                                    <span className="text-sm font-semibold text-navy text-right flex-shrink-0 max-w-[45%] line-clamp-1">{ing.raw}</span>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                            {gi < grouped.length - 1 && <div className="border-t border-gray-100 mx-4" />}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </section>

                {/* Prep instructions */}
                {steps.length > 0 && (
                  <section>
                    <h2 className="text-sm font-extrabold text-navy mb-2 uppercase tracking-wide">Prep instructions</h2>
                    <div className="space-y-3">
                      {steps.map((s) => (
                        <div key={s.number} className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">
                            {s.number}
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{sentenceCase(s.step)}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Similar recipes */}
                {similar.length > 0 && (
                  <section>
                    <h2 className="text-sm font-extrabold text-navy mb-2 uppercase tracking-wide">You might also like</h2>
                    <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
                      {similar.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => onOpenRecipe(r.id)}
                          className="flex-shrink-0 w-28 bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left"
                        >
                          <div className="relative aspect-[4/3] bg-gray-100">
                            {r.image ? (
                              <Image src={r.image} alt={r.title} fill className="object-cover" sizes="112px"
                                onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/112x84/e8f0e8/4a7c4a?text=Recipe`; }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><span className="text-xl">🍽️</span></div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-bold text-navy line-clamp-2 leading-snug">{formatTitle(r.title)}</p>
                            {r.readyInMinutes && <p className="text-xs text-gray-400 mt-0.5">⏱ {r.readyInMinutes}m</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                <div className="h-2" />
              </div>
            </>
          )}
        </div>

        {/* Sticky CTA footer */}
        {recipe && (
          <div className="border-t border-gray-200 bg-white px-4 py-3 flex-shrink-0">
            {addExpanded ? (
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-navy">Servings</p>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => setServings((s) => Math.max(1, s - 1))} className="px-3.5 py-2 text-gray-600 hover:bg-gray-50 font-bold">−</button>
                  <span className="px-4 font-bold text-navy">{servings}</span>
                  <button onClick={() => setServings((s) => Math.min(10, s + 1))} className="px-3.5 py-2 text-gray-600 hover:bg-gray-50 font-bold">+</button>
                </div>
                <button
                  onClick={handleAddToMeal}
                  className="flex-1 bg-navy text-white font-bold py-2.5 rounded-xl hover:bg-navy/90 transition-colors text-sm"
                >
                  Add {servings} servings
                </button>
                <button onClick={() => setAddExpanded(false)} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
              </div>
            ) : (
              <button
                onClick={handleAddToMeal}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                  inPlan ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-navy text-white hover:bg-navy/90"
                }`}
              >
                {inPlan
                  ? <><span>✓</span> In your meal plan — update servings</>
                  : <><span className="text-base">+</span> Add to meal plan</>
                }
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
