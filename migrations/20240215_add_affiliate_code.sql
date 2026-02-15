-- Run this in your Supabase SQL Editor to enable the Affiliate Code feature

ALTER TABLE public.affiliate_applications
ADD COLUMN IF NOT EXISTS affiliate_code text;

-- Optional: Add unique constraint
-- ALTER TABLE public.affiliate_applications ADD CONSTRAINT affiliate_code_unique UNIQUE (affiliate_code);
