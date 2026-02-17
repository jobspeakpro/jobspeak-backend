
const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function audit() {
    console.log("--- FULL DATABASE AUDIT ---");
    console.log(`URL: ${process.env.SUPABASE_URL}`);

    // 1. Auth Users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (authError) console.error("Auth Error:", authError.message);
    else {
        console.log(`\n[auth.users] Count: ${users.length}`);
        users.forEach(u => console.log(` - ${u.email} (${u.id})`));
    }

    // 2. Public Tables (via information_schema is hard with JS client, so we manual list known tables + try to discover)
    // We will stick to the known tables key to the app.
    const tables = [
        'profiles',
        'affiliate_applications',
        'referral_logs',
        'activity_events',
        'practice_sessions',
        'practice_usage_daily',
        'questions', // Static data, should not delete?
        'mock_interviews' // Check this
    ];

    console.log("\n[public tables]");
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(` - ${table}: [Error] ${error.message}`);
        } else {
            console.log(` - ${table}: ${count}`);
        }
    }
}

audit();
