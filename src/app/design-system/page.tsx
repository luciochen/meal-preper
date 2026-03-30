"use client";

import { useState } from "react";
import SearchInput from "@/components/ui/SearchInput";
import FilterDropdown from "@/components/ui/FilterDropdown";
import RecipeCard from "@/components/RecipeCard";
import { Recipe } from "@/lib/mockData";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_RECIPE: Recipe = {
  id: 99999,
  title: "Crispy potato and spicy chorizo tacos",
  image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&auto=format&fit=crop&q=80",
  readyInMinutes: 30,
  servings: 4,
  calories: 420,
  diets: [],
  cuisines: ["mexican"],
  dishTypes: ["main course"],
  extendedIngredients: [],
  analyzedInstructions: [],
  fridgeLife: { days: "4", label: "4 days" },
};

const MOCK_RECIPE_NO_IMAGE: Recipe = {
  ...MOCK_RECIPE,
  id: 99998,
  image: undefined,
  title: "Pan-seared salmon with herb butter",
};

const DIET_CHIPS = [
  { id: "vegan", label: "Vegan", icon: "🌱" },
  { id: "vegetarian", label: "Vegetarian", icon: "🥦" },
  { id: "high protein", label: "High protein", icon: "💪" },
  { id: "low calorie", label: "Low calorie", icon: "⚡" },
];

const COLORS = [
  { name: "navy", value: "#0f172a" },
  { name: "zest", value: "#76C83A" },
  { name: "cream", value: "#F0EAE0" },
  { name: "white", value: "#ffffff" },
  { name: "gray-100", value: "#f3f4f6" },
  { name: "gray-200", value: "#e5e7eb" },
  { name: "gray-400", value: "#9ca3af" },
  { name: "gray-700", value: "#374151" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DesignSystemPage() {
  const [searchValue, setSearchValue] = useState("");
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);

  const toggleDiet = (id: string) =>
    setSelectedDiets((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">

      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Zest</p>
        <h1 className="text-3xl font-extrabold text-navy">Design system</h1>
        <p className="text-sm text-gray-500 mt-1">
          Living reference for all UI components, tokens, and patterns.
        </p>
      </div>

      {/* ── Colors ── */}
      <section>
        <h2 className="text-lg font-bold text-navy mb-4">Colors</h2>
        <div className="flex flex-wrap gap-4">
          {COLORS.map((c) => (
            <div key={c.name} className="flex flex-col items-center gap-1.5">
              <div
                className="w-16 h-16 rounded-xl border border-black/10 shadow-sm"
                style={{ background: c.value }}
              />
              <span className="text-xs font-semibold text-navy">{c.name}</span>
              <span className="text-[10px] text-gray-400 font-mono">{c.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Typography ── */}
      <section>
        <h2 className="text-lg font-bold text-navy mb-1">Typography</h2>
        <p className="text-xs text-gray-400 mb-4 font-mono">Plus Jakarta Sans — weights 300–800</p>
        <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100">
          {[
            { label: "text-[2.5rem] font-extrabold", role: "Hero heading", weight: "800" },
            { label: "text-xl font-bold", role: "Section heading", weight: "700" },
            { label: "text-base font-bold", role: "Modal title / card heading", weight: "700" },
            { label: "text-sm font-semibold", role: "Card title / label", weight: "600" },
            { label: "text-sm font-medium", role: "Body / ingredient name", weight: "500" },
            { label: "text-sm font-medium text-gray-500", role: "Body / ingredient name", weight: "500" },
            { label: "text-xs text-gray-400", role: "Caption / meta", weight: "400" },
          ].map(({ label, role, weight }) => (
            <div key={label} className="flex items-center gap-6 px-5 py-4">
              <div className="w-48 flex-shrink-0">
                <p className="text-[10px] font-mono text-gray-400 leading-snug">{label}</p>
                <p className="text-[10px] text-gray-300 mt-0.5">weight {weight}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`${label} text-navy truncate`}>{role}</p>
              </div>
            </div>
          ))}
          <div className="px-5 py-4">
            <p className="text-[10px] font-mono text-gray-400 mb-2 leading-snug">
              text-[2.5rem] font-extrabold — Hero with accent
            </p>
            <p className="text-[2.5rem] font-extrabold text-navy leading-[1.15]">
              The cheat code to complete your{" "}
              <span className="text-zest">weekly meal prep</span> in 5 mins
            </p>
          </div>
        </div>
      </section>

      {/* ── Search input ── */}
      <section>
        <h2 className="text-lg font-bold text-navy mb-4">Search input</h2>
        <div className="bg-white rounded-2xl p-6">
          <SearchInput
            value={searchValue}
            onChange={setSearchValue}
            placeholder="Search recipes"
            className="max-w-sm"
          />
        </div>
      </section>

      {/* ── Filter dropdowns ── */}
      <section>
        <h2 className="text-lg font-bold text-navy mb-4">Filter dropdowns</h2>
        <div className="bg-white rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["Diet preference", "Cuisine", "Type", "Allergies"] as const).map((label) => (
              <FilterDropdown
                key={label}
                label={label}
                count={label === "Diet preference" ? selectedDiets.length : 0}
                isOpen={openFilter === label}
                onToggleOpen={() =>
                  setOpenFilter(openFilter === label ? null : label)
                }
              />
            ))}
          </div>
          {openFilter === "Diet preference" && (
            <div className="bg-gray-50 rounded-xl p-3 flex flex-wrap gap-2">
              {DIET_CHIPS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleDiet(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                    selectedDiets.includes(c.id)
                      ? "bg-navy text-white border-navy"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Buttons ── */}
      <section>
        <h2 className="text-lg font-bold text-navy mb-4">Buttons</h2>
        <div className="bg-white rounded-2xl p-6 flex flex-wrap gap-4 items-center">
          <button className="bg-navy text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-navy/90 transition-colors text-sm">
            Primary
          </button>
          <button className="border border-gray-300 text-navy font-semibold px-5 py-2.5 rounded-xl hover:border-gray-400 transition-colors text-sm">
            Secondary
          </button>
          <button className="text-sm text-zest font-semibold hover:underline">
            Ghost link
          </button>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <button className="w-8 h-8 rounded-full border-[1.5px] border-gray-300 text-gray-500 flex items-center justify-center hover:border-navy hover:text-navy transition-all">
                <span className="text-base leading-none">+</span>
              </button>
              <span className="text-[10px] text-gray-400">Default</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <button className="w-8 h-8 rounded-full bg-navy border-[1.5px] border-navy text-white flex items-center justify-center">
                <span className="text-sm leading-none">✓</span>
              </button>
              <span className="text-[10px] text-gray-400">In plan</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Badges ── */}
      <section>
        <h2 className="text-lg font-bold text-navy mb-4">Badges</h2>
        <div className="bg-white rounded-2xl p-6 flex flex-wrap gap-3 items-center">
          <span className="bg-white/90 text-navy text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200">
            NEW
          </span>
          <span className="bg-navy/10 text-navy text-xs font-medium px-2.5 py-1 rounded-full">
            Vegan ×
          </span>
          <span className="bg-zest text-white text-xs font-bold px-2.5 py-1 rounded-full">
            In plan
          </span>
        </div>
      </section>

      {/* ── Recipe cards ── */}
      <section>
        <h2 className="text-lg font-bold text-navy mb-4">Recipe card</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg">
          <RecipeCard recipe={MOCK_RECIPE} onOpen={() => {}} />
          <RecipeCard recipe={MOCK_RECIPE_NO_IMAGE} onOpen={() => {}} />
        </div>
      </section>

    </div>
  );
}
