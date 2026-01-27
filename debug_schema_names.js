import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function dumpSchema() {
    console.log("Dumping column names...");

    // 1. Referral Logs
    const { data: refCols, error: refError } = await supabase
        .rpc('get_columns', { table_name: 'referral_logs' }) // RPC might not exist, using raw restart if needed
        // Actually, let's just use select * limit 0 and look at returned object keys? No, Supabase returns empty array.
        // We can use RPC? Or just trust the previous failure message?
        // Let's try inserting a dummy row with a known bad column to trigger an error listing valid columns? No, that's messy.
        // We can query information_schema if we had direct access, but we don't (failed earlier).
        // Wait, apply_production_migration.js used direct connection. I added SSL bypass. Can I use that?
        // The user said "Migration ran successfully".
        // Let's try to select * limit 1 and see if we get keys?
        .from('referral_logs')
        .select('*')
        .limit(1);

    // Actually, `check_columns.js` worked by selecting specific columns.
    // Let's try inspecting the error message of a bad insert more closely.

    // Better: Try to insert valid data and log the FULL error object.
    console.log("\nTrying Insert into referral_logs...");
    const { error: insError } = await supabase.from('referral_logs').insert({
        referrer_id: '00000000-0000-0000-0000-000000000000', // Invalid UUIDs might fail FK, but we want to see column errors first
        referred_user_id: '00000000-0000-0000-0000-000000000000',
        status: 'pending'
    });

    if (insError) console.log("Referral Insert Error:", JSON.stringify(insError, null, 2));
    else console.log("Referral Insert: FK failure likely, but columns OK (or success)");

    console.log("\nTrying Insert into affiliate_applications...");
    const { error: affError } = await supabase.from('affiliate_applications').insert({
        name: 'Debug',
        email: 'debug@test.com',
        audience_size: '100', // Snake case
        channel_link: 'http',
        promo_plan: 'test'
    });

    if (affError) console.log("Affiliate Insert Error:", JSON.stringify(affError, null, 2));
    else console.log("Affiliate Insert: Success (Columns OK)");
}

dumpSchema();
