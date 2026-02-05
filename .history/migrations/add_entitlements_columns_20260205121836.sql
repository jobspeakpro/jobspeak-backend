-- Migration: Add entitlements columns to profile table
-- Date: 2026-02-05
-- Description: Adds columns for plan status, trial tracking, free usage, and referral credits

-- Add plan_status column (free, trial, paid)
ALTER TABLE profile 
ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'free';

-- Add trial_ends_at column (nullable timestamp)
ALTER TABLE profile 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Add free_mock_used_at column (nullable timestamp)
ALTER TABLE profile 
ADD COLUMN IF NOT EXISTS free_mock_used_at TIMESTAMPTZ;

-- Add referral_mock_credits column (integer, default 0)
ALTER TABLE profile 
ADD COLUMN IF NOT EXISTS referral_mock_credits INTEGER DEFAULT 0;

-- Create index on plan_status for faster queries
CREATE INDEX IF NOT EXISTS idx_profile_plan_status ON profile(plan_status);

-- Create index on trial_ends_at for trial expiration queries
CREATE INDEX IF NOT EXISTS idx_profile_trial_ends_at ON profile(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- Verify migration
SELECT 
    column_name, 
    data_type, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'profile' 
AND column_name IN ('plan_status', 'trial_ends_at', 'free_mock_used_at', 'referral_mock_credits')
ORDER BY column_name;
