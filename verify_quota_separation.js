import crypto from 'crypto';

const BASE_URL = 'http://localhost:3000';
const USER_KEY = `test_user_${crypto.randomUUID()}`;

async function runTest() {
    console.log('🧪 Starting Verification: STT vs Practice Quota Separation');
    console.log(`👤 User Key: ${USER_KEY}`);

    try {
        // Helper for fetch
        const post = async (url, body) => {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            return { status: res.status, data };
        };

        const get = async (url) => {
            const res = await fetch(url);
            const data = await res.json();
            return { status: res.status, data };
        };

        // 1. Check Initial Usage
        console.log('\n--- Step 1: Check Initial Usage ---');
        let usageRes = await get(`${BASE_URL}/api/usage/today?userKey=${USER_KEY}`);
        console.log('Initial Usage:', usageRes.data.usage);
        if (usageRes.data.usage?.used !== 0) throw new Error('Initial usage should be 0');

        // 2. Consume Practice Quota (3 times) to reach limit
        console.log('\n--- Step 2: Consume 3 Practice Attempts ---');
        for (let i = 1; i <= 3; i++) {
            console.log(`Attempt ${i}...`);
            const res = await post(`${BASE_URL}/ai/micro-demo`, {
                userKey: USER_KEY,
                text: `This is practice answer number ${i} to test the quota separation.`
            });

            console.log(`Response ${i} Status:`, res.status);
            console.log(`Response ${i} Usage:`, res.data.usage);

            if (res.data.usage?.used !== i) throw new Error(`Usage should be ${i}, got ${res.data.usage?.used}`);
        }

        // 3. Verify Limit Reached
        console.log('\n--- Step 3: Verify Limit Reached (4th Attempt) ---');
        const resBlocked = await post(`${BASE_URL}/ai/micro-demo`, {
            userKey: USER_KEY,
            text: "This is the 4th attempt which should be blocked."
        });

        if (resBlocked.status === 429) {
            console.log('✅ Correctly blocked with 429:', resBlocked.data.error);
        } else {
            throw new Error(`Should have blocked with 429, got ${resBlocked.status}`);
        }

        // 4. Verify /api/usage/today reflects the practice limit
        console.log('\n--- Step 4: Verify /api/usage/today ---');
        usageRes = await get(`${BASE_URL}/api/usage/today?userKey=${USER_KEY}`);
        console.log('Final Usage:', usageRes.data.usage);

        if (usageRes.data.usage.used !== 3) throw new Error('Final usage should be 3');
        if (!usageRes.data.usage.blocked) throw new Error('User should be blocked');

        console.log('\n✅ VERIFICATION SUCCESSFUL: Practice quota is enforced correctly separate from STT.');

    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED:', error.message);
        process.exit(1);
    }
}

runTest();
