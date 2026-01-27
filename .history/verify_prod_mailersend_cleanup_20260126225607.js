import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Production URLs
const API_URL = 'https://jobspeakpro.com/api/affiliate/apply';
const MIGRATE_URL = 'https://jobspeakpro.com/__admin/migrate';
const ADMIN_SECRET = 'temporary_migration_key_2026';

// Supabase REST API helper (No deps)
async function querySupabase() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('[VERIFY] SUPABASE keys missing locally. Skipping direct DB check.');
        console.log('[VERIFY] Please check .env file exists and contains SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
        return;
    }

    // Using PostgREST syntax
    const url = `${process.env.SUPABASE_URL}/rest/v1/affiliate_applications?select=id,name,email,created_at,notification_status,notification_error&order=created_at.desc&limit=3`;

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
        const proofDir = path.join(process.cwd(), 'docs', 'proofs', '2026-01-26_affiliate_backend');
        if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir, { recursive: true });

        const proofPath = path.join(proofDir, 'db_latest_affiliate_row.txt');

        fs.writeFileSync(proofPath, JSON.stringify(rows, null, 2));
        console.log(`[VERIFY] Proof saved to ${proofPath}`);
    } catch (err) {
        console.error('[VERIFY] Supabase Fetch Error:', err);
    }
}

async function run() {
    try {
        console.log('[VERIFY] 1. Applying Migration...');
        const migRes = await fetch(MIGRATE_URL, {
            method: 'POST',
            headers: { 'x-admin-secret': ADMIN_SECRET }
        });
        const migText = await migRes.text();
        console.log(`[VERIFY] Migration Status: ${migRes.status} - ${migText}`);

        console.log('[VERIFY] 2. Submitting Application...');
        const timestamp = Date.now();
        const payload = {
            name: `Cleanup Verified ${timestamp}`,
            email: `clean.verify.${timestamp}@example.com`,
            country: "United States",
            primaryPlatform: "YouTube",
            audienceSize: "10k-50k",
            payoutPreference: "paypal",
            payoutDetails: { email: `pay.clean.${timestamp}@example.com` },
            otherPlatformText: "Cleanup Verification",
            channelLink: "http://clean-test.com",
            promoPlan: "Cleanup Plan"
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

        console.log('[VERIFY] 3. Waiting for Async DB Update (5s)...');
        await new Promise(r => setTimeout(r, 5000));

        await querySupabase();

    } catch (e) {
        console.error('[VERIFY] Error:', e);
    }
}

run();
