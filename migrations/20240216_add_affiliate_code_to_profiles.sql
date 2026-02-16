
-- Add affiliate_code to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS affiliate_code text;

-- Add index for performance (since we query by it in verifyInviteCode)
CREATE INDEX IF NOT EXISTS idx_profiles_affiliate_code ON public.profiles (affiliate_code);
