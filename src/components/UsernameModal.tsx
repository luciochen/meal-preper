"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";

export default function UsernameModal() {
  const { completeSignUp, cancelSignUp } = useApp();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length < 3) { setError("Username must be at least 3 characters"); return; }
    if (!/^[a-z0-9_]+$/i.test(trimmed)) { setError("Only letters, numbers, and underscores"); return; }
    setLoading(true);
    setError("");
    const { error: err } = await completeSignUp(trimmed);
    if (err) { setError(err); setLoading(false); }
  };

  const handleCancel = async () => {
    await cancelSignUp();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-7">
          <h2 className="text-xl font-extrabold text-navy mb-2">One last step</h2>
          <p className="text-sm text-gray-500">Choose a username for your Tangie account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            placeholder="Username"
            maxLength={20}
            autoFocus
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy placeholder-gray-400 focus:outline-none focus:border-navy transition-colors"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy text-white font-semibold py-3 rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel — I&apos;ll stay signed out
          </button>
        </div>
      </div>
    </div>
  );
}
