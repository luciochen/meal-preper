"use client";

import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { classifyIngredient } from "@/lib/mockData";

interface GroceryItem {
  name: string;
  amount: number;
  unit: string;
  checked: boolean;
}

interface GroceryMap {
  [category: string]: GroceryItem[];
}

import { useState, useMemo } from "react";

const CATEGORY_ICONS: Record<string, string> = {
  "Produce": "🥦",
  "Meat & Seafood": "🥩",
  "Dairy & Eggs": "🥛",
  "Pantry": "🫙",
  "Frozen": "🧊",
  "Beverages": "🥤",
  "Other": "📦",
};

export default function MealPlanPage() {
  const { mealPlan, updateServings, removeFromMealPlan, clearMealPlan } = useApp();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [showClearModal, setShowClearModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const groceryList = useMemo<GroceryMap>(() => {
    const map: Record<string, Record<string, GroceryItem>> = {};
    for (const item of mealPlan) {
      const ratio = item.servings / (item.recipe.servings || 1);
      for (const ing of item.recipe.extendedIngredients || []) {
        const cat = classifyIngredient(ing.name);
        if (!map[cat]) map[cat] = {};
        const unit = ing.unit ?? "";
        const amount = ing.amount ?? 0;
        const key = `${ing.name.toLowerCase()}__${unit}`;
        if (map[cat][key]) {
          map[cat][key].amount += amount * ratio;
        } else {
          map[cat][key] = { name: ing.name, amount: amount * ratio, unit, checked: false };
        }
      }
    }
    const sorted: GroceryMap = {};
    const order = ["Produce", "Meat & Seafood", "Dairy & Eggs", "Pantry", "Frozen", "Beverages", "Other"];
    for (const cat of order) {
      if (map[cat]) sorted[cat] = Object.values(map[cat]);
    }
    for (const cat of Object.keys(map)) {
      if (!sorted[cat]) sorted[cat] = Object.values(map[cat]);
    }
    return sorted;
  }, [mealPlan]);

  const totalItems = Object.values(groceryList).flat().length;
  const checkedCount = Object.keys(checked).filter((k) => checked[k]).length;

  const toggleChecked = (key: string) => setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const buildGroceryText = () => {
    const lines: string[] = [`🛒 Grocery list — ${mealPlan.length} recipe${mealPlan.length !== 1 ? "s" : ""}\n`];
    for (const [category, items] of Object.entries(groceryList)) {
      lines.push(`${CATEGORY_ICONS[category] || "📦"} ${category}`);
      for (const item of items) {
        const qty = item.amount > 0 ? ` (${Math.round(item.amount * 10) / 10} ${item.unit})` : "";
        lines.push(`• ${item.name}${qty}`);
      }
      lines.push("");
    }
    return lines.join("\n");
  };

  const copyList = async () => {
    await navigator.clipboard.writeText(buildGroceryText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const emailList = () => {
    const text = buildGroceryText();
    const subject = encodeURIComponent("Grocery list");
    const body = encodeURIComponent(text);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (mealPlan.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-10 pb-16 text-center">
        <p className="text-5xl mb-4">🥡</p>
        <h2 className="text-2xl font-extrabold text-navy mb-2">Your meal plan is empty</h2>
        <p className="text-gray-400 text-sm mb-6">Browse recipes and tap &quot;+&quot; to build your weekly prep list.</p>
        <Link href="/" className="inline-block bg-navy text-white font-semibold px-6 py-3 rounded-xl hover:bg-navy/90 transition-colors">
          Browse recipes →
        </Link>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-5xl mx-auto px-4 pb-16">
      <div className="py-6">
        <h1 className="text-2xl font-extrabold text-navy">My meal plan</h1>
        <p className="text-gray-400 text-sm mt-0.5">{mealPlan.length} recipes · {mealPlan.reduce((a, i) => a + i.servings, 0)} total servings</p>
      </div>

      {/* Selected recipes */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-500 uppercase tracking-wide">Selected recipes</h2>
          <button
            onClick={() => setShowClearModal(true)}
            className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
          >
            Clear all
          </button>
        </div>
        <div className="space-y-3">
          {mealPlan.map((item) => (
            <div key={item.recipe.id} className="bg-white rounded-2xl p-3 flex items-center gap-3">
              <Link href={`/recipe/${item.recipe.id}`} className="flex-shrink-0">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100">
                  {item.recipe.image ? (
                    <Image
                      src={item.recipe.image}
                      alt={item.recipe.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/64x64/e8f0e8/4a7c4a?text=Food`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-2xl">🍽️</span>
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/recipe/${item.recipe.id}`}>
                  <p className="font-bold text-navy text-sm line-clamp-1 hover:underline">{item.recipe.title ? item.recipe.title.charAt(0).toUpperCase() + item.recipe.title.slice(1) : "Untitled recipe"}</p>
                </Link>
                <p className="text-xs text-gray-400 mt-0.5">
                  {item.servings} servings · 🧊 {item.recipe.fridgeLife?.label}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => item.servings > 1 ? updateServings(item.recipe.id, item.servings - 1) : removeFromMealPlan(item.recipe.id)}
                    className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-50 text-sm font-bold"
                  >
                    {item.servings === 1 ? "🗑" : "−"}
                  </button>
                  <span className="px-2 text-sm font-bold text-navy min-w-[1.5rem] text-center">{item.servings}</span>
                  <button
                    onClick={() => updateServings(item.recipe.id, Math.min(10, item.servings + 1))}
                    className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-50 text-sm font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Grocery list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-500 uppercase tracking-wide">Grocery list</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-medium">{checkedCount}/{totalItems} checked</span>
            <button onClick={copyList} className="text-xs font-semibold text-green-600 hover:text-green-700 transition-colors">
              {copied ? "Copied!" : "Copy"}
            </button>
            <button onClick={emailList} className="text-xs font-semibold text-green-600 hover:text-green-700 transition-colors">
              Email
            </button>
          </div>
        </div>

        {checkedCount > 0 && (
          <div className="mb-3">
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${(checkedCount / totalItems) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-4">
          {Object.entries(groceryList).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{CATEGORY_ICONS[category] || "📦"}</span>
                <h3 className="text-sm font-bold text-navy">{category}</h3>
                <span className="text-xs text-gray-400">({items.length})</span>
              </div>
              <div className="bg-white rounded-2xl divide-y divide-gray-50">
                {items.map((item) => {
                  const key = `${category}__${item.name}`;
                  const isChecked = !!checked[key];
                  return (
                    <button
                      key={key}
                      onClick={() => toggleChecked(key)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isChecked ? "border-green-500 bg-green-500" : "border-gray-300"
                      }`}>
                        {isChecked && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                      <span className={`flex-1 text-sm capitalize transition-colors ${isChecked ? "text-gray-300 line-through" : "text-gray-700"}`}>
                        {item.name}
                      </span>
                      <span className={`text-xs font-medium transition-colors ${isChecked ? "text-gray-300" : "text-navy"}`}>
                        {Math.round(item.amount * 10) / 10} {item.unit}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {checkedCount > 0 && (
          <button
            onClick={() => setChecked({})}
            className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 py-2 underline"
          >
            Clear all checks
          </button>
        )}
      </section>
    </div>

    {showClearModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowClearModal(false)}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-extrabold text-navy mb-2">Clear meal plan?</h2>
          <p className="text-sm text-gray-500 mb-6">This will remove all {mealPlan.length} recipes from your plan. This can&apos;t be undone.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowClearModal(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { clearMealPlan(); setShowClearModal(false); }}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
