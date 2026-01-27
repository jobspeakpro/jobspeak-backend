import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking 'referral_code' column visibility...");
    const { data, error } = await supabase.from('profiles').select('referral_code').limit(1);

    if (error) {
        console.error("❌ Column check failed:", error.message);
        console.error("   Code:", error.code);
        if (error.code === 'PGRST204') {
            console.log("   -> CONFIRMED: API does not know about the new column yet.");
        }
    } else {
        console.log("✅ Column is visible!");
    }
}

check();
