"use client";

import { useRef, useEffect, useState } from "react";

interface Props {
  onClose: () => void;
}

export default function FeedbackModal({ onClose }: Props) {
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, contactEmail }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-navy">Share feedback</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-navy transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {status === "sent" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-3xl">🙏</span>
            <p className="font-semibold text-navy">Thanks for the feedback!</p>
            <p className="text-sm text-gray-500">We read every message.</p>
            <button
              onClick={onClose}
              className="mt-2 bg-navy text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-navy/90 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                Your message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Found a bug? Have a suggestion? Tell us anything..."
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-navy placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                Your email <span className="normal-case font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition"
              />
            </div>

            {status === "error" && (
              <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
            )}

            <button
              type="submit"
              disabled={!message.trim() || status === "sending"}
              className="w-full bg-navy text-white font-semibold py-3 rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {status === "sending" ? "Sending…" : "Send feedback"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
