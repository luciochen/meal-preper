"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function Navbar() {
  const pathname = usePathname();
  const { mealPlan } = useApp();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 h-14">
      <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/" className="font-bold text-navy text-lg tracking-tight">
          meal preper
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/meal-plan"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors relative ${
              pathname === "/meal-plan" ? "bg-sage-100 text-navy" : "text-gray-500 hover:text-navy"
            }`}
          >
            My meals
            {mealPlan.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                {mealPlan.length}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
