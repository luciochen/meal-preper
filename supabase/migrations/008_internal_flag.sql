-- Add internal flag to profiles for excluding test/admin traffic from interaction tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;

-- Mark internal accounts
UPDATE public.profiles SET is_internal = true WHERE user_id IN (
  'ebf3bae7-8c58-4cf4-8045-ba792e9a7468',
  '59af7e3b-491c-4f7b-8db9-fde6cbe316bf'
);
