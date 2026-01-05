import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function verifyAudio() {
    console.log("Testing /audio/onboarding endpoint...");
    try {
        const res = await fetch(`${BASE_URL}/audio/onboarding`);
        console.log(`Status: ${res.status}`);
        console.log(`Content-Type: ${res.headers.get('content-type')}`);

        if (res.status === 200 && res.headers.get('content-type') === 'audio/mpeg') {
            console.log("✅ Audio endpoint works!");
        } else {
            console.error("❌ Audio endpoint failed.");
            process.exit(1);
        }
    } catch (err) {
        console.error("❌ Request failed:", err);
        process.exit(1);
    }
}

verifyAudio();
