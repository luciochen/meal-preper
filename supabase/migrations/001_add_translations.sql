-- Add translations JSONB column to recipes table.
-- Schema: { "en": { title, ingredients: [{name, raw?}], steps: [{number, step}] }, "zh": { ... } }
-- Adding a new language = adding a new key. No further schema changes needed.

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT NULL;

-- Optional index for locale lookups
CREATE INDEX IF NOT EXISTS idx_recipes_translations ON recipes USING gin (translations);
