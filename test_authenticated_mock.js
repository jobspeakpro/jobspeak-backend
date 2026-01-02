import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';
const FRONTEND_URL = 'https://jobspeakpro.com';

// Test credentials
const TEST_EMAIL = 'meyefaf490@24faw.com';
const TEST_PASSWORD = 'meyefaf490@24faw.com';

async function testAuthenticatedMockFlow() {
    console.log("=== Testing Authenticated Mock Interview Persistence ===\n");

    let sessionId = null;
    let authToken = null;

    // 1. Login to get auth token
    console.log("1. Logging in as authenticated user...");
    try {
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            })
        });

        const loginData = await loginRes.json();

        if (loginData.session?.access_token) {
            authToken = loginData.session.access_token;
            console.log(`   ✅ Login successful, user_id: ${loginData.user?.id}`);
        } else {
            console.log(`   ⚠️ Login response:`, loginData);
            console.log(`   Proceeding with guest flow instead...`);
        }
    } catch (e) {
        console.error("   Login Failed:", e.message);
        console.log("   Proceeding with guest flow...");
    }

    const userKey = authToken ? `auth-${Date.now()}` : `guest-test-${Date.now()}`;
    console.log(`   Using userKey: ${userKey}\n`);

    // 2. Start Session
    console.log("2. Starting Mock Interview Session...");
    try {
        const startRes = await fetch(`${BASE_URL}/mock-interview/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            },
            body: JSON.stringify({ userKey, interviewType: 'short' })
        });
        const startData = await startRes.json();
        console.log("   Start Response:", startData);
    } catch (e) {
        console.error("   Start Failed:", e.message);
    }

    // 3. Get Questions
    console.log("\n3. Getting Questions...");
    try {
        const qRes = await fetch(`${BASE_URL}/mock-interview/questions?userKey=${userKey}&type=short`, {
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        const qData = await qRes.json();
        sessionId = qData.sessionId;
        console.log("   Session ID:", sessionId);
        console.log("   Questions count:", qData.questions?.length);

        if (!sessionId) {
            console.error("   ❌ FAIL: No sessionId returned");
            process.exit(1);
        }
    } catch (e) {
        console.error("   Get Questions Failed:", e.message);
        process.exit(1);
    }

    // 4. Submit Answer
    console.log("\n4. Submitting Answer...");
    console.log("   📝 Watch backend console for these logs:");
    console.log("      [MOCK ANSWER] Request received - sessionId=...");
    console.log("      MOCK_ATTEMPT_SAVE sessionId=...");
    console.log("      [MOCK ANSWER] ✅ ATTEMPT INSERTED SUCCESSFULLY\n");

    const answerPayload = {
        userKey,
        sessionId,
        questionId: "test-q-1",
        questionText: "Tell me about a time you faced a significant challenge.",
        answerText: "In my previous role as a software engineer, I was tasked with migrating our legacy system to a microservices architecture. The challenge was that we had to maintain zero downtime while serving millions of users. I led a team of five engineers and we implemented a phased rollout strategy. We started by creating a feature flag system, then gradually migrated services one by one. The result was a successful migration with 99.9% uptime and a 40% improvement in system performance.",
        audioUrl: null
    };

    try {
        const ansRes = await fetch(`${BASE_URL}/mock-interview/answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            },
            body: JSON.stringify(answerPayload)
        });
        const ansData = await ansRes.json();

        if (ansData.success) {
            console.log("   ✅ Answer submitted successfully");
            console.log("   Score:", ansData.score);
            console.log("   Progress:", ansData.progress);
        } else {
            console.error("   ❌ FAIL: Answer submission failed");
            console.error("   Error:", ansData.error);
            console.error("   Code:", ansData.code);
            console.error("   Details:", ansData.details);

            if (ansData.code === 'PGRST204') {
                console.error("\n   🔧 DIAGNOSIS: Schema migration not applied!");
                console.error("   Run: supabase-migrations/mock_optimization.sql");
            } else if (ansData.code === '42501' || ansData.message?.includes('policy')) {
                console.error("\n   🔧 DIAGNOSIS: RLS blocking insert!");
                console.error("   Run: supabase-migrations/mock_rls_fix.sql");
            }
        }
    } catch (e) {
        console.error("   Submit Answer Failed:", e.message);
    }

    // 5. Get Summary
    console.log("\n5. Fetching Summary...");
    console.log("   📝 Watch backend console for:");
    console.log("      MOCK_SUMMARY_FETCH sessionId=... attemptsCount=...\n");

    try {
        const sumRes = await fetch(`${BASE_URL}/mock-interview/summary?sessionId=${sessionId}`, {
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        const sumData = await sumRes.json();

        console.log("   Summary Response:");
        console.log("   - Attempt Count:", sumData.attemptCount);
        console.log("   - Overall Score:", sumData.overall_score);
        console.log("   - Completed:", sumData.completed);

        if (sumData.attemptCount > 0) {
            console.log("\n   ✅✅✅ SUCCESS: Persistence Working!");
            console.log("   Mock interview data is being saved and retrieved correctly.");
        } else {
            console.error("\n   ❌ FAIL: Persistence Broken (attemptCount = 0)");
            console.error("\n   🔍 Check backend console logs above for:");
            console.error("      - Session creation errors");
            console.error("      - Attempt insert errors");
            console.error("      - RLS policy violations");
        }

    } catch (e) {
        console.error("   Fetch Summary Failed:", e.message);
    }
}

testAuthenticatedMockFlow();
