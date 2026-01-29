
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env parser to avoid dependency issues if dotenv not installed globally or locally
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const envVars = {};
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
                envVars[key] = value;
            }
        });
        return envVars;
    } catch (e) {
        console.error("Failed to load .env", e);
        return {};
    }
}

const env = loadEnv();
const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const API_URL = 'http://localhost:3000/api';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createTestUser(role, index) {
    const email = `test_proof_${role}_${Date.now()}_${index}@example.com`;
    const password = 'password123';

    console.log(`Creating user: ${email}...`);

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: `${role} User ${index}` }
    });

    if (error) {
        console.error(`Failed to create user ${email}:`, error.message);
        return null;
    }

    // Sign in to get token (using password, not admin) --> actually user object from admin has 'id'. 
    // To make API calls, I need a TOKEN.
    // admin.createUser doesn't return a session token for the user, just the user object.
    // So I need to signInWithPassword.

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (signInError) {
        console.error(`Failed to sign in ${email}:`, signInError.message);
        return null;
    }

    return {
        user: data.user,
        token: signInData.session.access_token,
        email
    };
}

async function apiCall(method, endpoint, token, body = null) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const options = {
        method,
        headers
    };

    if (body) options.body = JSON.stringify(body);

    try {
        const res = await fetch(`${API_URL}${endpoint}`, options);
        const data = await res.json();
        return { status: res.status, data };
    } catch (e) {
        return { status: 500, error: e.message };
    }
}

async function run() {
    console.log("=== STARTING PROOF VERIFICATION ===");

    // 1. Create Referrer
    const referrer = await createTestUser('Referrer', 0);
    if (!referrer) process.exit(1);

    console.log(`Referrer created: ${referrer.user.id}`);

    // 2. Get Referral Code
    console.log("Fetching referral code...");
    const codeRes = await apiCall('GET', '/referrals/me', referrer.token);
    console.log("Referral Code Response:", JSON.stringify(codeRes.data));

    const referralCode = codeRes.data.code;
    if (!referralCode) {
        console.error("Failed to get referral code");
        process.exit(1);
    }

    // 3. Create 3 Referees and Claim
    const referees = [];
    for (let i = 1; i <= 3; i++) {
        const referee = await createTestUser('Referee', i);
        if (referee) {
            console.log(`Referee ${i} created. Claiming code...`);
            const claimRes = await apiCall('POST', '/referrals/claim', referee.token, { referralCode });
            console.log(`Claim Result ${i}:`, JSON.stringify(claimRes.data));
            referees.push(referee);
        }
    }

    // 4. Verify History (Should be 3 conversions pending)
    // Wait a moment for DB writes? Usually fast.
    console.log("Checking history...");
    const historyRes = await apiCall('GET', '/referrals/history', referrer.token);
    console.log("History Response:", JSON.stringify(historyRes.data, null, 2));

    const historyCount = historyRes.data.history?.length || 0;
    console.log(`History Count: ${historyCount} (Expected 3)`);

    if (historyCount !== 3) {
        console.error("HISTORY CHECK FAILED");
    } else {
        console.log("HISTORY CHECK PASSED");
    }

    // 5. Simulate "Action" to Convert (need `processReferralAction` to be called or simulate it)
    // The endpoint to trigger this usually is 'completing a session'.
    // I can simulate it by updating the DB directly since I have admin access here.
    // Or I can just verify 'pending' status in history.
    // Requirement A) doesn't strictly say I must convert them, but "Referral history ... Must return REAL DB rows".
    // I have rows. They are pending.

    // 6. Test Affiliate Application (Resend)
    console.log("Testing Affiliate Application...");
    const affiliatePayload = {
        name: "Test Affiliate",
        email: referrer.email,
        country: "USA",
        primaryPlatform: "YouTube",
        audienceSize: "10k",
        payoutPreference: "paypal",
        payoutDetails: { email: "pay@me.com" }
    };

    const applyRes = await apiCall('POST', '/affiliate/apply', referrer.token, affiliatePayload);
    console.log("Affiliate Apply Result:", JSON.stringify(applyRes));

    if (applyRes.data.success) {
        // verify DB
        const { data: apps, error } = await supabase
            .from('affiliate_applications')
            .select('*')
            .eq('id', applyRes.data.applicationId)
            .single();

        if (apps) {
            console.log("Affiliate DB Payout Details:", apps.payout_details);
            if (apps.payout_details.includes("resend:")) {
                console.log("RESEND PROOF: Found 'resend:' status in DB.");
            } else {
                console.log("RESEND PROOF FAILED: No 'resend:' status found.");
            }
        }
    }

    console.log("=== END PROOF VERIFICATION ===");
    process.exit(0);
}

run().catch(e => console.error(e));
