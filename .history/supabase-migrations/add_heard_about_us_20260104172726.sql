-- Add heard_about_us column to profiles table
-- This field stores how users heard about JobSpeakPro
-- Write-once semantics enforced at application level

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS heard_about_us TEXT;

-- Verify column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'heard_about_us';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ heard_about_us column added to profiles table';
  RAISE NOTICE 'Field is nullable TEXT, write-once semantics enforced in application layer';
END $$;
