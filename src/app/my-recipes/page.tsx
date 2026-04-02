"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { UserRecipe, userRecipeToRecipe } from "@/lib/userRecipes";
import { Recipe } from "@/lib/mockData";
import RecipeCard from "@/components/RecipeCard";
import RecipeModal from "@/components/RecipeModal";
import AddRecipeModal from "@/components/AddRecipeModal";
import RecipeFormModal from "@/components/RecipeFormModal";
import ImportWebsiteModal from "@/components/ImportWebsiteModal";
import LoginModal from "@/components/LoginModal";
import { ScrapedRecipe } from "@/app/api/recipe-import/route";

type Step = "idle" | "choose" | "scratch" | "website" | "confirm-import";

export default function MyRecipesPage() {
  const { user, authLoading, pendingAction, clearPendingAction } = useApp();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [scrapedData, setScrapedData] = useState<ScrapedRecipe | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  // Resume "add recipe" action after sign-in
  useEffect(() => {
    if (pendingAction === "add_recipe" && user) {
      clearPendingAction();
      setStep("choose");
    }
  }, [pendingAction, user, clearPendingAction]);

  const fetchRecipes = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const sb = createClient();
      const { data } = await sb
        .from("user_recipes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRecipes((data as UserRecipe[] || []).map(userRecipeToRecipe));
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

  const handleAddRecipe = () => {
    if (!user) { setShowLogin(true); return; }
    setStep("choose");
  };

  const handleRecipeSaved = () => { fetchRecipes(); };

  const handleRecipeDeleted = () => {
    setSelectedRecipe(null);
    fetchRecipes();
  };

  // ── Logged-out state ───────────────────────────────────────────────────────

  if (!authLoading && !user) {
    return (
      <div className="max-w-[1152px] mx-auto px-6 pb-16 pt-8">
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <p className="text-5xl mb-5">📖</p>
          <h1 className="text-2xl font-extrabold text-navy mb-2">Your recipes, all in one place</h1>
          <p className="text-gray-500 text-sm max-w-sm mb-6">
            Sign in to save and manage your personal recipe collection.
          </p>
          <button
            onClick={() => setShowLogin(true)}
            className="bg-navy text-white font-semibold px-5 py-3 rounded-xl hover:bg-navy/90 transition-colors"
          >
            Log in
          </button>
        </div>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </div>
    );
  }

  return (
    <div className="max-w-[1152px] mx-auto px-6 pb-16 pt-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-navy">My recipes</h1>
          {!loading && recipes.length > 0 && (
            <p className="text-sm text-gray-400 mt-1">{recipes.length} recipe{recipes.length !== 1 ? "s" : ""}</p>
          )}
        </div>
        {!loading && (
          <button
            onClick={handleAddRecipe}
            className="bg-navy text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-navy/90 transition-colors"
          >
            Add recipe
          </button>
        )}
      </div>

      {/* Loading */}
      {(loading || authLoading) ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-8 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🍳</p>
          <p className="text-navy font-bold text-lg mb-1">No recipes yet</p>
          <p className="text-gray-400 text-sm mb-6">Add your first one!</p>
          <button
            onClick={handleAddRecipe}
            className="bg-navy text-white font-semibold px-5 py-3 rounded-xl hover:bg-navy/90 transition-colors"
          >
            Add recipe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onOpen={(id) => {
                const r = recipes.find((r) => String(r.id) === String(id));
                if (r) setSelectedRecipe(r);
              }}
            />
          ))}
        </div>
      )}

      {/* Recipe modal */}
      {selectedRecipe && (
        <RecipeModal
          recipeId={selectedRecipe.id}
          initialRecipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onOpenRecipe={(id) => {
            const r = recipes.find((r) => String(r.id) === String(id));
            if (r) setSelectedRecipe(r);
          }}
          onRecipeDeleted={handleRecipeDeleted}
          onRecipeSaved={() => { fetchRecipes(); setSelectedRecipe(null); }}
        />
      )}

      {/* Add recipe flow */}
      {step === "choose" && (
        <AddRecipeModal
          onClose={() => setStep("idle")}
          onSelect={(method) => setStep(method === "website" ? "website" : "scratch")}
        />
      )}

      {step === "website" && (
        <ImportWebsiteModal
          onClose={() => setStep("choose")}
          onImported={(data) => { setScrapedData(data); setStep("confirm-import"); }}
          onAddManually={() => setStep("scratch")}
        />
      )}

      {(step === "scratch" || step === "confirm-import") && (
        <RecipeFormModal
          mode="create"
          sourceType={step === "confirm-import" ? "website" : "scratch"}
          sourceUrl={step === "confirm-import" ? scrapedData?.source_url : undefined}
          scrapedData={step === "confirm-import" ? scrapedData ?? undefined : undefined}
          onClose={() => { setStep("idle"); setScrapedData(null); }}
          onSaved={handleRecipeSaved}
        />
      )}

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
