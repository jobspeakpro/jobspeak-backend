/*
 * SUPABASE MIGRATION: Auto-Create Profile on User Signup
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open Supabase Dashboard → SQL Editor
 * 2. Copy this ENTIRE file contents
 * 3. Paste into SQL Editor
 * 4. Click "Run" to execute
 * 5. Verify trigger creation by checking the output
 * 
 * WHAT THIS DOES:
 * - Automatically creates a profile row when a new user signs up
 * - Populates id from auth.users.id
 * - Populates display_name from user metadata or email
 * - Sets created_at and updated_at timestamps
 * 
 * CRITICAL: This ensures every user has a profile row immediately after signup.
 */

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing function if it exists (idempotent)
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create trigger function to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate inserts
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Profile auto-creation trigger installed successfully!';
  RAISE NOTICE 'New users will automatically get a profile row on signup.';
END $$;
