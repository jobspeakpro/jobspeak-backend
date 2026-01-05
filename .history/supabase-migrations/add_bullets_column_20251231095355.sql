-- Add bullets column to practice_attempts and mock_attempts tables
-- This column stores the feedback bullets array from evaluateAnswer()
-- Required for Batch #3 fix (0 attempts bug)

-- Add bullets column to practice_attempts
ALTER TABLE practice_attempts
ADD COLUMN IF NOT EXISTS bullets jsonb DEFAULT '[]'::jsonb;

-- Add bullets column to mock_attempts
ALTER TABLE mock_attempts
ADD COLUMN IF NOT EXISTS bullets jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN practice_attempts.bullets IS 'Array of feedback bullet points from answer evaluation';
COMMENT ON COLUMN mock_attempts.bullets IS 'Array of feedback bullet points from answer evaluation';
