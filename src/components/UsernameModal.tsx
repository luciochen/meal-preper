"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";

export default function UsernameModal() {
  const { completeSignUp, cancelSignUp } = useApp();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = (val: string): string => {
    if (val.length < 3) return "Username must be at least 3 characters";
    if (val.length > 20) return "Username must be 20 characters or less";
    if (!/^[a-zA-Z0-9_]+$/.test(val)) return "Only letters, numbers, and underscores";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate(username.trim());
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError("");
    const result = await completeSignUp(username.trim());
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success the modal is removed by the parent (pendingUsername → false)
  };

  const handleChange = (val: string) => {
    setUsername(val);
    if (error) setError(validate(val));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-7">
          <h2 className="text-xl font-extrabold text-navy mb-2">One last step</h2>
          <p className="text-sm text-gray-500">Choose a username for your Tangie account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="username"
              autoFocus
              autoComplete="off"
              maxLength={20}
              className={`w-full border rounded-xl px-4 py-3 text-sm text-navy placeholder-gray-400 outline-none transition-colors ${
                error ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-navy"
              }`}
            />
            {error ? (
              <p className="mt-1.5 text-xs text-red-500">{error}</p>
            ) : (
              <p className="mt-1.5 text-xs text-gray-400">3–20 characters, letters, numbers, underscores</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !username}
            className="w-full bg-navy text-white font-semibold py-3 rounded-xl text-sm hover:bg-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <button
          onClick={cancelSignUp}
          className="mt-4 w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
        >
          Cancel — I&apos;ll stay signed out
        </button>
      </div>
    </div>
  );
}
