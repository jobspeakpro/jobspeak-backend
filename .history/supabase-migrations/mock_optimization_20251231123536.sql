-- Mock Interview Schema Fix
-- Ensures persistence of mock sessions and attempts with full analytical data

-- 1. Mock Sessions Table
CREATE TABLE IF NOT EXISTS public.mock_sessions (
    session_id text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id), -- Nullable for guest users
    guest_key text,                         -- For guest tracking
    interview_type text,                    -- 'short' or 'long'
    overall_score integer DEFAULT 0,
    summary jsonb DEFAULT '{}'::jsonb,      -- Stores aggregated feedback
    completed boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Mock Attempts Table (The core missing piece)
CREATE TABLE IF NOT EXISTS public.mock_attempts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id text REFERENCES public.mock_sessions(session_id),
    question_id text,
    question_text text,
    answer_text text,
    audio_url text,
    
    -- Scoring & Basic Feedback
    score integer,
    feedback jsonb,     -- Detailed breakdown {clarity, structure, ...}
    bullets text[],     -- Quick bullet points
    
    -- Rich AI Feedback (New Columns)
    clearer_rewrite text,
    vocabulary jsonb,       -- Array of vocab objects
    what_worked jsonb,      -- Array of strings (signals)
    improve_next jsonb,     -- Array of strings (actionable steps)
    hiring_manager_heard text,
    
    created_at timestamptz DEFAULT now()
);

-- 3. RLS Policies (Basic)
ALTER TABLE public.mock_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_attempts ENABLE ROW LEVEL SECURITY;

-- Allow insert/select for guests (based on guest_key matching? Or just public for MVP?)
-- For authenticated users:
CREATE POLICY "Users map view own sessions" ON public.mock_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users map insert own sessions" ON public.mock_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users map update own sessions" ON public.mock_sessions FOR UPDATE USING (auth.uid() = user_id);

-- For guest access (simplified, usually handled by API logic bypassing RLS with service role, 
-- or public access if guest_key)
-- NOTE: In this backend, we likely use service_role client for writes in API, or need open policies.
-- Assuming service_role usage in backend (common in this codebase context).

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mock_attempts_session_id ON public.mock_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_mock_sessions_user_key ON public.mock_sessions(user_id, guest_key);
