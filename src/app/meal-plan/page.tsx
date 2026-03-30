"use client";

import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { classifyIngredient } from "@/lib/mockData";
import RecipeModal from "@/components/RecipeModal";

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
import { trackCheckGroceryItem } from "@/lib/analytics";

const CATEGORY_ICONS: Record<string, string> = {
  "Produce": "🥦",
  "Meats and seafoods": "🥩",
  "Dairy & eggs": "🥛",
  "Pantry": "🫙",
  "Frozen": "🧊",
  "Beverages": "🥤",
  "Other": "📦",
};

// Map classifyIngredient() output to display names
const CATEGORY_DISPLAY: Record<string, string> = {
  "Produce": "Produce",
  "Meat & Seafood": "Meats and seafoods",
  "Dairy & Eggs": "Dairy & eggs",
  "Pantry": "Pantry",
  "Frozen": "Frozen",
  "Beverages": "Beverages",
  "Other": "Other",
};

const CATEGORY_ORDER = ["Produce", "Meats and seafoods", "Dairy & eggs", "Pantry", "Frozen", "Beverages", "Other"];

export default function MealPlanPage() {
  const { mealPlan, updateServings, removeFromMealPlan } = useApp();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [openRecipeId, setOpenRecipeId] = useState<number | string | null>(null);

  const totalServings = mealPlan.reduce((a, i) => a + i.servings, 0);

  const groceryList = useMemo<GroceryMap>(() => {
    const map: Record<string, Record<string, GroceryItem>> = {};
    for (const item of mealPlan) {
      const ratio = item.servings / (item.recipe.servings || 1);
      for (const ing of item.recipe.extendedIngredients || []) {
        const rawCat = classifyIngredient(ing.name);
        const cat = CATEGORY_DISPLAY[rawCat] ?? rawCat;
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
    for (const cat of CATEGORY_ORDER) {
      if (map[cat]) sorted[cat] = Object.values(map[cat]);
    }
    for (const cat of Object.keys(map)) {
      if (!sorted[cat]) sorted[cat] = Object.values(map[cat]);
    }
    return sorted;
  }, [mealPlan]);

  const toggleChecked = (key: string, itemName: string, category: string) => {
    const next = !checked[key];
    setChecked((prev) => ({ ...prev, [key]: next }));
    trackCheckGroceryItem(itemName, category, next);
  };

  const buildGroceryText = () => {
    const lines: string[] = [`🛒 Grocery list — ${mealPlan.length} recipe${mealPlan.length !== 1 ? "s" : ""}\n`];
    for (const [category, items] of Object.entries(groceryList)) {
      lines.push(`${CATEGORY_ICONS[category] || "📦"} ${category}`);
      for (const item of items) {
        const qty = item.amount > 0 ? ` (${item.amount < 1 ? (Math.round(item.amount * 4) / 4) : Math.round(item.amount)}${item.unit ? ` ${item.unit}` : ""})` : "";
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
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-16 text-center">
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
    <div className="max-w-6xl mx-auto px-4 pb-16">

      {/* Header */}
      <div className="flex items-center justify-between py-6">
        <h1 className="text-3xl font-extrabold text-navy leading-tight">My meal plan</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={emailList}
            className="flex items-center gap-2 border border-gray-300 text-navy font-semibold px-4 py-2 rounded-xl hover:border-gray-400 transition-colors text-sm bg-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
          <button
            onClick={copyList}
            className="flex items-center gap-2 border border-gray-300 text-navy font-semibold px-4 py-2 rounded-xl hover:border-gray-400 transition-colors text-sm bg-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? "Copied!" : "Copy ingredients"}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* Left col — recipes */}
        <div className="w-full lg:w-[360px] lg:flex-shrink-0">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-bold text-navy">Recipes</h2>
            <p className="text-sm text-gray-400">{totalServings} servings</p>
          </div>
          <div className="space-y-3">
            {mealPlan.map((item) => (
              <div key={item.recipe.id} className="bg-white rounded-2xl shadow-sm p-4">
                {/* Top: image + title */}
                <div className="flex gap-3 mb-4">
                  <button onClick={() => setOpenRecipeId(item.recipe.id)} className="flex-shrink-0">
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
                  </button>
                  <button onClick={() => setOpenRecipeId(item.recipe.id)} className="text-left flex-1 min-w-0">
                    <p className="font-semibold text-navy text-sm line-clamp-2 hover:underline">
                      {item.recipe.title
                        ? item.recipe.title.charAt(0).toUpperCase() + item.recipe.title.slice(1)
                        : "Untitled recipe"}
                    </p>
                  </button>
                </div>
                {/* Bottom: stepper + delete */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center justify-between border border-gray-200 rounded-xl px-3 py-1.5">
                    <button
                      onClick={() => updateServings(item.recipe.id, Math.max(1, item.servings - 1))}
                      className="text-gray-400 hover:text-navy text-sm font-bold transition-colors"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold text-navy">{item.servings}</span>
                    <button
                      onClick={() => updateServings(item.recipe.id, Math.min(10, item.servings + 1))}
                      className="text-gray-400 hover:text-navy text-sm font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromMealPlan(item.recipe.id)}
                    className="text-sm text-red-400 font-medium hover:text-red-600 transition-colors flex-shrink-0"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right col — ingredients */}
        <section className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-navy mb-4">Ingredients</h2>
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-5">
            {Object.entries(groceryList).map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{CATEGORY_ICONS[category] || "📦"}</span>
                  <h3 className="text-sm font-semibold text-navy">{category}</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const key = `${category}__${item.name}`;
                    const isChecked = !!checked[key];
                    return (
                      <button
                        key={key}
                        onClick={() => toggleChecked(key, item.name, category)}
                        className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isChecked ? "border-green-500 bg-green-500" : "border-gray-300"
                        }`}>
                          {isChecked && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                        <span className={`flex-1 text-sm capitalize transition-colors ${isChecked ? "text-gray-300 line-through" : "text-gray-700"}`}>
                          {item.name}
                        </span>
                        {item.amount > 0 && (
                          <span className={`text-xs font-medium transition-colors ${isChecked ? "text-gray-300" : "text-gray-500"}`}>
                            {item.amount < 1 ? (Math.round(item.amount * 4) / 4).toFixed(2).replace(/\.?0+$/, "") : Math.round(item.amount)}{item.unit ? ` ${item.unit}` : ""}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>

    {openRecipeId !== null && (
      <RecipeModal
        recipeId={openRecipeId}
        onClose={() => setOpenRecipeId(null)}
        onOpenRecipe={(id) => setOpenRecipeId(id)}
      />
    )}

</>
  );
}
