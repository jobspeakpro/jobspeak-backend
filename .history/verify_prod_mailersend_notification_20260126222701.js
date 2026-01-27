import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Production URL
const API_URL = 'https://jobspeakpro.com/api/affiliate/apply';
// const API_URL = 'https://jobspeak-backend-production.up.railway.app/api/affiliate/apply';

const timestamp = Date.now();
const payload = {
    name: `MailerSend Prod Test ${timestamp}`,
    email: `test.prod.${timestamp}@example.com`,
    country: "United States",
    primaryPlatform: "YouTube",
    audienceSize: "10k-50k",
    payoutPreference: "paypal",
    payoutDetails: { email: `pay.prod.${timestamp}@example.com` },
    otherPlatformText: "Production Verification",
    channelLink: "http://test-prod.com",
    promoPlan: "Production Test Plan"
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

            // Proof generation
            const proofDir = path.join(process.cwd(), 'docs', 'proofs', '2026-01-24_fix_v4', 'console');
            if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir, { recursive: true });

            const proofPath = path.join(proofDir, 'affiliate_apply_success_prod.txt');

            const proofContent = `
Request URL: ${API_URL}
Timestamp: ${new Date().toISOString()}
Payload: ${JSON.stringify(payload, null, 2)}
Response Status: ${status}
Response Body: ${JSON.stringify(data, null, 2)}
            `.trim();

            fs.writeFileSync(proofPath, proofContent);
            console.log(`[VERIFY] Proof saved to ${proofPath}`);
            console.log('[VERIFY] Check AFFILIATE_NOTIFY_EMAIL for the notification.');

        } else {
            console.error('[VERIFY] FAILED: API/DB error.');
        }

    } catch (err) {
        console.error('[VERIFY] Network Error:', err);
    }
}

verify();
