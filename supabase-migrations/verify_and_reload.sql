-- ═══════════════════════════════════════════════════════════════════════
-- STEP 1: Verify 'clearer_rewrite' column exists
-- ═══════════════════════════════════════════════════════════════════════

SELECT 
    table_schema, 
    table_name, 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mock_attempts'
  AND column_name = 'clearer_rewrite';

-- Expected: 1 row showing the column exists
-- If 0 rows: Column doesn't exist, re-run mock_optimization.sql

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 2: Verify ALL required columns exist
-- ═══════════════════════════════════════════════════════════════════════

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mock_attempts'
ORDER BY ordinal_position;

-- Expected columns:
-- id, session_id, question_id, question_text, answer_text, audio_url,
-- score, feedback, bullets, clearer_rewrite, vocabulary, what_worked,
-- improve_next, hiring_manager_heard, created_at

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 3: Reload PostgREST schema cache (CRITICAL!)
-- ═══════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';

-- This forces PostgREST to refresh its schema cache
-- Without this, it won't see the new columns even if they exist!

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 4: Verify RLS policies are permissive
-- ═══════════════════════════════════════════════════════════════════════

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('mock_sessions', 'mock_attempts')
ORDER BY tablename, policyname;

-- Expected policies:
-- mock_sessions: Allow select/insert/update for auth or guest
-- mock_attempts: Allow insert/select (permissive)
