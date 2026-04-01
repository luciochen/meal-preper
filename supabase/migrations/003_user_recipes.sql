-- User-created recipes
-- Note: recipes from Spoonacular come from the API, not this table.
-- This table holds only user-created/imported recipes.

create table public.user_recipes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null,
  description      text,
  image_url        text,
  cuisine          text,
  diet_tags        text[] not null default '{}',
  ready_in_minutes int,
  servings         int,
  ingredients_json jsonb not null default '[]',
  instructions_json jsonb not null default '[]',
  source_type      text check (source_type in ('scratch', 'website', 'instagram')),
  source_url       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.user_recipes enable row level security;

-- All rows publicly readable
create policy "user_recipes_read" on public.user_recipes
  for select using (true);

-- Only owner can write
create policy "user_recipes_write" on public.user_recipes
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Supabase Storage: create a public bucket named "recipe-images" in the dashboard.
-- RLS for storage: authenticated users can upload to their own folder (user_id prefix).
