-- Grant public read access to the recipes table so the anon key
-- (used by the search API route) can query it.
grant select on public.recipes to anon;
grant select on public.recipes to authenticated;
