-- Create practice_usage_daily table for persistent rate limiting
-- Run this SQL in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS practice_usage_daily (
  id BIGSERIAL PRIMARY KEY,
  identity_key TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'practice',
  used INTEGER NOT NULL DEFAULT 0,
  attempt_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(identity_key, date, type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_practice_usage_identity_date 
  ON practice_usage_daily(identity_key, date, type);

-- Enable Row Level Security (optional, for security)
ALTER TABLE practice_usage_daily ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role can manage all usage records"
  ON practice_usage_daily
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
