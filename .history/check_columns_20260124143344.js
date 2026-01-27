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
        console.log("✅ Column 'referral_code' is visible!");
    }

    console.log("Checking 'audience_size' column visibility...");
    const { error: affError } = await supabase.from('affiliate_applications').select('audience_size').limit(1);

    if (affError) {
        console.error("❌ Affiliate column check failed:", affError.message);
        if (affError.code === 'PGRST204') {
            console.log("   -> CONFIRMED: API does not know about 'audience_size' yet.");
        }
    } else {
        console.log("✅ Column 'audience_size' is visible!");
    }
}

check();
