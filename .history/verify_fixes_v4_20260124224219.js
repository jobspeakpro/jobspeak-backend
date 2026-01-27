
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

dotenv.config();

const BACKEND_URL = 'http://localhost:3000'; // Test local
const PROOF_DIR = 'docs/proofs/2026-01-24_fix_v4';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
    console.log("Starting Verification v4...");
    const logFile = `${PROOF_DIR}/verification_log.txt`;
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    // 1. Authenticate (Get a user)
    // We can use a test user or just mint a token if we have service role.
    // Let's mint a token for a "verification_user".
    const testEmail = `verify_v4_${Date.now()}@example.com`;
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'password123',
        email_confirm: true
    });

    let userId, token;

    if (createError) {
        log(`Could not create user, trying to find existing or sign in... ${createError.message}`);
        // Fallback: try to sign in or use a hardcoded test user if known.
        // For now, let's assume we can use the service role to mock strict auth? 
        // No, middleware verifies JWT.
        // Let's use signInWithPassword on the just created user (or if it existed).
        const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: 'password123'
        });
        if (signInError) {
            throw new Error("Auth failed: " + signInError.message);
        }
        token = signIn.session.access_token;
        userId = signIn.user.id;
    } else {
        userId = user.user.id;
        // Need to sign in to get token
        const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: 'password123'
        });
        if (signInError) {
            console.log("Sign in failed after create???");
            // Maybe email confirm is required but we set email_confirm: true (admin only)
            // Try generating a link or just assume we have to use existing user?
            // Actually, admin.createUser auto-confirms if specified? 
        }
        token = signIn.session.access_token;
    }

    log(`Authenticated as ${testEmail} (${userId})`);

    // 2. GET /api/referrals/me
    log("\n--- Testing GET /api/referrals/me ---");
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const res1 = await fetch(`${BACKEND_URL}/api/referrals/me`, { headers });
    const json1 = await res1.json();
    log(`Response 1: ${res1.status} ${JSON.stringify(json1)}`);

    const res2 = await fetch(`${BACKEND_URL}/api/referrals/me`, { headers });
    const json2 = await res2.json();
    log(`Response 2: ${res2.status} ${JSON.stringify(json2)}`);

    if (json1.code && json1.code === json2.code) {
        log("✅ SUCCESS: Referral code is persistent and idempotent.");
    } else {
        log("❌ FAILURE: Referral codes mismatch or missing.");
    }

    // Capture SQL Proof for Referral
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (profile && profile.referral_code === json1.code) {
        log(`✅ DB PROOF: Profile has referral_code: ${profile.referral_code}`);
        fs.writeFileSync(`${PROOF_DIR}/db_referral_proof.txt`, JSON.stringify(profile, null, 2));
    } else {
        log("❌ DB PROOF FAILED: Profile mismatch");
    }

    // 3. POST /affiliate/apply (via alias /affiliate/apply to test server.js fix)
    log("\n--- Testing POST /affiliate/apply (Validation) ---");
    // Missing fields
    const resApplyFail = await fetch(`${BACKEND_URL}/affiliate/apply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Test' }) // Missing email, etc
    });
    const jsonApplyFail = await resApplyFail.json();
    log(`Fail Response: ${resApplyFail.status} ${JSON.stringify(jsonApplyFail)}`);
    if (resApplyFail.status === 400 && jsonApplyFail.error === 'validation_failed') {
        log("✅ SUCCESS: Validation working.");
    }

    log("\n--- Testing POST /affiliate/apply (Success) ---");
    const applyPayload = {
        name: 'Verification User',
        email: testEmail,
        country: 'US',
        primaryPlatform: 'YouTube',
        audienceSize: '100k',
        payoutPreference: 'paypal',
        payoutDetails: 'verify@paypal.com',
        channelLink: 'http://youtube.com/verify',
        promoPlan: 'Tests'
    };

    const resApplyOk = await fetch(`${BACKEND_URL}/affiliate/apply`, {
        method: 'POST',
        headers,
        body: JSON.stringify(applyPayload)
    });
    const jsonApplyOk = await resApplyOk.json();
    log(`Success Response: ${resApplyOk.status} ${JSON.stringify(jsonApplyOk)}`);

    // Capture SQL Proof for Affiliate
    if (jsonApplyOk.success) {
        const { data: application } = await supabase.from('affiliate_applications').select('*').eq('id', jsonApplyOk.id).single();
        log(`✅ DB PROOF: Application row found: ${application.id}, payout_preference: ${application.payout_preference}`);
        fs.writeFileSync(`${PROOF_DIR}/db_affiliate_proof.txt`, JSON.stringify(application, null, 2));
    } else {
        log("❌ FAILURE: Application submit failed");
    }

    log("\nVerification Complete.");
}

verify().catch(console.error);
