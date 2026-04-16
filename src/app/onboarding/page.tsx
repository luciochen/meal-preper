"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

const STEPS = 4;

const DIETS = [
  { id: "vegan", label: "Vegan", icon: "🌱" },
  { id: "vegetarian", label: "Vegetarian", icon: "🥦" },
  { id: "high protein", label: "High protein", icon: "💪" },
  { id: "low calorie", label: "Low calorie", icon: "⚡" },
  { id: "easy to cook", label: "Easy to cook", icon: "👨‍🍳" },
];

const CUISINES = [
  { id: "italian", label: "Italian", icon: "🍝" },
  { id: "chinese", label: "Chinese", icon: "🥢" },
  { id: "mexican", label: "Mexican", icon: "🌮" },
  { id: "japanese", label: "Japanese", icon: "🍱" },
  { id: "korean", label: "Korean", icon: "🍜" },
  { id: "indian", label: "Indian", icon: "🍛" },
  { id: "thai", label: "Thai", icon: "🌶️" },
  { id: "french", label: "French", icon: "🥐" },
  { id: "mediterranean", label: "Mediterranean", icon: "🫒" },
  { id: "american", label: "American", icon: "🍔" },
];

const ALLERGENS = [
  { id: "dairy", label: "Dairy", icon: "🥛" },
  { id: "eggs", label: "Eggs", icon: "🥚" },
  { id: "peanuts", label: "Peanuts", icon: "🥜" },
  { id: "tree nuts", label: "Tree nuts", icon: "🌰" },
  { id: "soy", label: "Soy", icon: "🫘" },
  { id: "gluten", label: "Gluten", icon: "🌾" },
  { id: "fish", label: "Fish", icon: "🐟" },
  { id: "shellfish", label: "Shellfish", icon: "🦐" },
];

