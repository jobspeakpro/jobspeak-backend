# URGENT: Fix Practice Answer 500 Error

## Problem
`/api/practice/answer` returns 500 error:
```
PGRST204: Could not find the 'bullets' column of 'practice_attempts' in the schema cache
```

## Solution
Run the SQL migration in Supabase to add the missing `bullets` column.

## Steps

### 1. Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your JobSpeak Pro project
3. Click "SQL Editor" in the left sidebar

### 2. Run Migration
Copy and paste this SQL:

```sql
-- Add bullets column to practice_attempts and mock_attempts tables
ALTER TABLE practice_attempts
ADD COLUMN IF NOT EXISTS bullets jsonb DEFAULT '[]'::jsonb;

ALTER TABLE mock_attempts
ADD COLUMN IF NOT EXISTS bullets jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN practice_attempts.bullets IS 'Array of feedback bullet points from answer evaluation';
COMMENT ON COLUMN mock_attempts.bullets IS 'Array of feedback bullet points from answer evaluation';
```

Click **RUN** (or press Ctrl+Enter)

### 3. Verify Success
You should see:
```
Success. No rows returned
```

### 4. Restart Backend
```bash
# Stop the backend (Ctrl+C if running)
# Then restart:
npm run dev
```

### 5. Test
Try submitting a practice answer again. Should return 200 with full feedback.

## Migration File
The SQL is also saved at:
`supabase-migrations/add_bullets_column.sql`

## Why This Happened
Batch #3 fix added `bullets: evaluation.bullets` to the insert statements, but the database column didn't exist yet. This migration creates it.
