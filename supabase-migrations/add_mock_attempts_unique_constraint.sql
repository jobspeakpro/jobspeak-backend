-- Add unique constraint to prevent duplicate attempts per (session_id, question_id)
-- This ensures UPSERT behavior works correctly

ALTER TABLE mock_attempts 
ADD CONSTRAINT mock_attempts_session_question_unique 
UNIQUE (session_id, question_id);

-- Note: If there are existing duplicates, you'll need to clean them first:
-- DELETE FROM mock_attempts a
-- USING mock_attempts b
-- WHERE a.id > b.id 
--   AND a.session_id = b.session_id 
--   AND a.question_id = b.question_id;
