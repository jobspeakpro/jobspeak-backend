// jobspeak-backend/migrations/runMigrations.js
import pg from 'pg';
const { Client } = pg;

/**
 * Check if entitlements columns exist on profile table
 */
async function checkEntitlementsColumns() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
    });

    try {
        await client.connect();

        // Check if columns exist by querying information_schema
        const result = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'profile' 
            AND column_name IN ('plan_status', 'trial_ends_at', 'free_mock_used_at', 'referral_mock_credits')
        `);

        await client.end();

        // If we found all 4 columns, they exist
        return result.rows.length === 4;
    } catch (error) {
        console.error('[MIGRATION] Error checking columns:', error.message);
        try {
            await client.end();
        } catch (e) {
            // Ignore cleanup errors
        }
        return false;
    }
}

/**
 * Apply entitlements migration using direct SQL
 */
async function applyEntitlementsMigration() {
    console.log('[MIGRATION] 🚀 Starting entitlements migration...');

    const migrationSQL = `
        ALTER TABLE public.profile
          ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'free',
          ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NULL,
          ADD COLUMN IF NOT EXISTS free_mock_used_at timestamptz NULL,
          ADD COLUMN IF NOT EXISTS referral_mock_credits integer NOT NULL DEFAULT 0;

        CREATE INDEX IF NOT EXISTS idx_profile_plan_status ON profile(plan_status);
        CREATE INDEX IF NOT EXISTS idx_profile_trial_ends_at ON profile(trial_ends_at) WHERE trial_ends_at IS NOT NULL;
    `;

    const client = new Client({
        connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
    });

    try {
        await client.connect();
        await client.query(migrationSQL);
        await client.end();

        console.log('[MIGRATION] ✅ Successfully applied entitlements migration');
        console.log('[MIGRATION] Added columns: plan_status, trial_ends_at, free_mock_used_at, referral_mock_credits');
        return true;

    } catch (error) {
        console.error('[MIGRATION] ❌ Migration error:', error.message);
        console.error('[MIGRATION] Please run this SQL manually in Supabase SQL Editor:');
        console.error(migrationSQL);

        try {
            await client.end();
        } catch (e) {
            // Ignore cleanup errors
        }

        return false;
    }
}

/**
 * Run migrations on startup if enabled
 * CRITICAL: This is NON-BLOCKING and will NEVER prevent server boot
 */
/**
 * Apply Support Messages Table
 */
async function applySupportMessagesMigration() {
    console.log('[MIGRATION] 🚀 Starting support_messages creation...');

    const migrationSQL = `
        CREATE TABLE IF NOT EXISTS public.support_messages (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
          name text,
          email text,
          subject text,
          message text,
          status text DEFAULT 'new'
        );
        
        -- Enable RLS
        ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

        -- Policy for inserting (anyone)
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'Anyone can insert messages'
            ) THEN
                CREATE POLICY "Anyone can insert messages" ON public.support_messages FOR INSERT WITH CHECK (true);
            END IF;
        END
        $$;

        -- Service role has full access by default.
    `;

    const client = new Client({
        connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
    });

    try {
        await client.connect();
        await client.query(migrationSQL);
        await client.end();
        console.log('[MIGRATION] ✅ Successfully created support_messages table');
        return true;
    } catch (error) {
        console.error('[MIGRATION] ❌ Support Messages migration error:', error.message);
        try { await client.end(); } catch (e) { }
        return false;
    }
}

export async function runStartupMigrations() {
    // 1. Run Entitlements Migration (existing logic)
    const shouldRunEntitlements = process.env.RUN_ENTITLEMENTS_MIGRATION === 'true';
    if (shouldRunEntitlements) {
        console.log('[MIGRATION] 🔍 Checking entitlements...');
        // ... (simplified call to existing logic or keep it as is? I'm replacing the function)
        // Since I am replacing the WHOLE function `runStartupMigrations`...

        const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });
        try {
            await client.connect();
            await client.query(`
                ALTER TABLE public.profile
                  ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'free',
                  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NULL,
                  ADD COLUMN IF NOT EXISTS free_mock_used_at timestamptz NULL,
                  ADD COLUMN IF NOT EXISTS referral_mock_credits integer NOT NULL DEFAULT 0;
             `);
            await client.end();
        } catch (e) { console.error("Entitlements Error", e); try { await client.end(); } catch { } }
    }

    // 2. ALWAYS run Support Messages Migration (idempotent IF NOT EXISTS)
    await applySupportMessagesMigration();
}

