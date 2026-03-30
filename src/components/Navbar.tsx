"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function Navbar() {
  const pathname = usePathname();
  const { mealPlan } = useApp();

  return (
    <nav suppressHydrationWarning className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 h-14">
      <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
        <Link href="/" className="font-bold text-navy text-xl tracking-tight">
          tangie
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/meal-plan" className="flex items-center gap-2 group">
            <span
              className={`text-sm font-medium transition-colors ${
                pathname === "/meal-plan"
                  ? "text-navy"
                  : "text-gray-500 group-hover:text-navy"
              }`}
            >
              My meal plan
            </span>
            {mealPlan.length > 0 && (
              <span className="w-5 h-5 bg-zest text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {mealPlan.length}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
