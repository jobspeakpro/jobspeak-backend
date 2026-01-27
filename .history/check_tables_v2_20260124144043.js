import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking 'referrer_user_id' column...");
    const { error } = await supabase.from('referral_logs').select('referrer_user_id').limit(1);

    if (error) {
        console.log("❌ 'referrer_user_id' check failed:", error.message);
    } else {
        console.log("✅ 'referrer_user_id' EXISTS!");
    }

    console.log("Checking 'referred_user_id' column...");
    const { error: err2 } = await supabase.from('referral_logs').select('referred_user_id').limit(1);
    if (err2) {
        console.log("❌ 'referred_user_id' check failed:", err2.message);
    } else {
        console.log("✅ 'referred_user_id' EXISTS!");
    }
}

check();
