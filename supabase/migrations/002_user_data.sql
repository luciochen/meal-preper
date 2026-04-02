-- Safe migration — idempotent, safe to re-run on existing database

-- ── profiles ──────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles_read"   on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_read"   on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = user_id);

-- ── user_preferences ──────────────────────────────────────────────────────
create table if not exists public.user_preferences (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  diets      text[] not null default '{}',
  cuisines   text[] not null default '{}',
  allergies  text[] not null default '{}',
  onboarded  boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.user_preferences enable row level security;
drop policy if exists "prefs_own" on public.user_preferences;
create policy "prefs_own" on public.user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── meal_plan_items ───────────────────────────────────────────────────────
create table if not exists public.meal_plan_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  recipe_id       text not null,
  recipe_snapshot jsonb not null,
  servings        int  not null default 2,
  added_at        timestamptz not null default now(),
  unique (user_id, recipe_id)
);
alter table public.meal_plan_items enable row level security;
drop policy if exists "plan_own" on public.meal_plan_items;
create policy "plan_own" on public.meal_plan_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
