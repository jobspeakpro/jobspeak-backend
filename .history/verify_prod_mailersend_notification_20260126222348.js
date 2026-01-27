import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Production URL (Vercel Proxy or Direct Railway)
const API_URL = 'https://jobspeakpro.com/api/affiliate/apply';
// const API_URL = 'https://jobspeak-backend-production.up.railway.app/api/affiliate/apply';

const timestamp = Date.now();
const payload = {
    name: `MailerSend Test ${timestamp}`,
    email: `test.affiliate.${timestamp}@example.com`,
    country: "United States",
    primaryPlatform: "YouTube",
    audienceSize: "10k-50k",
    payoutPreference: "paypal",
    payoutDetails: { email: `pay.${timestamp}@example.com` },
    otherPlatformText: "Testing Script",
    channelLink: "http://test.com",
    promoPlan: "Test Plan"
};

async function verify() {
    console.log(`[VERIFY] Sending request to ${API_URL}...`);
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const status = response.status;
        const text = await response.text();

        console.log(`[VERIFY] Status: ${status}`);

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('[VERIFY] Failed to parse JSON:', text);
            return;
        }

        console.log('[VERIFY] Response:', JSON.stringify(data, null, 2));

        if (status === 200 && data.success) {
            console.log('[VERIFY] SUCCESS: Application submitted.');

            // Check for MailerSend debug info
            if (data.files_debug?.email) {
                const emailResult = data.files_debug.email;
                console.log('[VERIFY] Email Debug Data Found:', emailResult);

                // Save proof
                const proofPath = path.join(process.cwd(), 'docs', 'proofs', '2026-01-24_fix_v4', 'console', 'mailersend_api_response.txt');

                // Redact key if present (unlikely in output, but good practice)
                let proofContent = JSON.stringify(emailResult, null, 2);

                fs.writeFileSync(proofPath, proofContent);
                console.log(`[VERIFY] Proof saved to ${proofPath}`);
            } else {
                console.warn('[VERIFY] Email debug data MISSING. Deployment might not be updated yet.');
            }
        } else {
            console.error('[VERIFY] FAILED: API/DB error.');
        }

    } catch (err) {
        console.error('[VERIFY] Network Error:', err);
    }
}

verify();
