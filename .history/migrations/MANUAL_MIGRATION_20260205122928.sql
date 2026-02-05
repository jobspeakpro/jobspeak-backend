-- MANUAL MIGRATION SQL (if automatic migration fails)
-- Run this in Supabase SQL Editor if the automatic migration doesn't work

ALTER TABLE public.profile
  ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS free_mock_used_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS referral_mock_credits integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profile_plan_status ON profile(plan_status);
CREATE INDEX IF NOT EXISTS idx_profile_trial_ends_at ON profile(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- Verify columns were added
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profile' 
AND column_name IN ('plan_status', 'trial_ends_at', 'free_mock_used_at', 'referral_mock_credits')
ORDER BY column_name;
