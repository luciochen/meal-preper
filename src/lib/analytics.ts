// ---------------------------------------------------------------------------
// Analytics event helpers
// All events flow to GA4 via window.gtag injected by GoogleAnalytics component.
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function track(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, params);
}

// ─── Funnel ────────────────────────────────────────────────────────────────

/** Step 2: recipe list loaded and visible */
export function trackViewRecipeList(count: number) {
  track("view_recipe_list", { recipe_count: count });
}

/** Step 3: user opens a recipe (modal or detail page) */
export function trackOpenRecipe(recipeId: number | string, recipeTitle: string) {
  track("open_recipe", { recipe_id: String(recipeId), recipe_title: recipeTitle });
}

/** Step 4: user adds a recipe to the meal plan */
export function trackAddToMealPlan(recipeId: number | string, recipeTitle: string, servings: number) {
  track("add_to_meal_plan", {
    recipe_id: String(recipeId),
    recipe_title: recipeTitle,
    servings,
  });
}

/** Step 5: user checks off a grocery item */
export function trackCheckGroceryItem(itemName: string, category: string, checked: boolean) {
  track("check_grocery_item", {
    item_name: itemName,
    category,
    checked,
  });
}

// ─── Search & filters ──────────────────────────────────────────────────────

/** Fired when a search returns 0 results — reveals library gaps */
export function trackSearchNoResults(query: string, activeFilters: string[]) {
  track("search_no_results", {
    search_query: query,
    active_filters: activeFilters.join(","),
  });
}

/** Fired on every filter toggle — track combination patterns */
export function trackFilterApplied(filterKey: string, filterId: string, activeFilters: Record<string, string[]>) {
  const allActive = Object.entries(activeFilters)
    .flatMap(([k, ids]) => ids.map((id) => `${k}:${id}`))
    .join(",");
  track("filter_applied", {
    filter_key: filterKey,
    filter_id: filterId,
    all_active_filters: allActive,
  });
}

// ─── Recipe import funnel ──────────────────────────────────────────────────

/** Fired when the user clicks "Add recipe" to start the import flow */
export function trackRecipeImportStarted(page: "my-recipes" | "homepage") {
  track("recipe_import_started", { page });
}

/** Fired when the user selects an import method in the choose modal */
export function trackRecipeImportMethodSelected(method: "website" | "manual" | "instagram") {
  track("recipe_import_method_selected", { method });
}

/** Fired after URL scraping completes (success or failure) */
export function trackRecipeUrlFetchResult(success: boolean, errorType?: string) {
  track("recipe_url_fetch_result", {
    success,
    ...(errorType ? { error_type: errorType } : {}),
  });
}

/** Fired when the user closes the import flow without saving */
export function trackRecipeImportAbandoned(step: "choose" | "website" | "scratch" | "confirm_import") {
  track("recipe_import_abandoned", { step });
}

/** Fired when a recipe is successfully saved through the import flow */
export function trackRecipeImportCompleted(params: {
  method: "scratch" | "website" | "instagram";
  had_image: boolean;
  ingredient_count: number;
  ai_enriched: boolean;
}) {
  track("recipe_import_completed", params);
}

/** Fired when a user-created recipe is added to the meal plan */
export function trackUserRecipeAddedToMealPlan(source_type: string) {
  track("user_recipe_added_to_meal_plan", { source_type });
}

// ─── Scroll depth ──────────────────────────────────────────────────────────

/** Fired at 50% and 100% scroll depth on a recipe detail */
export function trackRecipeScrollDepth(recipeId: number | string, depthPercent: number) {
  track("recipe_scroll_depth", {
    recipe_id: String(recipeId),
    depth_percent: depthPercent,
  });
}
