-- ═══════════════════════════════════════════════════════════════════════
-- MOCK INTERVIEW RLS FIX - ALLOW GUEST ACCESS
-- ═══════════════════════════════════════════════════════════════════════
-- This fixes the RLS policies to allow guest users (where auth.uid() is NULL)
-- to insert and read mock interview data.

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own mock sessions" ON public.mock_sessions;
DROP POLICY IF EXISTS "Users can insert own mock sessions" ON public.mock_sessions;
DROP POLICY IF EXISTS "Users can update own mock sessions" ON public.mock_sessions;
DROP POLICY IF EXISTS "Users can insert own attempts" ON public.mock_attempts;
DROP POLICY IF EXISTS "Users can view own attempts" ON public.mock_attempts;

-- 2. Create permissive policies for mock_sessions
-- Allow SELECT for authenticated users OR guest sessions (where user_id IS NULL)
CREATE POLICY "Allow select mock sessions for auth or guest"
ON public.mock_sessions FOR SELECT
USING (
    auth.uid() = user_id 
    OR user_id IS NULL
);

-- Allow INSERT for authenticated users OR guest sessions
CREATE POLICY "Allow insert mock sessions for auth or guest"
ON public.mock_sessions FOR INSERT
WITH CHECK (
    auth.uid() = user_id 
    OR user_id IS NULL
);

-- Allow UPDATE for authenticated users OR guest sessions
CREATE POLICY "Allow update mock sessions for auth or guest"
ON public.mock_sessions FOR UPDATE
USING (
    auth.uid() = user_id 
    OR user_id IS NULL
);

-- 3. Create permissive policies for mock_attempts
-- Allow INSERT for all (backend validates via session ownership)
CREATE POLICY "Allow insert mock attempts"
ON public.mock_attempts FOR INSERT
WITH CHECK (true);

-- Allow SELECT for all (backend validates via session ownership)
CREATE POLICY "Allow select mock attempts"
ON public.mock_attempts FOR SELECT
USING (true);

-- 4. Verification
DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies updated to allow guest access';
    RAISE NOTICE 'mock_sessions: Allows auth users + guests (user_id IS NULL)';
    RAISE NOTICE 'mock_attempts: Allows all inserts/selects (validated by backend)';
END $$;
