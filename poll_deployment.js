// poll_deployment.js
// Polls production until new keys appear

const TARGET_URL = 'https://jobspeakpro.com/api/mock-interview/limit-status';
const EXPECTED_KEY = 'blocked'; // This key was added to AUTH_REQUIRED response

async function poll() {
    let attempts = 0;
    while (attempts < 30) {
        try {
            console.log(`Polling ${TARGET_URL} (Attempt ${attempts + 1})...`);
            const res = await fetch(TARGET_URL);
            const data = await res.json();

            if (data[EXPECTED_KEY] !== undefined) {
                console.log('✅ New deployment detected!');
                console.log('Response:', JSON.stringify(data, null, 2));
                process.exit(0);
            } else {
                console.log('Old deployment still active. Waiting...');
            }
        } catch (e) {
            console.error('Polling error:', e.message);
        }

        await new Promise(r => setTimeout(r, 5000));
        attempts++;
    }
    console.error('❌ Timeout waiting for deployment');
    process.exit(1);
}

poll();
