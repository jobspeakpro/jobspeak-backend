// jobspeak-backend/migrations/runMigrations.js
import { supabase } from "../services/supabase.js";

/**
 * Check if entitlements columns exist on profile table
 */
async function checkEntitlementsColumns() {
    try {
        const { data, error } = await supabase.rpc('check_columns_exist', {
            table_name: 'profile',
            column_names: ['plan_status', 'trial_ends_at', 'free_mock_used_at', 'referral_mock_credits']
        });

        if (error) {
            // Fallback: Try to select from profile table with new columns
            const { error: selectError } = await supabase
                .from('profile')
                .select('plan_status, trial_ends_at, free_mock_used_at, referral_mock_credits')
                .limit(1);

            // If no error, columns exist
            return !selectError;
        }

        return data;
    } catch (error) {
        console.error('[MIGRATION] Error checking columns:', error);
        return false;
    }
}

/**
 * Apply entitlements migration
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

    try {
        // Execute migration using Supabase admin
        const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

        if (error) {
            console.error('[MIGRATION] ❌ Failed to apply migration:', error);
            console.error('[MIGRATION] Please run this SQL manually in Supabase SQL Editor:');
            console.error(migrationSQL);
            return false;
        }

        console.log('[MIGRATION] ✅ Successfully applied entitlements migration');
        console.log('[MIGRATION] Added columns: plan_status, trial_ends_at, free_mock_used_at, referral_mock_credits');
        return true;

    } catch (error) {
        console.error('[MIGRATION] ❌ Migration error:', error);
        console.error('[MIGRATION] Please run this SQL manually in Supabase SQL Editor:');
        console.error(migrationSQL);
        return false;
    }
}

/**
 * Run migrations on startup if enabled
 */
export async function runStartupMigrations() {
    const shouldRunMigration = process.env.RUN_ENTITLEMENTS_MIGRATION === 'true';

    if (!shouldRunMigration) {
        console.log('[MIGRATION] Skipping migrations (RUN_ENTITLEMENTS_MIGRATION not set)');
        return;
    }

    console.log('[MIGRATION] 🔍 Checking if entitlements migration is needed...');

    // Check if columns already exist
    const columnsExist = await checkEntitlementsColumns();

    if (columnsExist) {
        console.log('[MIGRATION] ✅ Entitlements columns already exist, skipping migration');
        console.log('[MIGRATION] ⚠️  You can now remove RUN_ENTITLEMENTS_MIGRATION env var');
        return;
    }

    console.log('[MIGRATION] 📝 Entitlements columns missing, applying migration...');

    // Apply migration
    const success = await applyEntitlementsMigration();

    if (success) {
        console.log('[MIGRATION] ✅ Migration complete!');
        console.log('[MIGRATION] ⚠️  IMPORTANT: Remove RUN_ENTITLEMENTS_MIGRATION env var from Railway');
    } else {
        console.log('[MIGRATION] ❌ Migration failed - manual intervention required');
    }
}
