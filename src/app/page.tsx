import HomePageClientWrapper from "@/components/HomePageClientWrapper";

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 pb-16">
      {/* Hero — rendered server-side so search engines index it */}
      <div className="pt-8 pb-10">
        <h1 className="text-[2.5rem] font-extrabold text-navy leading-[1.15] max-w-[800px]">
          Pick the recipes you love,{" "}
          <br />
          and we&apos;ll whip up a{" "}
          <span className="text-zest">meal prep plan</span> 🍱✨
        </h1>
        <p className="mt-4 text-navy/60 text-base max-w-xl">
          Browse hundreds of meal-prep friendly recipes, track fridge life, and
          get a personalised grocery list — all in one place.
        </p>
      </div>

      {/* Interactive recipe browser — client-side only, avoids localStorage hydration mismatch */}
      <HomePageClientWrapper />
    </div>
  );
}
