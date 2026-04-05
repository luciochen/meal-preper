"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import LoginModal from "@/components/LoginModal";

export default function Navbar() {
  const pathname = usePathname();
  const { mealPlan, profile, authLoading, signOut } = useApp();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  return (
    <>
      {/* Mobile: full-width rectangular bar flush to top. Desktop: floating pill with margin */}
      <nav suppressHydrationWarning className="fixed top-0 sm:top-6 left-0 right-0 z-50 sm:px-6 pointer-events-none">
        <div className="max-w-[1152px] mx-auto pointer-events-auto bg-white sm:rounded-full shadow-sm px-6 sm:px-5 h-14 sm:h-12 flex items-center justify-between gap-2">
          <Link href="/" className="flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Tangie" className="h-8 w-auto object-contain" />
          </Link>

          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link href="/my-recipes" className={`whitespace-nowrap text-sm font-medium transition-colors ${
              pathname === "/my-recipes" ? "text-navy" : "text-gray-500 hover:text-navy"
            }`}>
              <span className="hidden sm:inline">My </span>Recipes
            </Link>
            <Link href="/meal-plan" className="flex items-center gap-1.5 group flex-shrink-0">
              <span className={`whitespace-nowrap text-sm font-medium transition-colors ${
                pathname === "/meal-plan" ? "text-navy" : "text-gray-500 group-hover:text-navy"
              }`}>
                Meal plan
              </span>
              {mealPlan.length > 0 && (
                <span className="w-5 h-5 bg-zest text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none flex-shrink-0">
                  {mealPlan.length}
                </span>
              )}
            </Link>

            {/* Auth area */}
            {authLoading ? (
              <div className="w-16 h-7 rounded-xl bg-gray-200 animate-pulse flex-shrink-0" />
            ) : profile ? (
              <div ref={dropdownRef} className="relative flex-shrink-0">
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-1 text-sm font-semibold text-navy hover:text-navy/70 transition-colors"
                >
                  <span className="truncate min-w-[1ch] max-w-[5ch] sm:max-w-[120px]">{profile.displayName}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`flex-shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}>
                    <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-md border border-gray-100 py-1 w-36 z-[60]">
                    <button
                      onClick={async () => { setDropdownOpen(false); await signOut(); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-navy hover:bg-gray-50 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="bg-navy text-white text-sm font-semibold px-3.5 py-1.5 rounded-xl hover:bg-navy/90 transition-colors flex-shrink-0"
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </nav>

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </>
  );
}
