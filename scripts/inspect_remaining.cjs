
const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    console.log("--- INSPECTING REMAINING DATA ---");

    // Affiliates
    const { data: apps, error: appError } = await supabase.from('affiliate_applications').select('*');
    if (appError) console.error(appError);
    else {
        console.log(`Remaining Affiliate Apps: ${apps.length}`);
        apps.forEach(a => console.log(` - App ID: ${a.id}, User ID: ${a.user_id}, Email: ${a.email}`));
    }

    // Referrals
    const { data: refs, error: refError } = await supabase.from('referral_logs').select('*');
    if (refError) console.error(refError);
    else {
        console.log(`Remaining Referral Logs: ${refs.length}`);
        refs.forEach(r => console.log(` - Log ID: ${r.id}, Referrer: ${r.referrer_id}, Referred: ${r.referred_user_id}`));
    }
}

inspect();
