import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking columns...");

    // Referrals
    const { error: r1 } = await supabase.from('referral_logs').select('referrer_id').limit(1);
    console.log(`referrer_id: ${r1 ? 'MISSING (' + r1.message + ')' : 'EXISTS'}`);

    const { error: r2 } = await supabase.from('referral_logs').select('referrer_user_id').limit(1);
    console.log(`referrer_user_id: ${r2 ? 'MISSING (' + r2.message + ')' : 'EXISTS'}`);

    // Affiliates
    const { error: a1 } = await supabase.from('affiliate_applications').select('audience_size').limit(1);
    console.log(`audience_size: ${a1 ? 'MISSING (' + a1.message + ')' : 'EXISTS'}`);

    const { error: a2 } = await supabase.from('affiliate_applications').select('audienceSize').limit(1);
    console.log(`audienceSize: ${a2 ? 'MISSING (' + a2.message + ')' : 'EXISTS'}`);
}

check();
