
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BACKEND_URL = "https://jobspeak-backend-production.up.railway.app";

// We need a real user. We'll use a test user if credentials available, or sign up a temporary one.
// For this proof, we will try to sign up a fresh user to ensure clean state.
const TEST_EMAIL = `verification_${Date.now()}@example.com`;
const TEST_PASSWORD = "Password123!";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runE2E() {
    console.log("--- E2E Verification Start ---");
    console.log("Target:", BACKEND_URL);
    console.log("User:", TEST_EMAIL);

    // 1. Sign Up / Sign In
    console.log("\n1. Authenticating...");
    let { data: authData, error: authError } = await supabase.auth.signUp({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
    });

    if (authError) {
        console.error("Auth Failed:", authError.message);
        // Try sign in if exists
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });
        if (signInError) {
            console.error("Sign In Failed:", signInError.message);
            process.exit(1);
        }
        authData = signInData;
    }

    const token = authData.session.access_token;
    const userId = authData.user.id;
    console.log("Authenticated. User ID:", userId);

    // 2. Test GET /api/referrals/me
    console.log("\n2. Testing GET /api/referrals/me ...");
    const refRes = await fetch(`${BACKEND_URL}/api/referrals/me`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });
    console.log(`HTTP ${refRes.status} ${refRes.statusText}`);
    const refJson = await refRes.json();
    console.log("Response:", JSON.stringify(refJson, null, 2));

    if (!refJson.code || !refJson.inviteUrl) {
        console.error("FAILED: Referral code not returned.");
        process.exit(1);
    }

    // 3. Test POST /api/affiliate/apply
    console.log("\n3. Testing POST /api/affiliate/apply ...");
    const affiliatePayload = {
        name: "Verification User",
        email: TEST_EMAIL,
        country: "US",
        primaryPlatform: "YouTube",
        audienceSize: "10k-50k",
        payoutPreference: "paypal",
        payoutDetails: "pay@example.com"
    };

    const applyRes = await fetch(`${BACKEND_URL}/api/affiliate/apply`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(affiliatePayload)
    });
    console.log(`HTTP ${applyRes.status} ${applyRes.statusText}`);
    const applyJson = await applyRes.json();
    console.log("Response:", JSON.stringify(applyJson, null, 2));

    if (!applyJson.success) {
        console.error("FAILED: Affiliate application not successful.");
    }

    // 4. Verify DB Insert via Supabase (Bypass API to check truth)
    console.log("\n4. Verifying Database State...");

    // Check Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', userId)
        .single();

    console.log(`DB Profile [${userId}]: referral_code =`, profile?.referral_code);
    if (profile?.referral_code !== refJson.code) console.error("MISMATCH: DB code doesn't match API code");
    else console.log("MATCH: DB profile code matches API.");

    // Check Application
    const { data: application } = await supabase
        .from('affiliate_applications')
        .select('*')
        .eq('email', TEST_EMAIL)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    console.log(`DB Affiliate Application [${TEST_EMAIL}]:`);
    console.log(JSON.stringify(application, null, 2));

    if (application) console.log("SUCCESS: Application found in DB.");
    else console.error("FAILED: Application NOT found in DB.");

    console.log("\n--- E2E Verification Complete ---");
}

runE2E();
