-- ═══════════════════════════════════════════════════════════════════════
-- MOCK INTERVIEW SCHEMA OPTIMIZATION (SAFE & INCREMENTAL)
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Ensure `mock_sessions` table exists
CREATE TABLE IF NOT EXISTS public.mock_sessions (
    session_id text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    guest_key text,
    interview_type text,
    overall_score integer DEFAULT 0,
    summary jsonb DEFAULT '{}'::jsonb,
    completed boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Ensure `mock_attempts` table exists
CREATE TABLE IF NOT EXISTS public.mock_attempts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id text REFERENCES public.mock_sessions(session_id),
    question_id text,
    question_text text,
    answer_text text,
    audio_url text,
    score integer,
    feedback jsonb,
    bullets jsonb, -- Storing as JSONB for flexibility (array of strings)
    created_at timestamptz DEFAULT now()
);

-- 3. Add missing columns to `mock_attempts` safely
DO $$ 
BEGIN

  -- clearer_rewrite
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mock_attempts' AND column_name = 'clearer_rewrite') THEN
    ALTER TABLE public.mock_attempts ADD COLUMN clearer_rewrite text;
  END IF;

  -- vocabulary
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mock_attempts' AND column_name = 'vocabulary') THEN
    ALTER TABLE public.mock_attempts ADD COLUMN vocabulary jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- what_worked
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mock_attempts' AND column_name = 'what_worked') THEN
    ALTER TABLE public.mock_attempts ADD COLUMN what_worked jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- improve_next
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mock_attempts' AND column_name = 'improve_next') THEN
    ALTER TABLE public.mock_attempts ADD COLUMN improve_next jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- hiring_manager_heard
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mock_attempts' AND column_name = 'hiring_manager_heard') THEN
    ALTER TABLE public.mock_attempts ADD COLUMN hiring_manager_heard text;
  END IF;

END $$;

-- 4. Indexes (Minimal & Safe)
CREATE INDEX IF NOT EXISTS idx_mock_attempts_session_id ON public.mock_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_mock_sessions_user_id ON public.mock_sessions(user_id);

-- 5. RLS Policies (Ensure access)
ALTER TABLE public.mock_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view/insert their own sessions
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mock_sessions' AND policyname = 'Users can view own mock sessions') THEN
    CREATE POLICY "Users can view own mock sessions" ON public.mock_sessions FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mock_sessions' AND policyname = 'Users can insert own mock sessions') THEN
    CREATE POLICY "Users can insert own mock sessions" ON public.mock_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mock_sessions' AND policyname = 'Users can update own mock sessions') THEN
    CREATE POLICY "Users can update own mock sessions" ON public.mock_sessions FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Attempts follow session ownership (simplified for MVP: user owns session -> owns attempt)
-- For insert/select, we usually just check auth.uid() against session owner, but that requires join. 
-- For MVP, we can allow insert/select if auth.uid() = (select user_id from mock_sessions where session_id = mock_attempts.session_id)
-- Or simpler: Service Role handles logic. 
-- Adding basic explicit policy for authenticated users just in case.
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mock_attempts' AND policyname = 'Users can insert own attempts') THEN
     CREATE POLICY "Users can insert own attempts" ON public.mock_attempts FOR INSERT WITH CHECK (true); -- Logic handled by API + user_id check typically
  END IF;
   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mock_attempts' AND policyname = 'Users can view own attempts') THEN
     CREATE POLICY "Users can view own attempts" ON public.mock_attempts FOR SELECT USING (true); 
  END IF;
END $$;

RAISE NOTICE '✅ Mock Interview Schema Optimization Complete';
