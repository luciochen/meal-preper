# Tangie — Office Hours Design Doc
**Date:** 2026-03-29 | **Branch:** main | **Skill:** /office-hours

---

## Corrected thesis (after office hours)

**Target user:** Mainstream Western working adults (25–40) who already want to meal prep or have tried it. They fail not because they can't find recipes — they fail because finding *prep-appropriate* recipes takes too long, and existing apps make the planning feel like a chore.

**Not:** Chinese diaspora specifically. Not diet-trackers. Not families. Not people who cook for fun.

---

## The problem

The status quo for this user is:
1. Scroll TikTok/Instagram/YouTube for inspiration (slow, not optimized for batch cooking)
2. Use Mealime or Paprika to plan (decent but: paywalled features, generic recipe library, feels like a database)
3. Sunday comes, they're not sure what goes with what, prep takes longer than expected, they quit

The gap: no app shows you *which recipes are meal-prep-friendly* (not just "healthy") and helps you *pick 3 that work well together* in a single Sunday session.

---

## What makes Tangie different

### The actual differentiator: meal-prep intelligence

Every recipe in Tangie has data no other app has:
- **Fridge life** — does this last 3 days or 5?
- **Microwave score** — does this reheat well or go rubbery?
- **Prep time** — real batch-cooking time, not "serves 4 in 20 minutes"

This is the product. Not the recipe browser. The data layer that tells you *whether something is worth prepping* before you commit to it on Sunday.

### Secondary differentiator: discovery-first UX

Mealime starts with a preference form. Tangie starts with the food. Card-based browsing, fast to scan, filter on the fly. More like Instagram, less like a nutritionist's intake form.

### What's not the differentiator

"Free" is not a moat. It's a distribution tactic for getting first users. Don't build the business strategy around it.

---

## Why "free" is still useful (but not the moat)

Free lowers the barrier to first use, which matters in a category where Mealime charges upfront. Use free as a wedge for discovery and virality — recipe sharing, deep links — not as a permanent positioning.

The moat is the meal-prep intelligence layer. Build that deep before thinking about monetization.

---

## Honest assessment of current position

| Dimension | Status |
|-----------|--------|
| Product differentiation | Weak today (UX + free). Potential is strong (meal-prep metadata). |
| Demand evidence | None yet. Pre-product, no users. |
| Content library | Thin. Spoonacular + a few custom Chinese recipes. Need to grow. |
| Technical foundation | Solid. Supabase, Next.js, good component architecture. |
| Competitor gap | Real. No one has the meal-prep intelligence layer. |

---

## The actual risk

**Content quality.** The meal-prep scores (fridge life, microwave) are only valuable if they're accurate and cover enough recipes. Right now they're computed heuristically. If they're wrong, they're worse than not having them — they break trust.

**Content depth.** Once a user has browsed all 50 available recipes, there's no reason to come back. This is a content business problem dressed up as an app problem. Solve this before launching to a wide audience.

---

## What to build next (in order)

### 1. Validate the meal-prep intelligence layer (this week)
Find 10 meal-preppers. Ask them: "When you're choosing a recipe to prep, what do you wish you knew upfront?" Listen for fridge life, reheat quality, prep complexity. If they don't care about these, your differentiator is wrong.

### 2. Get the recipe library to 80+ quality recipes
Not Spoonacular scraped results — curated, tested, with accurate fridge life and microwave scores. The scores only matter if people trust them.

### 3. Build "prep together" grouping
Surface recipes that work well in the same Sunday session. Shared ingredients, complementary cook times, compatible equipment. This is the next feature after the current browse/plan/shop loop.

### 4. Then: launch to a small audience and watch what they actually do

---

## Alternatives considered

| Option | Thesis | Verdict |
|--------|--------|---------|
| General meal prep app (current) | Better UX + free | Weak moat. Needs the intelligence layer to survive if Mealime goes free. |
| Chinese diaspora niche | First mover in underserved market | Real opportunity, but user corrected: not the target. Keep Chinese recipes as content variety, not core identity. |
| Meal-prep intelligence platform | The data layer is the product | This is the right long-term bet. Build toward it. |
| Browser/iOS share extension | Meet user on TikTok in context | Right idea, wrong sequence. Do this after core product is solid. |

---

## The assignment

Before writing more features: find 10 people who have tried meal prepping in the last 3 months. Show them the fridge life score and microwave score on a recipe. Watch their face. If they light up — that's your product. If they shrug — go back to basics.

One question to ask them: *"When you're deciding whether to meal prep a recipe, what's the first thing you want to know?"*

If the answer is fridge life / reheat quality — you're building the right thing. If it's macros, calories, or cost — you're building for a different user.

---

## Open questions

- How do you get the meal-prep scores to be accurate at scale? (Manual curation? User feedback loop? ML?)
- What does week-over-week retention look like? Why would someone open Tangie on Tuesday vs. only on Saturday?
- What's the content strategy — curation, user-generated, or algorithmic?
- Monetization: premium plan features? Grocery affiliate? Brand partnerships with meal prep containers?

---

*Generated by /office-hours (gstack)*
