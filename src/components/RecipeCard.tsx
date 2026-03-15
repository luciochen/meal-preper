"use client";

import Image from "next/image";
import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Recipe } from "@/lib/mockData";
import { formatTitle } from "@/lib/formatTitle";

interface Props {
  recipe: Recipe;
  onOpen: (id: number | string) => void;
}

export default function RecipeCard({ recipe, onOpen }: Props) {
  const { addToMealPlan, isInMealPlan, getMealPlanServings } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [servings, setServings] = useState(getMealPlanServings(recipe.id) || 1);
  const inPlan = isInMealPlan(recipe.id);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!expanded) { setExpanded(true); return; }
    addToMealPlan(recipe, servings);
    setExpanded(false);
  };

  const fridgeColor =
    Number(recipe.fridgeLife?.days) >= 5
      ? "bg-green-100 text-green-700"
      : Number(recipe.fridgeLife?.days) >= 3
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onOpen(recipe.id)}
    >
      <div className="relative aspect-[4/3] bg-gray-100">
        {recipe.image ? (
          <Image
            src={recipe.image}
            alt={recipe.title || "Recipe"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) calc(50vw - 20px), (max-width: 1024px) calc(33vw - 20px), 300px"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/400x300/e8f0e8/4a7c4a?text=${encodeURIComponent(recipe.title)}`;
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <span className="text-4xl">🍽️</span>
          </div>
        )}
        {inPlan && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            In plan
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-bold text-navy text-sm leading-snug mb-2 line-clamp-2">
          {formatTitle(recipe.title)}
        </h3>
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="text-xs text-gray-500">⏱ {recipe.readyInMinutes}m</span>
          {recipe.fridgeLife && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fridgeColor}`}>
              🧊 {recipe.fridgeLife.label}
            </span>
          )}
        </div>

        {expanded ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => setServings((s) => Math.max(1, s - 1))} className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-50 font-bold text-sm">−</button>
              <span className="px-3 text-sm font-semibold text-navy min-w-[2rem] text-center">{servings}</span>
              <button onClick={() => setServings((s) => Math.min(10, s + 1))} className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-50 font-bold text-sm">+</button>
            </div>
            <button
              onClick={handleAdd}
              className="flex-1 bg-navy text-white text-xs font-semibold py-2 rounded-lg hover:bg-navy/90 transition-colors"
            >
              Add {servings} servings
            </button>
          </div>
        ) : (
          <button
            onClick={handleAdd}
            className={`w-full text-sm font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              inPlan ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-navy text-white hover:bg-navy/90"
            }`}
          >
            {inPlan ? <>✓ Added to plan</> : <><span className="text-lg leading-none">+</span> Add to meal</>}
          </button>
        )}
      </div>
    </div>
  );
}
