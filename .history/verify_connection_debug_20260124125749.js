import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing keys");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking connection to:", supabaseUrl);

    // 1. Check Profiles (Known good)
    const { data: profiles, error: pError } = await supabase.from('profiles').select('id').limit(1);
    if (pError) {
        console.error("❌ Profiles check failed:", pError.message);
    } else {
        console.log("✅ Profiles table accessible. Row count:", profiles.length);
    }

    // 2. Check Referral Logs
    const { data: logs, error: lError } = await supabase.from('referral_logs').select('id').limit(1);
    if (lError) {
        console.error("❌ Referral Logs check failed:", lError.message);
        if (lError.message.includes('schema cache')) {
            console.log("   -> This means the table does NOT exist in the public schema.");
        }
    } else {
        console.log("✅ Referral Logs table accessible.");
    }

    // 3. Check Affiliate Applications
    const { data: apps, error: aError } = await supabase.from('affiliate_applications').select('id').limit(1);
    if (aError) {
        console.error("❌ Affiliate Apps check failed:", aError.message);
    } else {
        console.log("✅ Affiliate Applications table accessible.");
    }
}

check();
