
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_URL = 'http://localhost:3000/api';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function run() {
    const ts = Date.now();
    const referrerEmail = `referrer_${ts}@test.com`;
    const referredEmail = `referred_${ts}@test.com`;
    const password = 'password123';

    console.log('--- CREATING USERS ---');

    // 1. Create Referrer
    const { data: userA, error: errA } = await supabase.auth.admin.createUser({
        email: referrerEmail,
        password: password,
        email_confirm: true,
        user_metadata: { name: 'Referrer User' }
    });
    if (errA) throw new Error(`Referrer Create Failed: ${errA.message}`);
    console.log(`Created Referrer: ${referrerEmail}`);

    // 2. Create Referred
    const { data: userB, error: errB } = await supabase.auth.admin.createUser({
        email: referredEmail,
        password: password,
        email_confirm: true,
        user_metadata: { name: 'Referred User' }
    });
    if (errB) throw new Error(`Referred Create Failed: ${errB.message}`);
    console.log(`Created Referred: ${referredEmail}`);

    // 3. Login Referrer
    const { data: sessionA, error: loginErrA } = await supabase.auth.signInWithPassword({
        email: referrerEmail,
        password: password
    });
    if (loginErrA) throw new Error(`Referrer Login Failed: ${loginErrA.message}`);
    const tokenA = sessionA.session.access_token;
    console.log('Referrer Logged In');

    // 4. Get Referral Code
    const codeRes = await fetch(`${API_URL}/referrals/code`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const codeData = await codeRes.json();
    if (!codeRes.ok) throw new Error(`Get Code Failed: ${JSON.stringify(codeData)}`);
    const referralCode = codeData.referralCode;
    console.log(`Referral Code Retrieved: ${referralCode}`);

    // 5. Login Referred
    const { data: sessionB, error: loginErrB } = await supabase.auth.signInWithPassword({
        email: referredEmail,
        password: password
    });
    if (loginErrB) throw new Error(`Referred Login Failed: ${loginErrB.message}`);
    const tokenB = sessionB.session.access_token;
    console.log('Referred Logged In');

    // 6. Track Referral
    const trackRes = await fetch(`${API_URL}/referrals/track`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${tokenB}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ referralCode })
    });
    const trackData = await trackRes.json();
    if (!trackRes.ok) throw new Error(`Track Failed: ${JSON.stringify(trackData)}`);
    console.log('Referral Tracked:', trackData);

    // 7. Verify History
    const historyRes = await fetch(`${API_URL}/referrals/history`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const historyData = await historyRes.json();
    if (!historyRes.ok) throw new Error(`History Failed: ${JSON.stringify(historyData)}`);

    console.log('--- VERIFICATION SUCCESS ---');
    console.log('Referrer History:', JSON.stringify(historyData, null, 2));

    // Write credentials to a file for the browser test to 'read' or just to have record
    console.log('\n--- CREDENTIALS ---');
    console.log(`Referrer: ${referrerEmail} / ${password} (Code: ${referralCode})`);
    console.log(`Referred: ${referredEmail} / ${password}`);
}

run().catch(err => {
    console.error('FATAL ERROR:', err);
    process.exit(1);
});
