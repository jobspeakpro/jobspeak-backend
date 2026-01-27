import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './services/supabase.js';
import { processReferralAction } from './routes/referrals.js';
import crypto from 'crypto';

// Minimal mock for Express request/response
const mockReq = (body = {}, query = {}, user = null) => ({
    body,
    query,
    headers: {},
    user // Mock user attached by middleware
});

const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.body = data; return res; };
    return res;
};

async function runVerification() {
    console.log("Starting Verification for Referral, Affiliate, and Support...");

    // 1. Setup Test Users
    const referrerEmail = `test_referrer_${Date.now()}@example.com`;
    const referredEmail = `test_referred_${Date.now()}@example.com`;
    const password = 'password123';

    console.log("Creating test users...");
    // Note: This relies on Supabase Auth which we might not have admin rights to script easily without service role key?
    // We'll trust the service role key is in .env or services/supabase.js uses it.

    // Create Referrer
    const { data: userA, error: errA } = await supabase.auth.signUp({ email: referrerEmail, password });
    if (errA) { console.error("Error creating referrer:", errA.message); return; }
    const referrerId = userA.user.id;
    console.log(`Referrer Created: ${referrerId}`);

    // Create Referred User
    const { data: userB, error: errB } = await supabase.auth.signUp({ email: referredEmail, password });
    if (errB) { console.error("Error creating referred:", errB.message); return; }
    const referredId = userB.user.id;
    console.log(`Referred User Created: ${referredId}`);

    // Wait for triggers to create profiles (async)
    await new Promise(r => setTimeout(r, 2000));

    // 2. Test Referral Code Generation (Direct DB check or manually calling route logic)
    // We'll mimic the route logic for generating code
    const referralCode = 'REF-TEST-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    console.log(`Generated Code: ${referralCode}`);

    // Set code for referrer
    await supabase.from('profiles').update({ referral_code: referralCode }).eq('id', referrerId);

    // 3. Test Attribution (POST /track logic)
    console.log("Testing Attribution...");
    // Manually insert into referral_logs as if /track was called
    const { error: trackError } = await supabase.from('referral_logs').insert({
        referrer_id: referrerId,
        referred_user_id: referredId,
        status: 'pending'
    });
    if (trackError) console.error("Track Error:", trackError);
    else console.log("Attribution tracked (pending).");

    // 4. Verify Pending State
    const { data: logBefore } = await supabase.from('referral_logs').select('*').eq('referred_user_id', referredId).single();
    if (logBefore.status !== 'pending') console.error("FAIL: Status should be pending");
    else console.log("PASS: Status is pending");

    // 5. Simulate Qualifying Action (Call processReferralAction)
    console.log("Simulating Qualifying Action...");
    await processReferralAction(referredId);

    // 6. Verify Credit Grant
    const { data: logAfter } = await supabase.from('referral_logs').select('*').eq('referred_user_id', referredId).single();
    if (logAfter.status !== 'converted') console.error(`FAIL: Status should be converted (got ${logAfter.status})`);
    else console.log("PASS: Status is converted");

    const { data: profileA } = await supabase.from('profiles').select('credits').eq('id', referrerId).single();
    if (profileA.credits !== 1) console.error(`FAIL: Credits should be 1 (got ${profileA.credits})`);
    else console.log("PASS: Referral credit granted (1)");

    // 7. Test Affiliate Application
    console.log("Testing Affiliate Application Submission...");
    const { error: affError } = await supabase.from('affiliate_applications').insert({
        name: 'Test Affiliate',
        email: 'affiliate@test.com',
        platform: 'YouTube',
        status: 'pending'
    });
    if (affError) console.error("Affiliate Insert Error:", affError);
    else console.log("PASS: Affiliate application stored.");

    console.log("Verification Complete.");

    // Cleanup? (Optional, maybe leave for debug)
}

runVerification().catch(console.error);
