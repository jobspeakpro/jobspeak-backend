
import fetch from 'node-fetch';

const BASE_URL = 'https://jobspeak-backend-production.up.railway.app';
const GUEST_KEY = 'guest-proof-node-' + Date.now();

async function run() {
    console.log('--- STARTING NODE.JS VERIFICATION ---');
    console.log('Target:', BASE_URL);
    console.log('Guest Key:', GUEST_KEY);

    // 1. Health
    try {
        const health = await fetch(`${BASE_URL}/health`);
        const healthJson = await health.json();
        console.log('\n[1] Health Check:', healthJson);
    } catch (e) {
        console.error('[1] Health Failed:', e.message);
    }

    // 2. Seed Data
    try {
        const res = await fetch(`${BASE_URL}/api/activity/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-guest-key': GUEST_KEY
            },
            body: JSON.stringify({
                activityType: 'practice',
                context: { source: 'node-verify' }
            })
        });
        const json = await res.json();
        console.log('\n[2] Seed Activity (POST):', json);
    } catch (e) {
        console.error('[2] Seed Failed:', e.message);
    }

    // 3. Verify Events
    try {
        const eventsUrl = `${BASE_URL}/api/activity/events`;
        const res = await fetch(eventsUrl, {
            headers: { 'x-guest-key': GUEST_KEY }
        });
        const json = await res.json();
        console.log('\n[3] Verify Events (GET):', JSON.stringify(json, null, 2));
    } catch (e) {
        console.error('[3] Verify Events Failed:', e.message);
    }

    // 4. Verify Progress
    try {
        const progressUrl = `${BASE_URL}/api/progress?userKey=${GUEST_KEY}`;
        const res = await fetch(progressUrl, {
            headers: { 'x-guest-key': GUEST_KEY }
        });

        console.log('\n[4] Verify Progress (Headers):');
        console.log('x-jsp-backend-commit:', res.headers.get('x-jsp-backend-commit'));

        const json = await res.json();
        console.log('[4] Verify Progress (Body):');
        if (json.debug) {
            console.log('Debug:', json.debug);
        } else {
            console.log('Debug field missing');
        }
        console.log('Activity Events Count:', json.activityEvents ? json.activityEvents.length : 0);
    } catch (e) {
        console.error('[4] Verify Progress Failed:', e.message);
    }
}

run();
