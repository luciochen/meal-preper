-- Add enabled column to recipes table.
-- Run this once in Supabase SQL Editor before running select-top-recipes.
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;
