
const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DRY_RUN = !process.argv.includes('--force');
const ADMIN_EMAIL = 'jobspeakpro@gmail.com';

async function cleanup() {
    console.log(`Starting User Cleanup... (Dry Run: ${DRY_RUN})`);

    // 1. List All Users
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
        console.error("Error listing users:", error);
        return;
    }

    // 2. Filter
    const usersToDelete = users.filter(u => u.email !== ADMIN_EMAIL);
    const adminUser = users.find(u => u.email === ADMIN_EMAIL);

    if (!adminUser) {
        console.error(`CRITICAL: Admin user ${ADMIN_EMAIL} NOT FOUND. Aborting to prevent total lockout.`);
        return;
    }

    console.log(`Found ${users.length} total users.`);
    console.log(`Admin User: ${adminUser.email} (${adminUser.id}) - WILL BE KEPT.`);
    console.log(`Targeting ${usersToDelete.length} users for DELETION.`);

    if (usersToDelete.length === 0) {
        console.log("No users to delete.");
        return;
    }

    if (DRY_RUN) {
        console.log("\n--- Users to Delete (Dry Run) ---");
        usersToDelete.forEach(u => console.log(` - ${u.email} (${u.id})`));
        console.log("\nRun with --force to execute deletion.");
        return;
    }

    // 3. Execution
    console.log("\n--- DELETING USERS ---");
    for (const user of usersToDelete) {
        console.log(`Deleting ${user.email} (${user.id})...`);
        try {
            // Delete dependencies (Using Promise.all for speed, or sequential for safety)
            // Note: If RLS or FKs are set up perfectly, some might cascade, but we do explicit delete to be sure.

            // 1. Referral Logs
            // Referrer
            await supabase.from('referral_logs').delete().eq('referrer_id', user.id);
            // Referred
            await supabase.from('referral_logs').delete().eq('referred_user_id', user.id);

            // 2. Affiliate Applications
            await supabase.from('affiliate_applications').delete().eq('user_id', user.id);

            // 3. Practice Sessions
            await supabase.from('practice_sessions').delete().eq('user_id', user.id);

            // 4. Activity Events
            await supabase.from('activity_events').delete().eq('user_id', user.id);

            // 5. Practice Usage Daily
            await supabase.from('practice_usage_daily').delete().eq('identity_key', user.id);

            // 6. Profiles
            await supabase.from('profiles').delete().eq('id', user.id);

            // 7. Auth User
            const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
            if (deleteError) {
                console.error(`  Failed to delete auth user ${user.email}:`, deleteError.message);
            } else {
                console.log(`  ✅ Deleted ${user.email}`);
            }

        } catch (err) {
            console.error(`  EXCEPTION deleting ${user.email}:`, err.message);
        }
    }

    console.log("\nCleanup Complete.");
}

cleanup();
