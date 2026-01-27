-- 1. Modify Profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits INT DEFAULT 0;

-- 2. Affiliate Applications
CREATE TABLE IF NOT EXISTS public.affiliate_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    country TEXT,
    platform TEXT,
    audience_size TEXT,
    channel_link TEXT,
    promo_plan TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Referral Logs
CREATE TABLE IF NOT EXISTS public.referral_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES auth.users(id) NOT NULL,
    referred_user_id UUID REFERENCES auth.users(id) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'converted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(referrer_id, referred_user_id)
);

-- RLS
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access affiliates" ON public.affiliate_applications FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access logs" ON public.referral_logs FOR ALL TO service_role USING (true);

-- Allow users to read their own referral logs
CREATE POLICY "Users can read own referral logs" ON public.referral_logs FOR SELECT TO authenticated USING (auth.uid() = referrer_id);
-- Allow users to read their own affiliate application
CREATE POLICY "Users can read own affiliate application" ON public.affiliate_applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
