"use client";

import Image from "next/image";
import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Recipe } from "@/lib/mockData";
import { formatTitle } from "@/lib/formatTitle";
import { trackAddToMealPlan } from "@/lib/analytics";

interface Props {
  recipe: Recipe;
  onOpen: (id: number | string) => void;
}

export default function RecipeCard({ recipe, onOpen }: Props) {
  const { addToMealPlan, isInMealPlan } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [servings, setServings] = useState(1);
  const inPlan = isInMealPlan(recipe.id);
  const title = formatTitle(recipe.title);

  const handleCardClick = () => {
    if (expanded) { setExpanded(false); return; }
    onOpen(recipe.id);
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inPlan) return;
    setExpanded((v) => !v);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToMealPlan(recipe, servings);
    trackAddToMealPlan(recipe.id, recipe.title, servings);
    setExpanded(false);
  };

  const adjust = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setServings((s) => Math.max(1, Math.min(10, s + delta)));
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {recipe.image ? (
          <Image
            src={recipe.image}
            alt={title || "Recipe"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) calc(50vw - 24px), (max-width: 1024px) calc(33vw - 24px), 340px"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/400x300/e8f0e8/4a7c4a?text=${encodeURIComponent(recipe.title)}`;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">🍽️</span>
          </div>
        )}
        <div className="absolute top-2.5 right-2.5 flex flex-row items-center gap-1.5">
          {inPlan && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#BAF06A", color: "#06723C" }}>
              In meal plan
            </span>
          )}
          {recipe.readyInMinutes != null && recipe.readyInMinutes > 0 && (
            <span className="bg-white text-navy text-[10px] font-bold px-2 py-0.5 rounded-full">
              {recipe.readyInMinutes} min
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3.5">
        {/* Title row + action button */}
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-navy text-sm leading-snug line-clamp-2 flex-1">
            {title}
          </p>
          <button
            onClick={handlePlusClick}
            className={`flex-shrink-0 w-8 h-8 rounded-full border-[1.5px] inline-flex items-center justify-center transition-all ${
              inPlan
                ? "bg-white border-zest text-zest"
                : expanded
                ? "border-navy text-navy bg-navy/5"
                : "border-gray-300 text-gray-500 hover:border-navy hover:text-navy"
            }`}
            aria-label={inPlan ? "In meal plan" : expanded ? "Cancel" : "Add to meal plan"}
          >
            {inPlan ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
          </button>
        </div>

        {/* Stepper + confirm (expanded, not yet in plan) */}
        {expanded && !inPlan && (
          <div
            className="flex items-center gap-2 mt-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center border border-gray-200 rounded-full overflow-hidden">
              <button
                onClick={(e) => adjust(-1, e)}
                className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-navy font-bold text-sm transition-colors"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-semibold text-navy leading-none select-none">
                {servings}
              </span>
              <button
                onClick={(e) => adjust(1, e)}
                className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-navy font-bold text-sm transition-colors"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAdd}
              className="flex-1 bg-navy text-white text-xs font-semibold py-1.5 rounded-full hover:bg-navy/90 transition-colors"
            >
              Add {servings} serving{servings !== 1 ? "s" : ""}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
