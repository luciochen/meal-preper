"use client";

import { useState, useEffect } from "react";
import { ScrapedRecipe } from "@/app/api/recipe-import/route";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_url: "Please enter a valid URL",
  no_recipe_found: "We couldn't find a recipe on this page. Try another URL or add it manually.",
  fetch_failed: "Something went wrong. Please try again.",
};

interface Props {
  onClose: () => void;
  onImported: (data: ScrapedRecipe) => void;
  onAddManually: () => void;
}

export default function ImportWebsiteModal({ onClose, onImported, onAddManually }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/recipe-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        const code = data.error as string;
        setError(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.fetch_failed);
      } else {
        onImported(data as ScrapedRecipe);
      }
    } catch {
      setError(ERROR_MESSAGES.fetch_failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        <h2 className="text-xl font-extrabold text-navy mb-1">Import from a website</h2>
        <p className="text-sm text-gray-500 mb-6">Paste the URL of any recipe page.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); if (error) setError(""); }}
              placeholder="Paste a recipe URL"
              autoFocus
              disabled={loading}
              className={`w-full border rounded-xl px-4 py-3 text-sm text-navy placeholder-gray-400 outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed ${
                error ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-navy"
              }`}
            />
            {error ? (
              <p className="mt-1.5 text-xs text-red-500">{error}</p>
            ) : (
              <p className="mt-1.5 text-xs text-gray-400">
                Works with AllRecipes, BBC Good Food, Food Network, and most recipe sites
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full bg-navy text-white font-semibold py-3 rounded-xl text-sm hover:bg-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Importing…
              </>
            ) : (
              "Import recipe"
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={onAddManually}
            className="text-sm text-gray-400 hover:text-navy transition-colors"
          >
            Add manually instead
          </button>
        </div>
      </div>
    </div>
  );
}
