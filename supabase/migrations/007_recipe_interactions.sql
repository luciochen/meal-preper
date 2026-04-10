-- ── recipe_interactions ───────────────────────────────────────────────────────
-- Tracks per-user/anon engagement with recipes for personalization scoring.
-- user_id is null for anonymous sessions; anon_id is null for auth users.

CREATE TABLE IF NOT EXISTS public.recipe_interactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  anon_id     TEXT,
  recipe_id   TEXT        NOT NULL,
  event_type  TEXT        NOT NULL
    CHECK (event_type IN ('view_short', 'view_long', 'save', 'impression_miss')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT interactions_identity_check CHECK (
    (user_id IS NOT NULL AND anon_id IS NULL) OR
    (user_id IS NULL     AND anon_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_ri_recipe_id  ON public.recipe_interactions (recipe_id);
CREATE INDEX IF NOT EXISTS idx_ri_user_id    ON public.recipe_interactions (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ri_anon_id    ON public.recipe_interactions (anon_id) WHERE anon_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ri_created_at ON public.recipe_interactions (created_at);

-- ── Social score aggregate ────────────────────────────────────────────────────
-- Refreshed every 6h in Phase 3 via pg_cron:
--   SELECT cron.schedule('refresh-social-scores', '0 */6 * * *',
--     'REFRESH MATERIALIZED VIEW CONCURRENTLY public.recipe_social_scores');
--
-- "Engaged view" = view_long only (≥30s). view_short is a personal signal only.
CREATE MATERIALIZED VIEW IF NOT EXISTS public.recipe_social_scores AS
  SELECT
    recipe_id,
    COUNT(DISTINCT CASE WHEN event_type = 'save'
      THEN COALESCE(user_id::text, anon_id) END) AS save_count,
    COUNT(DISTINCT CASE WHEN event_type = 'view_long'
      THEN COALESCE(user_id::text, anon_id) END) AS engaged_view_count
  FROM public.recipe_interactions
  GROUP BY recipe_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rss_recipe_id ON public.recipe_social_scores (recipe_id);

-- ── Row-level security ────────────────────────────────────────────────────────
ALTER TABLE public.recipe_interactions ENABLE ROW LEVEL SECURITY;

-- Auth users insert their own rows
DROP POLICY IF EXISTS "ri_insert_auth" ON public.recipe_interactions;
CREATE POLICY "ri_insert_auth" ON public.recipe_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id AND anon_id IS NULL);

-- Anon inserts: no session, anon_id set, user_id null
DROP POLICY IF EXISTS "ri_insert_anon" ON public.recipe_interactions;
CREATE POLICY "ri_insert_anon" ON public.recipe_interactions
  FOR INSERT WITH CHECK (
    auth.uid() IS NULL AND user_id IS NULL AND anon_id IS NOT NULL
  );

-- Service role (used by API routes) bypasses RLS — no policy needed for that path.
