-- Activity Tracking Migration
-- Purpose: Track when users start practice/mock interview activities
-- Date: 2026-01-22

-- Create activity_events table
CREATE TABLE IF NOT EXISTS activity_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NULL,
    identity_key TEXT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('practice', 'mock_interview')),
    context JSONB NOT NULL DEFAULT '{}'::JSONB,
    day DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Create dedupe index
-- Prevents duplicate activity events for the same day + activity type + identity + tabId
-- If tabId is not in context, unique on (day, activity_type, user_id, identity_key)
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_events_dedupe
ON activity_events (
    day,
    activity_type,
    COALESCE(user_id::text, ''),
    COALESCE(identity_key, ''),
    COALESCE((context->>'tabId'), '')
);

-- Create index for fast retrieval by user_id
CREATE INDEX IF NOT EXISTS idx_activity_events_user_id
ON activity_events (user_id, created_at DESC)
WHERE user_id IS NOT NULL;

-- Create index for fast retrieval by identity_key
CREATE INDEX IF NOT EXISTS idx_activity_events_identity_key
ON activity_events (identity_key, created_at DESC)
WHERE identity_key IS NOT NULL;

-- Create index for fast filtering by activity_type
CREATE INDEX IF NOT EXISTS idx_activity_events_activity_type
ON activity_events (activity_type, created_at DESC);

-- RLS Policies
-- Enable Row Level Security
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role can do everything (backend writes/reads)
CREATE POLICY "Service role full access"
ON activity_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Authenticated users can read their own events
CREATE POLICY "Users can read own events"
ON activity_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 3: Anonymous users cannot access (guests are handled via service role)
-- No policy needed - default deny for anon

-- Comments for documentation
COMMENT ON TABLE activity_events IS 'Tracks when users start practice or mock interview activities for progress tracking';
COMMENT ON COLUMN activity_events.user_id IS 'Supabase auth user ID (null for guests)';
COMMENT ON COLUMN activity_events.identity_key IS 'Guest key for unauthenticated users (null for authed users)';
COMMENT ON COLUMN activity_events.activity_type IS 'Type of activity: practice or mock_interview';
COMMENT ON COLUMN activity_events.context IS 'Additional context: tabId, sessionId, interviewType, etc.';
COMMENT ON COLUMN activity_events.day IS 'Date of activity (UTC) for deduplication';
