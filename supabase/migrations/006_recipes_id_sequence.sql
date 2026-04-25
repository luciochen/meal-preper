-- Add an auto-increment sequence to the recipes.id column so inserts
-- without an explicit id get one automatically.
create sequence if not exists public.recipes_id_seq;

alter table public.recipes
  alter column id set default nextval('public.recipes_id_seq');

-- Sync the sequence to the current max id so new values don't collide.
select setval('public.recipes_id_seq', coalesce((select max(id) from public.recipes), 0) + 1, false);
