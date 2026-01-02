-- ============================================================================
-- DEFINITIVE MOCK_ATTEMPTS UPSERT FIX
-- Safe, idempotent migration for UPSERT functionality
-- ============================================================================
-- This migration:
-- 1. Cleans NULL values in session_id/question_id
-- 2. Removes duplicate (session_id, question_id) pairs (keeps newest)
-- 3. Adds NOT NULL constraints
-- 4. Adds UNIQUE constraint for UPSERT
-- 5. Reloads PostgREST schema cache
-- ============================================================================

BEGIN;

-- Step 1: Delete rows with NULL session_id or question_id
-- These are invalid and cannot participate in UPSERT
DELETE FROM mock_attempts
WHERE session_id IS NULL OR question_id IS NULL;

-- Step 2: Remove duplicate (session_id, question_id) pairs
-- Keep only the most recent attempt (highest id = latest created_at)
DELETE FROM mock_attempts a
USING (
    SELECT session_id, question_id, MAX(id) as max_id
    FROM mock_attempts
    GROUP BY session_id, question_id
    HAVING COUNT(*) > 1
) b
WHERE a.session_id = b.session_id 
  AND a.question_id = b.question_id 
  AND a.id < b.max_id;

-- Step 3: Add NOT NULL constraints (if they don't exist)
-- This ensures future inserts cannot have NULL values
DO $$ 
BEGIN
    -- Add NOT NULL to session_id if not already set
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mock_attempts' 
          AND column_name = 'session_id' 
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE mock_attempts 
        ALTER COLUMN session_id SET NOT NULL;
    END IF;

    -- Add NOT NULL to question_id if not already set
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mock_attempts' 
          AND column_name = 'question_id' 
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE mock_attempts 
        ALTER COLUMN question_id SET NOT NULL;
    END IF;
END $$;

-- Step 4: Drop existing constraint if it exists (to ensure clean state)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'mock_attempts_session_question_unique'
          AND conrelid = 'mock_attempts'::regclass
    ) THEN
        ALTER TABLE mock_attempts 
        DROP CONSTRAINT mock_attempts_session_question_unique;
    END IF;
END $$;

-- Step 5: Add the UNIQUE constraint
-- This is what enables UPSERT with onConflict
ALTER TABLE mock_attempts 
ADD CONSTRAINT mock_attempts_session_question_unique 
UNIQUE (session_id, question_id);

-- Step 6: Reload PostgREST schema cache
-- This ensures the API layer recognizes the new constraint
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- VERIFICATION: Run this after the migration to confirm success
-- ============================================================================
-- Should return 1 row showing the unique constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'mock_attempts'::regclass
  AND conname = 'mock_attempts_session_question_unique';

-- Should return 0 duplicates
SELECT 
    session_id, 
    question_id, 
    COUNT(*) as count
FROM mock_attempts
GROUP BY session_id, question_id
HAVING COUNT(*) > 1;
