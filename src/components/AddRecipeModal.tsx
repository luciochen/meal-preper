"use client";

type Method = "scratch" | "website" | "instagram";

interface Props {
  onClose: () => void;
  onSelect: (method: Method) => void;
}

const OPTIONS: { id: Method; label: string; desc: string; icon: React.ReactNode; disabled?: boolean }[] = [
  {
    id: "scratch",
    label: "Create from scratch",
    desc: "Add your own recipe with ingredients and instructions.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
  },
  {
    id: "website",
    label: "Import from a website",
    desc: "Paste a recipe URL and we'll pull in the details automatically.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    ),
  },
  {
    id: "instagram",
    label: "Import from Instagram",
    desc: "Coming soon!",
    disabled: true,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    ),
  },
];

export default function AddRecipeModal({ onClose, onSelect }: Props) {
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

        <h2 className="text-xl font-extrabold text-navy mb-1">Add a recipe</h2>
        <p className="text-sm text-gray-500 mb-6">How would you like to add it?</p>

        <div className="space-y-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              disabled={opt.disabled}
              onClick={() => !opt.disabled && onSelect(opt.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                opt.disabled
                  ? "border-gray-100 bg-gray-50 cursor-not-allowed"
                  : "border-gray-100 bg-white hover:border-navy hover:bg-navy/5"
              }`}
            >
              <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
                opt.disabled ? "bg-gray-100 text-gray-300" : "bg-navy/5 text-navy"
              }`}>
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${opt.disabled ? "text-gray-400" : "text-navy"}`}>
                  {opt.label}
                </p>
                <p className={`text-xs mt-0.5 ${opt.disabled ? "text-gray-400 italic" : "text-gray-500"}`}>
                  {opt.desc}
                </p>
              </div>
              {!opt.disabled && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-gray-400">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
