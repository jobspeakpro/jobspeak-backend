
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const SQL = `
-- Add payout and platform detail columns to affiliate_applications
ALTER TABLE affiliate_applications 
ADD COLUMN IF NOT EXISTS payout_preference text,
ADD COLUMN IF NOT EXISTS payout_details text,
ADD COLUMN IF NOT EXISTS primary_platform text,
ADD COLUMN IF NOT EXISTS other_platform_text text;

-- Ensure constraint on profiles.referral_code
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_referral_code_key;

ALTER TABLE profiles
ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
`;

async function runMigration() {
    console.log("[MIGRATION] Starting...");

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.log("[MIGRATION] SKIPPED: No DATABASE_URL found (local dev without complete env?).");
        return;
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase/Railway
    });

    try {
        await client.connect();
        console.log("[MIGRATION] Connected to DB.");

        await client.query(SQL);
        console.log("[MIGRATION] SUCCESS: Migration applied.");

    } catch (err) {
        console.error("[MIGRATION] FAILED:", err.message);
        // We log but don't exit(1) so the app can still try to start? 
        // Actually, if migration fails, app might crash on new columns. 
        // But better to let it try.
    } finally {
        await client.end();
    }
}

runMigration();
