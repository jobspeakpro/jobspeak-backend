import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const API_URL = 'https://jobspeakpro.com/api/affiliate/apply';
// const API_URL = 'https://jobspeak-backend-production.up.railway.app/api/affiliate/apply';

async function querySupabase() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('[VERIFY] SUPABASE keys missing locally. Skipping DB check.');
        return;
    }

    // Select payout_details to verify the suffix
    const url = `${process.env.SUPABASE_URL}/rest/v1/affiliate_applications?select=id,name,email,created_at,payout_details&order=created_at.desc&limit=3`;

    try {
        const response = await fetch(url, {
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            }
        });

        if (!response.ok) {
            console.error('[VERIFY] Supabase Query Failed:', await response.text());
            return;
        }

        const rows = await response.json();
        console.log('[VERIFY] Latest Rows:', JSON.stringify(rows, null, 2));

        // Save Proof
        const proofDir = path.join(process.cwd(), 'docs', 'proofs', '2026-01-26_mailersend');
        if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir, { recursive: true });

        const proofPath = path.join(proofDir, 'db_mailersend_status_proof.txt');

        fs.writeFileSync(proofPath, JSON.stringify(rows, null, 2));
        console.log(`[VERIFY] Proof saved to ${proofPath}`);
    } catch (err) {
        console.error('[VERIFY] Supabase Fetch Error:', err);
    }
}

async function run() {
    try {
        console.log('[VERIFY] 1. Submitting Application (Zero-Mig Proof)...');
        const timestamp = Date.now();
        const payload = {
            name: `ZeroMig Verify ${timestamp}`,
            email: `zeromig.verify.${timestamp}@example.com`,
            country: "United States",
            primaryPlatform: "YouTube",
            audienceSize: "10k-50k",
            payoutPreference: "paypal",
            payoutDetails: { email: `pay.zeromig.${timestamp}@example.com` },
            otherPlatformText: "Zero-Migration Script",
            channelLink: "http://zeromig-test.com",
            promoPlan: "Zero-Mig Plan"
        };

        const appRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const appData = await appRes.json();
        console.log('[VERIFY] Apply Response:', appData);

        if (!appData.success) {
            console.error('[VERIFY] FAILED: Application submission failed.');
            return;
        }

        console.log('[VERIFY] 2. Waiting for Async DB Update (5s)...');
        await new Promise(r => setTimeout(r, 5000));

        await querySupabase();

    } catch (e) {
        console.error('[VERIFY] Error:', e);
    }
}

run();
