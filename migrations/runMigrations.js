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
export async function runStartupMigrations() {
    const shouldRunMigration = process.env.RUN_ENTITLEMENTS_MIGRATION === 'true';

    if (!shouldRunMigration) {
        // Silent skip - no log spam
        return;
    }

    console.log('[MIGRATION] 🔍 Checking if entitlements migration is needed...');

    try {
        // Add timeout to prevent hanging (10s max)
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Migration timeout after 10s')), 10000)
        );

        // Check if columns already exist
        const columnsExist = await Promise.race([
            checkEntitlementsColumns(),
            timeoutPromise
        ]);

        if (columnsExist) {
            console.log('[MIGRATION] ✅ Entitlements columns already exist, skipping migration');
            console.log('[MIGRATION] ⚠️  You can now remove RUN_ENTITLEMENTS_MIGRATION env var');
            return;
        }

        console.log('[MIGRATION] 📝 Entitlements columns missing, applying migration...');

        // Apply migration with timeout
        const success = await Promise.race([
            applyEntitlementsMigration(),
            timeoutPromise
        ]);

        if (success) {
            console.log('[MIGRATION] ✅ Migration complete!');
            console.log('[MIGRATION] ⚠️  IMPORTANT: Remove RUN_ENTITLEMENTS_MIGRATION env var from Railway');
        } else {
            console.log('[MIGRATION] ❌ Migration failed - manual intervention required');
        }

    } catch (error) {
        console.error('[MIGRATION] ❌ Migration error:', error.message);
        console.error('[MIGRATION] ⚠️  Server will continue startup without migration');
        // CRITICAL: DO NOT throw - let server boot
    }
}
