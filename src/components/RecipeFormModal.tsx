"use client";

import { useState, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import {
  UserRecipe,
  UserRecipeIngredient,
  UserRecipeInstruction,
  DIET_TAGS,
  CUISINE_OPTIONS,
  parseIngredientString,
} from "@/lib/userRecipes";
import { ScrapedRecipe } from "@/app/api/recipe-import/route";
import { Recipe } from "@/lib/mockData";

interface IngredientRow extends UserRecipeIngredient {}
interface InstructionRow { text: string }

interface FormState {
  title: string;
  description: string;
  cuisine: string;
  dietTags: string[];
  readyInMinutes: string;
  servings: string;
  ingredients: IngredientRow[];
  instructions: InstructionRow[];
}

const emptyForm = (): FormState => ({
  title: "",
  description: "",
  cuisine: "",
  dietTags: [],
  readyInMinutes: "",
  servings: "",
  ingredients: [{ quantity: "", unit: "", name: "" }, { quantity: "", unit: "", name: "" }, { quantity: "", unit: "", name: "" }],
  instructions: [{ text: "" }],
});

function recipeToForm(recipe: Recipe): FormState {
  return {
    title: recipe.title || "",
    description: (recipe.summary || "").replace(/<[^>]*>/g, ""),
    cuisine: recipe.cuisines?.[0] || "",
    dietTags: recipe.diets?.map((d) => {
      const map: Record<string, string> = {
        vegan: "Vegan", vegetarian: "Vegetarian", "high protein": "High protein",
        "low calorie": "Low calorie", "easy to cook": "Easy to cook",
      };
      return map[d.toLowerCase()] || d;
    }).filter((d) => DIET_TAGS.includes(d)) || [],
    readyInMinutes: recipe.readyInMinutes ? String(recipe.readyInMinutes) : "",
    servings: recipe.servings ? String(recipe.servings) : "",
    ingredients: recipe.ingredients_json?.length
      ? recipe.ingredients_json
      : (recipe.extendedIngredients || []).map((ing) => ({
          quantity: ing.amount ? String(ing.amount) : "",
          unit: ing.unit || "",
          name: ing.name || "",
        })),
    instructions: recipe.instructions_json?.length
      ? recipe.instructions_json.map((s: UserRecipeInstruction) => ({ text: s.text }))
      : (recipe.analyzedInstructions?.[0]?.steps || []).map((s) => ({ text: s.step })),
  };
}

function scrapedToForm(scraped: ScrapedRecipe): FormState {
  return {
    title: scraped.title || "",
    description: scraped.description || "",
    cuisine: "",
    dietTags: [],
    readyInMinutes: scraped.prepTimeMinutes ? String(scraped.prepTimeMinutes) : "",
    servings: scraped.servings ? String(scraped.servings) : "",
    ingredients: scraped.ingredients.map(parseIngredientString),
    instructions: scraped.instructions.map((text) => ({ text })),
  };
}

interface Props {
  mode: "create" | "edit";
  sourceType?: "scratch" | "website" | "instagram";
  sourceUrl?: string;
  editingRecipe?: Recipe;
  scrapedData?: ScrapedRecipe;
  onClose: () => void;
  onSaved?: (recipe: UserRecipe) => void;
  onDeleted?: () => void;
}

export default function RecipeFormModal({
  mode,
  sourceType = "scratch",
  sourceUrl,
  editingRecipe,
  scrapedData,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const { user } = useApp();

  const [form, setForm] = useState<FormState>(() => {
    if (mode === "edit" && editingRecipe) return recipeToForm(editingRecipe);
    if (scrapedData) return scrapedToForm(scrapedData);
    return emptyForm();
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(
    mode === "edit" ? (editingRecipe?.image || "") : (scrapedData?.imageUrl || "")
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2500);
  };

  // ── Image ─────────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Ingredients ───────────────────────────────────────────────────────────

  const updateIngredient = (i: number, field: keyof IngredientRow, val: string) => {
    setForm((f) => {
      const next = [...f.ingredients];
      next[i] = { ...next[i], [field]: val };
      return { ...f, ingredients: next };
    });
  };

  const addIngredient = () =>
    setForm((f) => ({ ...f, ingredients: [...f.ingredients, { quantity: "", unit: "", name: "" }] }));

  const removeIngredient = (i: number) =>
    setForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }));

  // ── Instructions ──────────────────────────────────────────────────────────

  const updateInstruction = (i: number, val: string) => {
    setForm((f) => {
      const next = [...f.instructions];
      next[i] = { text: val };
      return { ...f, instructions: next };
    });
  };

  const addInstruction = () =>
    setForm((f) => ({ ...f, instructions: [...f.instructions, { text: "" }] }));

  const removeInstruction = (i: number) =>
    setForm((f) => ({ ...f, instructions: f.instructions.filter((_, idx) => idx !== i) }));

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (!user) { setError("You must be signed in"); return; }

    setSaving(true);
    setError("");

    const sb = createClient();

    try {
      const ingredients = form.ingredients.filter((i) => i.name.trim());
      const instructions_json: UserRecipeInstruction[] = form.instructions
        .filter((s) => s.text.trim())
        .map((s, idx) => ({ step: idx + 1, text: s.text.trim() }));

      const baseData = {
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: imagePreview && !imagePreview.startsWith("blob:") ? imagePreview : null,
        cuisine: form.cuisine || null,
        diet_tags: form.dietTags,
        ready_in_minutes: form.readyInMinutes ? parseInt(form.readyInMinutes) : null,
        servings: form.servings ? parseInt(form.servings) : null,
        ingredients_json: ingredients,
        instructions_json,
        source_type: sourceType,
        source_url: sourceUrl || null,
        updated_at: new Date().toISOString(),
      };

      let recipeId: string;
      let savedRow: Record<string, unknown>;

      if (mode === "edit" && editingRecipe) {
        recipeId = String(editingRecipe.id);
        const { data, error: updateErr } = await sb
          .from("user_recipes")
          .update(baseData)
          .eq("id", recipeId)
          .select()
          .single();
        if (updateErr) throw updateErr;
        savedRow = data;
      } else {
        const { data, error: insertErr } = await sb
          .from("user_recipes")
          .insert({ ...baseData, created_at: new Date().toISOString() })
          .select()
          .single();
        if (insertErr) throw insertErr;
        savedRow = data;
        recipeId = data.id as string;
      }

      // Upload image file if selected
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${recipeId}.${ext}`;
        const { error: uploadErr } = await sb.storage
          .from("recipe-images")
          .upload(path, imageFile, { upsert: true });
        if (!uploadErr) {
          const { data: { publicUrl } } = sb.storage.from("recipe-images").getPublicUrl(path);
          await sb.from("user_recipes").update({ image_url: publicUrl }).eq("id", recipeId);
          savedRow.image_url = publicUrl;
        }
      }

      showToast(mode === "edit" ? "Recipe updated!" : "Recipe added!");
      onSaved?.(savedRow as unknown as UserRecipe);
      setTimeout(onClose, 800);
    } catch {
      setError("Failed to save recipe. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!editingRecipe || !user) return;
    setDeleting(true);
    const sb = createClient();
    await sb.from("user_recipes").delete().eq("id", String(editingRecipe.id));
    showToast("Recipe deleted");
    setTimeout(() => { onDeleted?.(); onClose(); }, 600);
    setDeleting(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const inputCls = "w-full border border-gray-200 focus:border-navy rounded-xl px-4 py-2.5 text-sm text-navy placeholder-gray-400 outline-none transition-colors";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Toast */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] pointer-events-none transition-all duration-300 ${toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
        <div className="bg-navy text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg whitespace-nowrap">{toast}</div>
      </div>

      <div
        className="relative bg-white w-full sm:max-w-2xl max-h-[96dvh] sm:max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-extrabold text-navy">
            {mode === "edit" ? "Edit recipe" : sourceType === "website" ? "Review imported recipe" : "Create recipe"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable form */}
        <div className="overflow-y-auto flex-1">
          <form id="recipe-form" onSubmit={handleSubmit} className="p-6 space-y-6">

            {/* 1. Image */}
            <div>
              <label className={labelCls}>Recipe image</label>
              {imagePreview ? (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-navy transition-colors bg-gray-50">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 mb-2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p className="text-sm text-gray-400 font-medium">Upload image</p>
                  <p className="text-xs text-gray-300 mt-0.5">JPG, PNG, or WebP</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* 2. Title */}
            <div>
              <label className={labelCls}>Recipe title <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Honey garlic salmon"
                className={inputCls}
              />
            </div>

            {/* 3. Description */}
            <div>
              <label className={labelCls}>Description <span className="text-gray-300 font-normal normal-case">optional</span></label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="A short description of this recipe…"
                rows={3}
                className={inputCls + " resize-none"}
              />
            </div>

            {/* 4. Cuisine */}
            <div>
              <label className={labelCls}>Cuisine</label>
              <select
                value={form.cuisine}
                onChange={(e) => setForm((f) => ({ ...f, cuisine: e.target.value }))}
                className={inputCls}
              >
                <option value="">Select cuisine</option>
                {CUISINE_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* 5. Diet tags */}
            <div>
              <label className={labelCls}>Diet tags</label>
              <div className="flex flex-wrap gap-2">
                {DIET_TAGS.map((tag) => {
                  const active = form.dietTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          dietTags: active
                            ? f.dietTags.filter((t) => t !== tag)
                            : [...f.dietTags, tag],
                        }))
                      }
                      className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                        active
                          ? "bg-navy text-white border-navy"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6 + 7. Prep time & Servings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Prep time (minutes) <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  min="1"
                  value={form.readyInMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, readyInMinutes: e.target.value }))}
                  placeholder="30"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Servings <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  min="1"
                  value={form.servings}
                  onChange={(e) => setForm((f) => ({ ...f, servings: e.target.value }))}
                  placeholder="4"
                  className={inputCls}
                />
              </div>
            </div>

            {/* 8. Ingredients */}
            <div>
              <label className={labelCls}>Ingredients</label>
              <div className="space-y-2">
                {/* Column labels */}
                <div className="grid grid-cols-[80px_100px_1fr_28px] gap-2 px-0.5">
                  {["Qty", "Unit", "Ingredient", ""].map((h) => (
                    <span key={h} className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{h}</span>
                  ))}
                </div>
                {form.ingredients.map((ing, i) => (
                  <div key={i} className="grid grid-cols-[80px_100px_1fr_28px] gap-2 items-center">
                    <input
                      type="text"
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(i, "quantity", e.target.value)}
                      placeholder="2"
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={ing.unit}
                      onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                      placeholder="cups"
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={ing.name}
                      onChange={(e) => updateIngredient(i, "name", e.target.value)}
                      placeholder="Ingredient name"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => removeIngredient(i)}
                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors rounded-lg"
                      aria-label="Remove"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addIngredient}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-navy/70 transition-colors"
              >
                <span className="text-base leading-none">+</span> Add ingredient
              </button>
            </div>

            {/* 9. Instructions */}
            <div>
              <label className={labelCls}>Instructions</label>
              <div className="space-y-3">
                {form.instructions.map((step, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-navy text-white text-xs font-bold rounded-full flex items-center justify-center mt-2">
                      {i + 1}
                    </span>
                    <textarea
                      value={step.text}
                      onChange={(e) => updateInstruction(i, e.target.value)}
                      placeholder={`Step ${i + 1}…`}
                      rows={2}
                      className={inputCls + " flex-1 resize-none"}
                    />
                    <button
                      type="button"
                      onClick={() => removeInstruction(i)}
                      className="mt-2 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors rounded-lg flex-shrink-0"
                      aria-label="Remove step"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addInstruction}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-navy/70 transition-colors"
              >
                <span className="text-base leading-none">+</span> Add step
              </button>
            </div>

            {/* Source URL (imports) */}
            {sourceUrl && (
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <span>Source:</span>
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-navy hover:underline truncate max-w-[300px]">
                  {sourceUrl}
                </a>
              </div>
            )}

            {/* Error */}
            {error && <p className="text-sm text-red-500">{error}</p>}

            {/* Delete (edit mode) */}
            {mode === "edit" && (
              <div className="pt-2 border-t border-gray-100">
                {confirmDelete ? (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-gray-500 flex-1">Delete this recipe? This cannot be undone.</p>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-sm text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-sm font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
                    >
                      {deleting ? "Deleting…" : "Yes, delete"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="text-sm text-red-400 hover:text-red-600 transition-colors font-medium"
                  >
                    Delete recipe
                  </button>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="recipe-form"
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : mode === "edit" ? (
              "Save changes"
            ) : (
              "Add to my recipes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
