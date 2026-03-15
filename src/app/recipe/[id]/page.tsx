"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Recipe, classifyIngredient } from "@/lib/mockData";

import { formatTitle } from "@/lib/formatTitle";
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const SECTION_ORDER = ["Produce", "Meat & Seafood", "Dairy & Eggs", "Pantry"];

export default function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToMealPlan, isInMealPlan, getMealPlanServings } = useApp();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [similar, setSimilar] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(2);
  const [addExpanded, setAddExpanded] = useState(false);
  const inPlan = recipe ? isInMealPlan(recipe.id) : false;

  useEffect(() => {
    if (!id) return;
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setRecipe(d);
        setServings(getMealPlanServings(d.id) || 1);
      })
      .finally(() => setLoading(false));

    fetch(`/api/recipes/${id}/similar`)
      .then((r) => r.json())
      .then((d) => setSimilar(Array.isArray(d) ? d.slice(0, 4) : []));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-6 animate-pulse space-y-4">
        <div className="aspect-video bg-gray-200 rounded-2xl" />
        <div className="h-6 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="text-center py-20">
        <p className="text-navy font-bold">Recipe not found</p>
        <button onClick={() => router.back()} className="text-green-600 text-sm mt-2 hover:underline">← Go back</button>
      </div>
    );
  }

  const steps = recipe.analyzedInstructions?.[0]?.steps || [];

  const handleAddToMeal = () => {
    if (!addExpanded) { setAddExpanded(true); return; }
    addToMealPlan(recipe, servings);
    setAddExpanded(false);
  };

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* Back button */}
      <div className="px-4 pt-4">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-navy flex items-center gap-1 mb-3">
          ← Back
        </button>
      </div>

      {/* Hero image */}
      <div className="relative mx-4 aspect-video rounded-2xl overflow-hidden bg-gray-100">
        {recipe.image ? (
          <Image
            src={recipe.image}
            alt={recipe.title || "Recipe"}
            fill
            className="object-cover"
            priority
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/900x500/e8f0e8/4a7c4a?text=${encodeURIComponent(recipe.title || "Recipe")}`;
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-6xl">🍽️</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex gap-2 mb-2 flex-wrap">
            <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              ⏱ {recipe.readyInMinutes}m
            </span>
            {recipe.diets?.slice(0, 2).map((d) => (
              <span key={d} className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full capitalize">{d}</span>
            ))}
          </div>
          <h1 className="text-2xl font-extrabold text-white leading-tight">{formatTitle(recipe.title)}</h1>
        </div>
      </div>

      {/* Two-column body */}
      <div className="px-4 mt-5 flex flex-col lg:flex-row gap-5 items-start">

        {/* LEFT COLUMN — 360px */}
        <div className="w-full lg:w-[360px] lg:flex-shrink-0 space-y-4">

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-3 flex flex-col items-start gap-1">
              <span className="text-lg">🧊</span>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Fridge life</p>
              <p className="font-bold text-navy text-sm">{recipe.fridgeLife?.label ?? "4 Days"}</p>
            </div>
            <div className="bg-white rounded-2xl p-3 flex flex-col items-start gap-1">
              <span className="text-lg">⚡</span>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Calories</p>
              <p className="font-bold text-navy text-sm">{recipe.calories != null ? `${Math.round(recipe.calories)} kcal` : "—"}</p>
            </div>
            <div className="bg-white rounded-2xl p-3 flex flex-col items-start gap-1">
              <span className="text-lg">📡</span>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Microwave</p>
              <p className="font-bold text-navy text-sm">{recipe.microwaveScore?.label ?? "Good"}</p>
            </div>
          </div>

          {/* Add to meal plan */}
          {addExpanded ? (
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3">
              <p className="text-sm font-semibold text-navy flex-1">Servings</p>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setServings((s) => Math.max(1, s - 1))} className="px-3.5 py-2 text-gray-600 hover:bg-gray-50 font-bold">−</button>
                <span className="px-4 font-bold text-navy">{servings}</span>
                <button onClick={() => setServings((s) => Math.min(10, s + 1))} className="px-3.5 py-2 text-gray-600 hover:bg-gray-50 font-bold">+</button>
              </div>
              <button
                onClick={handleAddToMeal}
                className="bg-navy text-white font-semibold px-4 py-2 rounded-xl hover:bg-navy/90 text-sm"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddToMeal}
              className={`w-full py-4 rounded-2xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                inPlan ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-navy text-white hover:bg-navy/90"
              }`}
            >
              {inPlan ? <>✓ In your meal plan — update servings</> : <><span className="text-lg">+</span> Add to meal plan</>}
            </button>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Ingredients */}
          <section>
            <h2 className="text-lg font-extrabold text-navy mb-3">Ingredients</h2>
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
                          <div key={`${ing.id}-${idx}`} className="flex items-center justify-between px-4 py-3 gap-3">
                            <span className="text-sm text-gray-700">{cap(ing.name)}</span>
                            {(ing.amount != null && ing.amount > 0) ? (
                              <span className="text-sm font-semibold text-navy whitespace-nowrap">
                                {ing.amountDisplay ?? (Number.isInteger(ing.amount) ? ing.amount : Math.round(ing.amount * 100) / 100)}{ing.unit ? ` ${ing.unit}` : ""}
                              </span>
                            ) : ing.raw ? (
                              <span className="text-sm font-semibold text-navy text-right max-w-[50%] line-clamp-1">{ing.raw}</span>
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

          {/* Instructions */}
          {steps.length > 0 && (
            <section>
              <h2 className="text-lg font-extrabold text-navy mb-3">Prep instructions</h2>
              <div className="space-y-3">
                {steps.map((s) => (
                  <div key={s.number} className="flex gap-3">
                    <div className="flex-shrink-0 w-7 h-7 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">
                      {s.number}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{cap(s.step)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Similar recipes — full width below */}
      {similar.length > 0 && (
        <div className="px-4 mt-8">
          <h2 className="text-lg font-extrabold text-navy mb-3">You might also like</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {similar.map((r) => (
              <Link key={r.id} href={`/recipe/${r.id}`} className="flex-shrink-0 w-36 bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="relative aspect-[4/3] bg-gray-100">
                  {r.image ? (
                    <Image
                      src={r.image}
                      alt={r.title}
                      fill
                      className="object-cover"
                      sizes="144px"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/144x108/e8f0e8/4a7c4a?text=Recipe`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="text-2xl">🍽️</span>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-bold text-navy line-clamp-2 leading-snug">{formatTitle(r.title)}</p>
                  {r.readyInMinutes && <p className="text-xs text-gray-400 mt-0.5">⏱ {r.readyInMinutes}m</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
