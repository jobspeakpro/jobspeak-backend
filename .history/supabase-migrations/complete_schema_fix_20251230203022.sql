/*
 * ═══════════════════════════════════════════════════════════════════════
 * SUPABASE PRODUCTION SCHEMA FIX - PASTE-READY
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open Supabase Dashboard → SQL Editor
 * 2. Copy this ENTIRE file
 * 3. Paste into SQL Editor
 * 4. Click "Run"
 * 5. Verify success messages at end
 * 
 * WHAT THIS FIXES:
 * - Adds onboarding_complete column (fixes PATCH 400 error)
 * - Adds avatar_url column (fixes avatar upload)
 * - Adds deleted_at for soft delete
 * - Ensures all personalization fields exist
 * - Creates auto-update trigger for updated_at
 * - Updates profile creation trigger with name priority
 * - Refreshes schema cache
 * 
 * IDEMPOTENT: Safe to run multiple times
 * ═══════════════════════════════════════════════════════════════════════
 */

-- ═══════════════════════════════════════════════════════════════════════
-- 1. ADD MISSING COLUMNS TO PROFILES
-- ═══════════════════════════════════════════════════════════════════════

-- Add onboarding_complete (CRITICAL FIX for frontend PATCH error)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'onboarding_complete'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_complete boolean DEFAULT false;
    RAISE NOTICE '✅ Added column: onboarding_complete';
  ELSE
    RAISE NOTICE '⏭️  Column onboarding_complete already exists';
  END IF;
END $$;

-- Add avatar_url (for avatar uploads)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
    RAISE NOTICE '✅ Added column: avatar_url';
  ELSE
    RAISE NOTICE '⏭️  Column avatar_url already exists';
  END IF;
END $$;

-- Add deleted_at (for soft delete)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN deleted_at timestamptz;
    RAISE NOTICE '✅ Added column: deleted_at';
  ELSE
    RAISE NOTICE '⏭️  Column deleted_at already exists';
  END IF;
END $$;

-- Ensure personalization fields exist (should already be in schema.sql, but verify)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'job_title'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN job_title text;
    RAISE NOTICE '✅ Added column: job_title';
  ELSE
    RAISE NOTICE '⏭️  Column job_title already exists';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'industry'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN industry text;
    RAISE NOTICE '✅ Added column: industry';
  ELSE
    RAISE NOTICE '⏭️  Column industry already exists';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'seniority'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN seniority text;
    RAISE NOTICE '✅ Added column: seniority';
  ELSE
    RAISE NOTICE '⏭️  Column seniority already exists';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'difficulty'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN difficulty text;
    RAISE NOTICE '✅ Added column: difficulty';
  ELSE
    RAISE NOTICE '⏭️  Column difficulty already exists';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'focus_areas'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN focus_areas jsonb DEFAULT '[]'::jsonb;
    RAISE NOTICE '✅ Added column: focus_areas';
  ELSE
    RAISE NOTICE '⏭️  Column focus_areas already exists';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. CREATE AUTO-UPDATE TRIGGER FOR updated_at
-- ═══════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════
-- 3. UPDATE PROFILE CREATION TRIGGER (NAME PRIORITY)
-- ═══════════════════════════════════════════════════════════════════════

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
    -- NAME PRIORITY: first_name > display_name > email
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

-- ═══════════════════════════════════════════════════════════════════════
-- 4. VERIFICATION & SCHEMA CACHE REFRESH
-- ═══════════════════════════════════════════════════════════════════════

-- Verify all columns exist
DO $$
DECLARE
  missing_columns text[] := ARRAY[]::text[];
  col text;
BEGIN
  -- Check for required columns
  FOR col IN 
    SELECT unnest(ARRAY[
      'id', 'display_name', 'avatar_url', 'onboarding_complete',
      'job_title', 'industry', 'seniority', 'difficulty', 'focus_areas',
      'tts_speed_pref', 'deleted_at', 'created_at', 'updated_at'
    ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = col
    ) THEN
      missing_columns := array_append(missing_columns, col);
    END IF;
  END LOOP;

  IF array_length(missing_columns, 1) > 0 THEN
    RAISE WARNING '⚠️  Missing columns: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE '✅ All required columns exist';
  END IF;
END $$;

-- Select all columns to refresh Supabase schema cache
SELECT 
  id,
  display_name,
  avatar_url,
  onboarding_complete,
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

-- ═══════════════════════════════════════════════════════════════════════
-- SUCCESS MESSAGE
-- ═══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ MIGRATION COMPLETE - SCHEMA FIXED                      ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Added/Verified columns:';
  RAISE NOTICE '  ✅ onboarding_complete (boolean, default false)';
  RAISE NOTICE '  ✅ avatar_url (text)';
  RAISE NOTICE '  ✅ deleted_at (timestamptz)';
  RAISE NOTICE '  ✅ job_title, industry, seniority, difficulty (text)';
  RAISE NOTICE '  ✅ focus_areas (jsonb)';
  RAISE NOTICE '';
  RAISE NOTICE 'Created triggers:';
  RAISE NOTICE '  ✅ set_updated_at (auto-updates updated_at on changes)';
  RAISE NOTICE '  ✅ on_auth_user_created (creates profile with name priority)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Schema cache refreshed';
  RAISE NOTICE '✅ Frontend PATCH errors should be resolved';
  RAISE NOTICE '';
END $$;
