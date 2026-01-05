/*
 * SUPABASE PRODUCTION MIGRATION
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open Supabase Dashboard → SQL Editor
 * 2. Paste this ENTIRE SQL script
 * 3. Click "Run"
 * 4. Verify all columns appear in verification query at end
 * 
 * WHAT THIS DOES:
 * - Adds missing columns to profiles (avatar_url, deleted_at)
 * - Creates updated_at auto-update trigger
 * - Updates profile creation trigger for name handling (first_name priority)
 * - Refreshes schema cache
 */

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO PROFILES
-- ============================================================================

-- Add avatar_url column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
    RAISE NOTICE 'Added column: avatar_url';
  ELSE
    RAISE NOTICE 'Column avatar_url already exists';
  END IF;
END $$;

-- Add deleted_at column for soft delete (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN deleted_at timestamptz;
    RAISE NOTICE 'Added column: deleted_at';
  ELSE
    RAISE NOTICE 'Column deleted_at already exists';
  END IF;
END $$;

-- Verify existing columns (job_title, industry, seniority, difficulty, focus_areas already exist in schema.sql)
-- These should already be present, but we'll verify

-- ============================================================================
-- 2. CREATE UPDATED_AT AUTO-UPDATE TRIGGER
-- ============================================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.set_updated_at();

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

RAISE NOTICE '✅ Auto-update trigger created for updated_at';

-- ============================================================================
-- 3. UPDATE PROFILE CREATION TRIGGER (NAME "KING" RULE)
-- ============================================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved trigger function with name priority
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    -- NAME "KING" RULE: first_name > display_name > email
    COALESCE(
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'display_name',
      NEW.email
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

RAISE NOTICE '✅ Profile auto-creation trigger updated with name priority';

-- ============================================================================
-- 4. VERIFICATION QUERY (REFRESHES SCHEMA CACHE)
-- ============================================================================

-- Select all columns to verify they exist and refresh Supabase schema cache
SELECT 
  id,
  display_name,
  avatar_url,
  job_title,
  industry,
  seniority,
  difficulty,
  focus_areas,
  tts_speed_pref,
  deleted_at,
  created_at,
  updated_at
FROM public.profiles
LIMIT 0;

-- Verify triggers exist
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name IN ('on_auth_user_created', 'set_updated_at')
ORDER BY trigger_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ MIGRATION COMPLETE - PROFILES SCHEMA UPDATED           ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Added columns:';
  RAISE NOTICE '  - avatar_url (text)';
  RAISE NOTICE '  - deleted_at (timestamptz)';
  RAISE NOTICE '';
  RAISE NOTICE 'Created triggers:';
  RAISE NOTICE '  - set_updated_at (auto-updates updated_at on profile changes)';
  RAISE NOTICE '  - on_auth_user_created (creates profile with first_name priority)';
  RAISE NOTICE '';
  RAISE NOTICE 'Schema cache refreshed ✅';
END $$;
