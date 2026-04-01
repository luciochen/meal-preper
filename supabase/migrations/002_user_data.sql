-- Profiles — created only after username is set (signals completed sign-up)
create table public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_read"   on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = user_id);

-- User preferences
create table public.user_preferences (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  diets      text[] not null default '{}',
  cuisines   text[] not null default '{}',
  allergies  text[] not null default '{}',
  onboarded  boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.user_preferences enable row level security;
create policy "prefs_own" on public.user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Meal plan items
create table public.meal_plan_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  recipe_id       text not null,
  recipe_snapshot jsonb not null,
  servings        int not null default 2,
  added_at        timestamptz not null default now(),
  unique (user_id, recipe_id)
);
alter table public.meal_plan_items enable row level security;
create policy "plan_own" on public.meal_plan_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
