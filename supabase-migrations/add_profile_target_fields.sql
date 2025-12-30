-- Supabase Migration: Add Target Role Memory Fields to Profiles
-- Run this in Supabase SQL Editor

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS target_role text,
ADD COLUMN IF NOT EXISTS target_level text,
ADD COLUMN IF NOT EXISTS target_interview_type text,
ADD COLUMN IF NOT EXISTS target_struggle text,
ADD COLUMN IF NOT EXISTS target_timeline text;

-- Verify columns were added
COMMENT ON COLUMN profiles.target_role IS 'User target job role (e.g., "Software Engineer", "Product Manager")';
COMMENT ON COLUMN profiles.target_level IS 'User target level (e.g., "Entry", "Mid", "Senior")';
COMMENT ON COLUMN profiles.target_interview_type IS 'Interview type focus (e.g., "Behavioral", "Technical")';
COMMENT ON COLUMN profiles.target_struggle IS 'User main struggle area';
COMMENT ON COLUMN profiles.target_timeline IS 'User interview timeline';
