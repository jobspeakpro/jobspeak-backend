-- Migration: Answer Persistence for Practice and Mock Interviews
-- Creates tables to store user answers and generate real summaries

-- ============================================================================
-- PRACTICE ATTEMPTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.practice_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_key TEXT,
    session_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    answer_text TEXT,
    audio_url TEXT,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    feedback JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure either user_id or guest_key is set
    CONSTRAINT practice_attempts_user_check CHECK (
        (user_id IS NOT NULL AND guest_key IS NULL) OR
        (user_id IS NULL AND guest_key IS NOT NULL)
    )
);

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_practice_attempts_session 
    ON public.practice_attempts(session_id);

-- Index for user progress queries
CREATE INDEX IF NOT EXISTS idx_practice_attempts_user 
    ON public.practice_attempts(user_id) WHERE user_id IS NOT NULL;

-- Index for guest progress queries
CREATE INDEX IF NOT EXISTS idx_practice_attempts_guest 
    ON public.practice_attempts(guest_key) WHERE guest_key IS NOT NULL;

-- Enable RLS
ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own attempts
CREATE POLICY "Users can view own practice attempts"
    ON public.practice_attempts FOR SELECT
    USING (
        auth.uid() = user_id OR
        guest_key IS NOT NULL
    );

-- RLS Policy: Users can insert their own attempts
CREATE POLICY "Users can insert own practice attempts"
    ON public.practice_attempts FOR INSERT
    WITH CHECK (
        auth.uid() = user_id OR
        guest_key IS NOT NULL
    );

-- ============================================================================
-- MOCK SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mock_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_key TEXT,
    interview_type TEXT NOT NULL CHECK (interview_type IN ('short', 'long')),
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    summary JSONB,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure either user_id or guest_key is set
    CONSTRAINT mock_sessions_user_check CHECK (
        (user_id IS NOT NULL AND guest_key IS NULL) OR
        (user_id IS NULL AND guest_key IS NOT NULL)
    )
);

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_mock_sessions_session_id 
    ON public.mock_sessions(session_id);

-- Index for user progress queries
CREATE INDEX IF NOT EXISTS idx_mock_sessions_user 
    ON public.mock_sessions(user_id) WHERE user_id IS NOT NULL;

-- Index for guest progress queries
CREATE INDEX IF NOT EXISTS idx_mock_sessions_guest 
    ON public.mock_sessions(guest_key) WHERE guest_key IS NOT NULL;

-- Enable RLS
ALTER TABLE public.mock_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own sessions
CREATE POLICY "Users can view own mock sessions"
    ON public.mock_sessions FOR SELECT
    USING (
        auth.uid() = user_id OR
        guest_key IS NOT NULL
    );

-- RLS Policy: Users can insert their own sessions
CREATE POLICY "Users can insert own mock sessions"
    ON public.mock_sessions FOR INSERT
    WITH CHECK (
        auth.uid() = user_id OR
        guest_key IS NOT NULL
    );

-- RLS Policy: Users can update their own sessions
CREATE POLICY "Users can update own mock sessions"
    ON public.mock_sessions FOR UPDATE
    USING (
        auth.uid() = user_id OR
        guest_key IS NOT NULL
    );

-- ============================================================================
-- MOCK ATTEMPTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mock_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    answer_text TEXT,
    audio_url TEXT,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    feedback JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key to mock_sessions (using session_id as text)
    CONSTRAINT fk_mock_attempts_session
        FOREIGN KEY (session_id)
        REFERENCES public.mock_sessions(session_id)
        ON DELETE CASCADE
);

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_mock_attempts_session 
    ON public.mock_attempts(session_id);

-- Enable RLS
ALTER TABLE public.mock_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read attempts for their sessions
CREATE POLICY "Users can view attempts for own sessions"
    ON public.mock_attempts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.mock_sessions ms
            WHERE ms.session_id = mock_attempts.session_id
            AND (ms.user_id = auth.uid() OR ms.guest_key IS NOT NULL)
        )
    );

-- RLS Policy: Users can insert attempts for their sessions
CREATE POLICY "Users can insert attempts for own sessions"
    ON public.mock_attempts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.mock_sessions ms
            WHERE ms.session_id = mock_attempts.session_id
            AND (ms.user_id = auth.uid() OR ms.guest_key IS NOT NULL)
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update mock_sessions.updated_at on any change
CREATE OR REPLACE FUNCTION update_mock_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mock_sessions_updated_at
    BEFORE UPDATE ON public.mock_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_mock_sessions_updated_at();

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.practice_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.mock_sessions TO authenticated;
GRANT SELECT, INSERT ON public.mock_attempts TO authenticated;

-- Grant access to anon users (for guest functionality)
GRANT SELECT, INSERT ON public.practice_attempts TO anon;
GRANT SELECT, INSERT, UPDATE ON public.mock_sessions TO anon;
GRANT SELECT, INSERT ON public.mock_attempts TO anon;
