-- Add payout and platform detail columns to affiliate_applications
ALTER TABLE affiliate_applications 
ADD COLUMN IF NOT EXISTS payout_preference text,
ADD COLUMN IF NOT EXISTS payout_details text, -- or jsonb if you prefer structure
ADD COLUMN IF NOT EXISTS primary_platform text,
ADD COLUMN IF NOT EXISTS other_platform_text text;

-- Ensure constraint on profiles.referral_code
ALTER TABLE profiles
ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
