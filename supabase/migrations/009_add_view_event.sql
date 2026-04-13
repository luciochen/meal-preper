-- Add 'view' event type for tracking recipe opens
ALTER TABLE public.recipe_interactions
  DROP CONSTRAINT IF EXISTS recipe_interactions_event_type_check;

ALTER TABLE public.recipe_interactions
  ADD CONSTRAINT recipe_interactions_event_type_check
  CHECK (event_type IN ('view', 'view_short', 'view_long', 'save', 'impression_miss'));

-- Rebuild materialized view to include total_view_count
DROP MATERIALIZED VIEW IF EXISTS public.recipe_social_scores;

CREATE MATERIALIZED VIEW public.recipe_social_scores AS
  SELECT
    recipe_id,
    COUNT(DISTINCT CASE WHEN event_type = 'save'
      THEN COALESCE(user_id::text, anon_id) END)      AS save_count,
    COUNT(DISTINCT CASE WHEN event_type = 'view_long'
      THEN COALESCE(user_id::text, anon_id) END)      AS engaged_view_count,
    COUNT(CASE WHEN event_type = 'view' THEN 1 END)   AS total_view_count
  FROM public.recipe_interactions
  GROUP BY recipe_id;

CREATE UNIQUE INDEX idx_rss_recipe_id ON public.recipe_social_scores (recipe_id);
