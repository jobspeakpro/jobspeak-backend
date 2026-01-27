
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

dotenv.config();

const BACKEND_URL = 'https://jobspeak-backend-production.up.railway.app';
const PROOF_DIR = 'docs/proofs/2026-01-24_fix_v4';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verifyProd() {
    console.log(`Starting Production Verification against ${BACKEND_URL}...`);
    const logFile = `${PROOF_DIR}/prod_verification_log.txt`;
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    // 1. Authenticate
    const testEmail = `prod_verify_v4_${Date.now()}@example.com`;
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'password123',
        email_confirm: true
    });

    let token;
    if (createError) {
        // Fallback
        const { data: signIn } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: 'password123'
        });
        token = signIn?.session?.access_token;
    } else {
        const { data: signIn } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: 'password123'
        });
        token = signIn.session.access_token;
    }

    if (!token) {
        log("❌ FAIL: Could not authenticat for prod test.");
        return;
    }

    log(`Authenticated for Prod Test.`);

    // 2. Test Affiliate Apply on Prod
    log("\n--- Testing POST /affiliate/apply (Prod) ---");
    const applyPayload = {
        name: 'Prod V4 Validator',
        email: testEmail,
        country: 'CA',
        primaryPlatform: 'Instagram',
        audienceSize: '50k',
        payoutPreference: 'crypto',
        payoutDetails: '0x123...abc',
        channelLink: 'http://instagram.com/test',
        promoPlan: 'Stories'
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
            log("✅ SUCCESS: Production Affiliate Apply accepted!");

            // Verify DB
            const { data: app } = await supabase.from('affiliate_applications').select('*').eq('id', json.id).single();
            if (app && app.payout_preference === 'crypto') {
                log(`✅ DB VERIFIED: Row exists in Prod DB with correct columns.`);
            } else {
                log(`❌ DB CHECK FAIL: App created but verification read failed?`);
            }
        } else {
            log(`❌ FAIL: Prod returned error (Deployment might be pending?)`);
        }

    } catch (e) {
        log(`❌ EXCEPTION: ${e.message}`);
    }
}

verifyProd().catch(console.error);
