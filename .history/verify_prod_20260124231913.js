
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

dotenv.config();

const BACKEND_URL = 'https://jobspeak-backend-production.up.railway.app';
const PROOF_DIR = 'docs/proofs/2026-01-24_fix_v4';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verifyProd() {
    console.log(`Starting Strict Production Verification against ${BACKEND_URL}...`);
    const logFile = `${PROOF_DIR}/prod_verification_log.txt`;
    const routeLog = `${PROOF_DIR}/console/route_check.txt`;

    // reset logs
    fs.writeFileSync(logFile, `Strict Verification Start: ${new Date().toISOString()}\n`);
    fs.writeFileSync(routeLog, `Route Checks Start: ${new Date().toISOString()}\n\n`);

    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    const logRoute = (msg) => {
        // console.log(msg); // optional
        fs.appendFileSync(routeLog, msg + '\n');
    };

    // 1. Route Checks (curl equivalent)
    log("Running Route Checks...");

    // Check 1: /api/affiliate/apply (POST)
    try {
        logRoute(`=== CHECK 1: POST ${BACKEND_URL}/api/affiliate/apply ===`);
        const res1 = await fetch(`${BACKEND_URL}/api/affiliate/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}) // Missing fields -> should be 400
        });
        logRoute(`HTTP/${res1.status} ${res1.statusText}`);
        for (const [key, value] of res1.headers) logRoute(`${key}: ${value}`);
        const t1 = await res1.text();
        logRoute(`\n${t1}\n`);
    } catch (e) { logRoute(`Error: ${e.message}\n`); }

    // Check 2: /affiliate/apply (POST) - The Alias
    try {
        logRoute(`=== CHECK 2: POST ${BACKEND_URL}/affiliate/apply ===`);
        const res2 = await fetch(`${BACKEND_URL}/affiliate/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}) // Missing fields -> should be 400
        });
        logRoute(`HTTP/${res2.status} ${res2.statusText}`);
        for (const [key, value] of res2.headers) logRoute(`${key}: ${value}`);
        const t2 = await res2.text();
        logRoute(`\n${t2}\n`);
    } catch (e) { logRoute(`Error: ${e.message}\n`); }


    // 2. Authenticate using Service Role to check DB
    // We are verifying the DB write, so we need a valid user token to submit.
    const testEmail = `prod_verify_strict_${Date.now()}@example.com`;
    // Create use via admin (Service Role)
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'password123',
        email_confirm: true
    });

    let token;
    let userId;
    if (createError) {
        log(`User create failed (might exist): ${createError.message}`);
        // sign in
        const { data: signIn } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: 'password123'
        });
        token = signIn?.session?.access_token;
        userId = signIn?.user?.id;
    } else {
        userId = user.user.id;
        const { data: signIn } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: 'password123'
        });
        token = signIn?.session?.access_token;
    }

    if (!token) {
        log("❌ CRITICAL: Could not mint token for verification.");
        process.exit(1);
    }
    log(`Authenticated as ${testEmail}`);

    // 3. Functional Test: Affiliate Apply
    log("\n--- Testing POST /affiliate/apply (Prod Payload) ---");
    const applyPayload = {
        name: 'Strict Prod Validator',
        email: testEmail,
        country: 'UK',
        primaryPlatform: 'TikTok',
        audienceSize: '1M',
        payoutPreference: 'crypto',
        payoutDetails: '0xStrictCheck',
        channelLink: 'http://tiktok.com/@strict',
        promoPlan: 'Strict verification'
    };

    try {
        const res = await fetch(`${BACKEND_URL}/affiliate/apply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(applyPayload)
        });

        const json = await res.json();
        log(`Prod Response: ${res.status} ${JSON.stringify(json)}`);

        if (res.status === 200 && json.success) {
            log("✅ SUCCESS: Production Affiliate Apply accepted (HTTP 200).");

            // 4. DB Verification
            log("Verifying Database Row...");
            // Force freshness
            const { data: app, error: dbError } = await supabase
                .from('affiliate_applications')
                .select('*')
                .eq('id', json.id)
                .single();

            if (dbError) {
                log(`❌ DB ERROR: Found ID ${json.id} but select failed? ${dbError.message}`);
            } else {
                if (app && app.payout_preference === 'crypto') {
                    log(`✅ DB PROOF: Row found and has new columns!`);
                    log(`Row: ${JSON.stringify(app, null, 2)}`);
                } else {
                    log(`❌ DB SCHEMA FAIL: Row found but payout_preference missing?`);
                    log(`Row: ${JSON.stringify(app, null, 2)}`);
                }
            }

        } else {
            log(`❌ FAIL: API returned error. Deployment likely still old or migration failed.`);
        }

    } catch (e) {
        log(`❌ EXCEPTION: ${e.message}`);
    }
}

console.log(msg); // also to console
};

// Check 1: /api/affiliate/apply (POST)
try {
    logRoute("Testing POST https://jobspeak-backend-production.up.railway.app/api/affiliate/apply");
    const res1 = await fetch(`${BACKEND_URL}/api/affiliate/apply`, { method: 'POST', body: JSON.stringify({}) }); // Empty body -> 400
    logRoute(`Response: ${res1.status} ${res1.statusText}`);
    // Capture headers
    for (const [key, value] of res1.headers) logRoute(`${key}: ${value}`);
    const t1 = await res1.text();
    logRoute(`Body: ${t1}\n`);
} catch (e) { logRoute(`Error: ${e.message}\n`); }

// Check 2: /affiliate/apply (POST - Alias check)
try {
    logRoute("Testing POST https://jobspeak-backend-production.up.railway.app/affiliate/apply");
    const res2 = await fetch(`${BACKEND_URL}/affiliate/apply`, { method: 'POST', body: JSON.stringify({}) });
    logRoute(`Response: ${res2.status} ${res2.statusText}`);
    for (const [key, value] of res2.headers) logRoute(`${key}: ${value}`);
    const t2 = await res2.text();
    logRoute(`Body: ${t2}\n`);
} catch (e) { logRoute(`Error: ${e.message}\n`); }

verifyProd().catch(console.error);

// ... (rest of verification)

