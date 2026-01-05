-- ============================================================================
-- VERIFICATION SQL: Run this first to check current state
-- ============================================================================
-- Check if unique constraint exists
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'mock_attempts'::regclass
  AND contype = 'u'; -- 'u' = unique constraint

-- Check for NULL values in key columns
SELECT 
    COUNT(*) FILTER (WHERE session_id IS NULL) AS null_session_ids,
    COUNT(*) FILTER (WHERE question_id IS NULL) AS null_question_ids,
    COUNT(*) AS total_rows
FROM mock_attempts;

-- Check for duplicate (session_id, question_id) pairs
SELECT 
    session_id, 
    question_id, 
    COUNT(*) as duplicate_count
FROM mock_attempts
WHERE session_id IS NOT NULL 
  AND question_id IS NOT NULL
GROUP BY session_id, question_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;
