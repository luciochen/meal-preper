"use client";

import { useState, useEffect } from "react";
import { ScrapedRecipe } from "@/app/api/recipe-import/route";
import { trackRecipeUrlFetchResult } from "@/lib/analytics";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_url: "Please enter a valid Instagram link",
  no_recipe_found: "We couldn't find a recipe in this post. Make sure the caption contains ingredients and steps.",
  fetch_failed: "Something went wrong. Please try again.",
  private_post: "This post appears to be private or unavailable.",
};

interface Props {
  onClose: () => void;
  onImported: (data: ScrapedRecipe) => void;
  onAddManually: () => void;
}

export default function ImportInstagramModal({ onClose, onImported, onAddManually }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // When auto-scraping fails, show a caption paste fallback
  const [showCaptionFallback, setShowCaptionFallback] = useState(false);
  const [caption, setCaption] = useState("");

  const isValidInstagramUrl = (val: string) =>
    /instagram\.com\/(p|reel|tv)\//.test(val.trim());

  const submit = async (opts: { url: string; caption?: string }) => {
    setLoading(true);
    setError("");
    try {
      const body: Record<string, string> = { url: opts.url };
      if (opts.caption) body.caption = opts.caption;

      const res = await fetch("/api/recipe-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        const code = data.error as string;
        trackRecipeUrlFetchResult(false, code || "fetch_failed");
        if (code === "no_recipe_found" && !showCaptionFallback) {
          // First failure: surface the caption paste fallback
          setShowCaptionFallback(true);
          setError("");
        } else {
          setError(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.fetch_failed);
        }
      } else {
        trackRecipeUrlFetchResult(true);
        onImported(data as ScrapedRecipe);
      }
    } catch {
      trackRecipeUrlFetchResult(false, "network_error");
      setError(ERROR_MESSAGES.fetch_failed);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!isValidInstagramUrl(trimmed)) {
      setError("Please paste a valid Instagram post or Reel link");
      return;
    }
    await submit({ url: trimmed });
  };

  const handleCaptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() || !url.trim()) return;
    await submit({ url: url.trim(), caption: caption.trim() });
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

        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-navy">Import from Instagram</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6 ml-11">Paste a link to any public post or Reel.</p>

        {!showCaptionFallback ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); if (error) setError(""); }}
                placeholder="https://www.instagram.com/p/…"
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
                  Works with posts and Reels that have the recipe written in the caption
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
                  Reading Instagram post…
                </>
              ) : (
                "Import recipe"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCaptionSubmit} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
              Instagram restricts automatic reading of posts. Paste the post caption below and we'll extract the recipe for you.
            </div>
            <div>
              <textarea
                value={caption}
                onChange={(e) => { setCaption(e.target.value); if (error) setError(""); }}
                placeholder="Paste the Instagram post caption here…"
                autoFocus
                disabled={loading}
                rows={6}
                className={`w-full border rounded-xl px-4 py-3 text-sm text-navy placeholder-gray-400 outline-none transition-colors resize-none disabled:bg-gray-50 disabled:cursor-not-allowed ${
                  error ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-navy"
                }`}
              />
              {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || !caption.trim()}
              className="w-full bg-navy text-white font-semibold py-3 rounded-xl text-sm hover:bg-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Extracting recipe…
                </>
              ) : (
                "Extract recipe"
              )}
            </button>

            <button
              type="button"
              onClick={() => { setShowCaptionFallback(false); setError(""); setCaption(""); }}
              className="w-full text-sm text-gray-400 hover:text-navy transition-colors"
            >
              Try the link again
            </button>
          </form>
        )}

        {!showCaptionFallback && (
          <div className="mt-4 text-center">
            <button
              onClick={onAddManually}
              className="text-sm text-gray-400 hover:text-navy transition-colors"
            >
              Add manually instead
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
