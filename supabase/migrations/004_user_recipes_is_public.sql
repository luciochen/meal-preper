-- Add is_public flag to user_recipes.
-- Existing rows default to true (already publicly readable via RLS).
alter table public.user_recipes
  add column if not exists is_public boolean not null default true;
