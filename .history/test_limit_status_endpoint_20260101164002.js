import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';

/**
 * Test: Mock Interview Limit Status Endpoint
 * 
 * Verifies:
 * 1. New endpoint returns correct eligibility status
 * 2. Uses same logic as FREE_LIMIT_REACHED enforcement
 * 3. Enforcement still works even if user bypasses frontend
 */
async function testLimitStatusEndpoint() {
    console.log("=== Testing Mock Interview Limit Status Endpoint ===\n");

    const freeUserId = `test-user-${Date.now()}`;

    try {
        // Step 1: Check limit status BEFORE completing any interviews
        console.log("1. Checking limit status for new free user...");
        const status1Res = await fetch(`${BASE_URL}/mock-interview/limit-status?userKey=${freeUserId}`);
        const status1Data = await status1Res.json();

        console.log(`   Response:`, status1Data);

        if (status1Data.canStartMock === true) {
            console.log(`   ✓ New user can start mock interview\n`);
        } else {
            console.error(`   ❌ FAIL: New user should be able to start`);
            process.exit(1);
        }

        // Step 2: Complete a mock interview
        console.log("2. Completing a mock interview...");

        // Get questions
        const qRes = await fetch(`${BASE_URL}/mock-interview/questions?userKey=${freeUserId}&type=short`);
        const qData = await qRes.json();
        const sessionId = qData.sessionId;
        console.log(`   Session ID: ${sessionId}`);

        // Submit answer
        const ansRes = await fetch(`${BASE_URL}/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userKey: freeUserId,
                sessionId,
                questionId: "test-q-1",
                questionText: "Tell me about yourself.",
                answerText: "I am a software engineer with 5 years of experience.",
                interviewType: "short"
            })
        });
        const ansData = await ansRes.json();

        if (!ansData.success) {
            console.error("   ❌ FAIL: Answer submission failed");
            console.error("   Error:", JSON.stringify(ansData, null, 2));
            process.exit(1);
        }

        // Get summary (marks as completed)
        const sumRes = await fetch(`${BASE_URL}/mock-interview/summary?sessionId=${sessionId}`);
        const sumData = await sumRes.json();

        if (sumData.completed) {
            console.log(`   ✓ Mock interview completed\n`);
        } else {
            console.log(`   ⚠ Warning: Session not marked as completed\n`);
        }

        // Step 3: Check limit status AFTER completing interview
        console.log("3. Checking limit status after completing one interview...");
        const status2Res = await fetch(`${BASE_URL}/mock-interview/limit-status?userKey=${freeUserId}`);
        const status2Data = await status2Res.json();

        console.log(`   Response:`, status2Data);

        if (status2Data.canStartMock === false && status2Data.reason === "FREE_LIMIT_REACHED") {
            console.log(`   ✓ Limit status correctly shows FREE_LIMIT_REACHED\n`);
        } else {
            console.error(`   ❌ FAIL: Should show canStartMock: false with FREE_LIMIT_REACHED`);
            process.exit(1);
        }

        // Step 4: CONFIRM enforcement still works (try to bypass frontend)
        console.log("4. CONFIRMING enforcement: Trying to bypass frontend and submit answer...");

        // Get new session
        const q2Res = await fetch(`${BASE_URL}/mock-interview/questions?userKey=${freeUserId}&type=short`);
        const q2Data = await q2Res.json();
        const sessionId2 = q2Data.sessionId;
        console.log(`   Got new session ID: ${sessionId2}`);

        // Try to submit answer (should be blocked by enforcement)
        const ans2Res = await fetch(`${BASE_URL}/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userKey: freeUserId,
                sessionId: sessionId2,
                questionId: "test-q-2",
                questionText: "Tell me about a time you failed.",
                answerText: "I missed a deadline once but learned from it.",
                interviewType: "short"
            })
        });
        const ans2Data = await ans2Res.json();

        if (ans2Res.status === 403 && ans2Data.code === 'FREE_LIMIT_REACHED') {
            console.log(`   ✓ Enforcement still works! Answer blocked with 403 FREE_LIMIT_REACHED\n`);
        } else {
            console.error(`   ❌ FAIL: Enforcement broken! User was able to bypass limit`);
            console.error(`   Status: ${ans2Res.status}, Response:`, ans2Data);
            process.exit(1);
        }

        console.log("\n" + "=".repeat(50));
        console.log("✅ ALL TESTS PASSED");
        console.log("=".repeat(50));
        console.log("\nLimit status endpoint is working correctly:");
        console.log("- Returns canStartMock: true for new users");
        console.log("- Returns canStartMock: false with FREE_LIMIT_REACHED after completing one");
        console.log("- Uses exact same logic as enforcement");
        console.log("- Enforcement still blocks direct API calls (403)");
        console.log("\nThis prevents:");
        console.log("- Confusing UX (user thinks they can start but gets blocked)");
        console.log("- Frontend can show paywall BEFORE user tries to start");
        console.log("- Enforcement remains server-side and impossible to bypass");

    } catch (error) {
        console.error("\n❌ TEST FAILED WITH EXCEPTION:");
        console.error(error);
        process.exit(1);
    }
}

// Run the test
testLimitStatusEndpoint();
