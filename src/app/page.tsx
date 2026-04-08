import HomePageClientWrapper from "@/components/HomePageClientWrapper";

export default function HomePage() {
  return (
    <div className="max-w-[1152px] mx-auto px-6 pb-16">
      {/* Hero — rendered server-side so search engines index it */}
      <div className="pt-8 pb-10">
        <h1 className="text-[2.5rem] font-extrabold text-navy leading-[1.15] max-w-[800px]">
          Your meal prep recipe hub 🥗✨
        </h1>
        <p className="mt-4 text-navy/60 text-base max-w-xl">
          Discover meal-prep recipes you&apos;ll love, save your favourites, and get your grocery list done in seconds.
        </p>
      </div>

      {/* Interactive recipe browser — client-side only, avoids localStorage hydration mismatch */}
      <HomePageClientWrapper />
    </div>
  );
}
