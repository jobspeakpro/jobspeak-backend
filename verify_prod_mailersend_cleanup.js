import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Production URLs
const API_URL = 'https://jobspeakpro.com/api/affiliate/apply';
const MIGRATE_URL = 'https://jobspeakpro.com/__admin/migrate';
const ADMIN_SECRET = 'temporary_migration_key_2026';

// Supabase Init (Read-only check)
// Assuming env vars are present in local environment or we need to ask user to set them.
// Since we are running this locally against production DB, we need credentials.
// If local .env is missing, this will fail. We rely on the user having .env.

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

        console.log('[VERIFY] 3. Waiting for Async DB Update (3s)...');
        await new Promise(r => setTimeout(r, 3000));

        // DB Verification via Supabase Client (if keys available)
        // If keys not available, we can't do step 4 automtically without user help.
        // But we can print the query for the user.
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.log('[VERIFY] 4. Querying Supabase...');
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

            const { data: rows, error } = await supabase
                .from('affiliate_applications')
                .select('id, name, email, created_at, notification_status, notification_error')
                .order('created_at', { ascending: false })
                .limit(3);

            if (error) {
                console.error('[VERIFY] DB Query Error:', error);
            } else {
                console.log('[VERIFY] Latest Rows:', JSON.stringify(rows, null, 2));

                // Save Proof
                const proofPath = path.join(process.cwd(), 'docs', 'proofs', '2026-01-26_affiliate_backend', 'db_latest_affiliate_row.txt');
                const proofDir = path.dirname(proofPath);
                if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir, { recursive: true });

                fs.writeFileSync(proofPath, JSON.stringify(rows, null, 2));
                console.log(`[VERIFY] Proof saved to ${proofPath}`);
            }
        } else {
            console.warn('[VERIFY] SUPABASE keys missing locally. skipping direct DB check.');
            console.log('Run this SQL to verify: select id, name, notification_status from affiliate_applications order by created_at desc limit 3;');
        }

    } catch (e) {
        console.error('[VERIFY] Error:', e);
    }
}

run();