const STEP_LABELS = ["Preferences", "Cuisines", "Allergies", "Account"];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [diets, setDiets] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [surpriseMe, setSurpriseMe] = useState(false);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [noAllergies, setNoAllergies] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const { setPreferences, setOnboardingDone, signInWithGoogle, user } = useApp();
  const router = useRouter();

  const toggle = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const toggleCuisine = (id: string) => {
    setSurpriseMe(false);
    toggle(id, cuisines, setCuisines);
  };

  const toggleSurpriseMe = () => {
    setSurpriseMe((v) => !v);
    setCuisines([]);
  };

  const toggleNoAllergies = () => {
    setNoAllergies((v) => !v);
    setAllergies([]);
  };

  const toggleAllergen = (id: string) => {
    setNoAllergies(false);
    toggle(id, allergies, setAllergies);
  };

  // If user becomes logged in while on step 4, complete onboarding
  useEffect(() => {
    if (step === 4 && user && !finishing) {
      const prefs = {
        diets,
        cuisines: surpriseMe ? [] : cuisines,
        allergies: noAllergies ? [] : allergies,
      };
      setPreferences(prefs);
      setOnboardingDone(true);
      setFinishing(true);
      setTimeout(() => router.push("/"), 2500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, step]);

  // "Skip all" jumps straight to the auth step
  const handleSkip = () => {
    setStep(STEPS);
  };

  // Called before triggering OAuth — persists selections to localStorage so
  // AppContext can migrate them to the DB after sign-in completes
  const handleGoogleSignIn = () => {
    const prefs = {
      diets,
      cuisines: surpriseMe ? [] : cuisines,
      allergies: noAllergies ? [] : allergies,
    };
    setPreferences(prefs);
    setOnboardingDone(true);
    signInWithGoogle();
  };

  if (finishing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="mb-6">
          <div className="w-14 h-14 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
          <h2 className="text-xl font-extrabold text-navy mb-2">Finding your recipes</h2>
          <p className="text-gray-500 text-sm">Analyzing 3,000+ recipes based on your preferences…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-10 min-h-screen flex flex-col">
      {/* Progress */}
      <div className="py-6">
        <div className="flex items-center gap-2 mb-3">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < step ? "bg-green-500" : "bg-gray-200"}`} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 font-medium">Step {step} of {STEPS} — {STEP_LABELS[step - 1]}</p>
          {step < STEPS && (
            <button onClick={handleSkip} className="text-xs text-gray-400 hover:text-gray-600 underline">Skip all</button>
          )}
        </div>
      </div>

      <div className="flex-1">
        {/* Step 1: Diet Preferences */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-extrabold text-navy mb-1">Your preferences</h2>
            <p className="text-gray-500 text-sm mb-6">Select all that apply. We&apos;ll tailor your recipe feed.</p>
            <div className="grid grid-cols-2 gap-3">
              {DIETS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => toggle(d.id, diets, setDiets)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                    diets.includes(d.id)
                      ? "border-green-500 bg-green-50"
                      : "border-gray-100 bg-white hover:border-gray-200"
                  }`}
                >
                  <span className="text-2xl">{d.icon}</span>
                  <span className={`font-semibold text-sm ${diets.includes(d.id) ? "text-green-700" : "text-navy"}`}>
                    {d.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Cuisines */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-extrabold text-navy mb-1">Favorite cuisines</h2>
            <p className="text-gray-500 text-sm mb-6">Pick the flavors you love most.</p>
            <div className="grid grid-cols-3 gap-3">
              {/* Surprise Me */}
              <button
                onClick={toggleSurpriseMe}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all col-span-3 flex-row justify-center ${
                  surpriseMe
                    ? "border-green-500 bg-green-50"
                    : "border-gray-100 bg-white hover:border-gray-200"
                }`}
              >
                <span className="text-2xl">🎲</span>
                <span className={`font-semibold text-sm ${surpriseMe ? "text-green-700" : "text-navy"}`}>
                  Surprise me (all cuisines)
                </span>
              </button>
              {CUISINES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleCuisine(c.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                    !surpriseMe && cuisines.includes(c.id)
                      ? "border-green-500 bg-green-50"
                      : "border-gray-100 bg-white hover:border-gray-200"
                  }`}
                >
                  <span className="text-2xl">{c.icon}</span>
                  <span className={`font-semibold text-xs text-center ${!surpriseMe && cuisines.includes(c.id) ? "text-green-700" : "text-navy"}`}>
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Allergies */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-extrabold text-navy mb-1">Food allergies</h2>
            <p className="text-gray-500 text-sm mb-6">We&apos;ll filter out recipes containing these ingredients.</p>
            <div className="space-y-2">
              <button
                onClick={toggleNoAllergies}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                  noAllergies ? "border-green-500 bg-green-50" : "border-gray-100 bg-white hover:border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">✅</span>
                  <span className={`font-semibold text-sm ${noAllergies ? "text-green-700" : "text-navy"}`}>
                    I&apos;m not allergic to anything
                  </span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  noAllergies ? "border-green-500 bg-green-500" : "border-gray-300"
                }`}>
                  {noAllergies && <span className="text-white text-xs font-bold">✓</span>}
                </div>
              </button>
              {ALLERGENS.map((a) => {
                const selected = allergies.includes(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleAllergen(a.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                      selected ? "border-green-500 bg-green-50" : "border-gray-100 bg-white hover:border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{a.icon}</span>
                      <span className={`font-semibold text-sm ${selected ? "text-green-700" : "text-navy"}`}>
                        {a.label}
                      </span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selected ? "border-green-500 bg-green-500" : "border-gray-300"
                    }`}>
                      {selected && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Sign up / Sign in */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-extrabold text-navy mb-1">Sign up to discover 200+ recipes</h2>
            <p className="text-gray-500 text-sm mb-8">Save your preferences and meal plan across all your devices.</p>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <button
                onClick={handleGoogleSignIn}
                className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl border border-gray-200 bg-white font-semibold text-navy hover:bg-gray-50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 mt-4">
              Don&apos;t have an account?{" "}
              <button onClick={handleGoogleSignIn} className="text-green-600 font-bold hover:underline">
                Sign up
              </button>
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="pt-6 flex gap-3">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 font-semibold text-gray-600 hover:border-gray-300 transition-colors"
          >
            Back
          </button>
        )}
        {step < STEPS && (
          <button
            onClick={() => setStep(step + 1)}
            className="flex-1 bg-navy text-white font-semibold py-3.5 rounded-xl hover:bg-navy/90 transition-colors"
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  );
}
