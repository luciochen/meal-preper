# meal-preper — Claude Guide

## Project
Next.js 15 App Router + Supabase + Tailwind CSS. Meal prep web app with recipe browsing, fridge life tracking, and a grocery list.

**Key files:**
- `src/app/page.tsx` — homepage (recipe browse + filters)
- `src/app/recipe/[id]/page.tsx` — recipe detail (two-column layout)
- `src/app/meal-plan/page.tsx` — My Meals page
- `src/app/onboarding/page.tsx` — onboarding flow
- `src/components/Navbar.tsx` — top nav
- `src/components/RecipeCard.tsx` — recipe card component
- `src/app/api/recipes/search/route.ts` — search API
- `src/app/api/recipes/[id]/route.ts` — recipe detail API
- `tailwind.config.ts` — custom colors (navy, sage-*)

---

## UI Design System

### Writing
- **Sentence case everywhere** — only capitalise the first word and proper nouns. No title case.
  - ✓ "Add to meal plan", "Popular recipes", "Fridge life", "Prep instructions"
  - ✗ "Add To Meal Plan", "Popular Recipes", "Fridge Life"

### Palette
| Token | Value | Use |
|---|---|---|
| `navy` | `#0f172a` | Headings, primary buttons, active states, logo |
| `green-500` | — | Progress, success badges, step circles |
| `green-600` | — | Hover on green CTAs, links |
| `green-100` | — | Success card backgrounds |
| `sage-100` | `#e8f0e8` | Nav active state |
| `gray-400` | — | Secondary labels, captions |
| `gray-200` | — | Borders, dividers, skeletons |
| Page bg | `#eef2ee` | Set in globals.css via `--background` |

### Typography
| Role | Classes |
|---|---|
| Page title (h1) | `text-3xl font-extrabold text-navy leading-tight` |
| Section heading (h2) | `text-xl font-extrabold text-navy` |
| Section sub-label | `text-xs text-gray-400 font-medium uppercase tracking-wide` |
| Body text | `text-sm text-gray-700` |
| Caption / meta | `text-xs text-gray-400` |
| Button label | `font-semibold` (primary) or `font-bold` (full-width CTA) |

### Layout & Containers
- Page container: `max-w-5xl mx-auto px-4`
- Two-column detail: `flex flex-col lg:flex-row gap-5`, left col `lg:w-[360px] lg:flex-shrink-0`
- Recipe grid: `grid grid-cols-2 sm:grid-cols-3 gap-3`
- Stat grid: `grid grid-cols-3 gap-3`

### Border Radius
| Usage | Class |
|---|---|
| Hero / large card | `rounded-3xl` |
| Standard card | `rounded-2xl` |
| Button / input / small card | `rounded-xl` |
| Chip / badge / pill | `rounded-full` |

### Cards
- **Standard card**: `bg-white rounded-2xl shadow-sm`
- **Hero card**: `bg-white rounded-3xl p-7 shadow-sm`
- **Stat card**: `bg-white rounded-2xl p-3 flex flex-col items-start gap-1`
  - Label: `text-xs text-gray-400 font-medium uppercase tracking-wide`
  - Value: `font-bold text-navy text-sm`
- Card hover: add `hover:shadow-md transition-shadow`

### Buttons
| Type | Classes |
|---|---|
| Primary | `bg-navy text-white font-semibold px-5 py-3 rounded-xl hover:bg-navy/90 transition-colors` |
| Full-width CTA | `w-full py-4 rounded-2xl font-bold text-sm` + navy or green bg |
| Outline | `border-2 border-gray-200 text-gray-600 font-semibold rounded-xl hover:border-gray-300 transition-colors` |
| Ghost link | `text-sm text-green-600 font-semibold hover:underline` |

### Filter Chips (toggle)
```
Active:   bg-navy text-white border-navy rounded-full
Inactive: bg-white text-gray-600 border-gray-200 rounded-full hover:border-gray-400
Size:     px-3.5 py-2 text-xs font-semibold
```

### Active Filter Pills (dismissible)
```
bg-navy/10 text-navy font-medium px-2.5 py-1 rounded-full text-xs
hover:bg-navy/20 transition-colors
```

### Navbar
- Height: `h-14`, fixed, `z-50`, `bg-white/90 backdrop-blur-md border-b border-gray-100`
- Active link: `bg-sage-100 text-navy rounded-lg`
- Inactive link: `text-gray-500 hover:text-navy`

### Interaction & States
- All buttons/links: `transition-colors`
- Loading: `animate-pulse` with `bg-gray-200` placeholder shapes
- Image aspect: `aspect-[4/3]` for recipe cards, `aspect-video` for hero
- Horizontal scroll rows: `overflow-x-auto pb-1 no-scrollbar flex gap-2`
- Text overflow: `line-clamp-2` for titles
