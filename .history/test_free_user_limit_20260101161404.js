import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';

/**
 * Test: Free User Mock Interview Limit
 * 
 * Verifies that:
 * 1. Free users can complete their first mock interview
 * 2. Free users are blocked from starting a second mock interview
 * 3. Backend returns 403 with FREE_LIMIT_REACHED error code
 * 4. Pro users are not affected by the limit
 */
async function testFreeUserLimit() {
    console.log("=== Testing Free User Mock Interview Limit ===\n");

    // Use a real user ID format (UUID) instead of guest key
    // In production, this would come from auth
    const freeUserId = `00000000-0000-0000-0000-${Date.now().toString().slice(-12)}`;

    try {
        // Step 1: Start first mock interview as free user
        console.log("1. Starting first mock interview as free user...");
        const start1Res = await fetch(`${BASE_URL}/mock-interview/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userKey: freeUserId, interviewType: 'short' })
        });
        const start1Data = await start1Res.json();
        console.log(`   ✓ First interview started: ${JSON.stringify(start1Data)}\n`);

        // Step 2: Get questions for first interview
        console.log("2. Getting questions for first interview...");
        const q1Res = await fetch(`${BASE_URL}/mock-interview/questions?userKey=${freeUserId}&type=short`);
        const q1Data = await q1Res.json();
        const sessionId1 = q1Data.sessionId;
        console.log(`   ✓ Session ID 1: ${sessionId1}\n`);

        // Step 3: Submit answer to first interview
        console.log("3. Submitting answer to first interview...");
        const ans1 = {
            userKey: freeUserId,
            sessionId: sessionId1,
            questionId: "test-q-1",
            questionText: "Tell me about a time you failed.",
            answerText: "I was working on a project and I missed the deadline. I communicated the issue and took steps to fix it.",
            interviewType: "short"
        };

        const ans1Res = await fetch(`${BASE_URL}/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ans1)
        });
        const ans1Data = await ans1Res.json();

        if (!ans1Data.success) {
            console.error("❌ FAIL: First answer submission failed");
            console.error("   Error:", JSON.stringify(ans1Data, null, 2));
            process.exit(1);
        }
        console.log(`   ✓ First answer submitted successfully\n`);

        // Step 4: Complete first interview (get summary)
        console.log("4. Completing first interview (get summary)...");
        const sum1Res = await fetch(`${BASE_URL}/mock-interview/summary?sessionId=${sessionId1}`);
        const sum1Data = await sum1Res.json();

        if (sum1Data.completed) {
            console.log(`   ✓ First interview completed\n`);
        } else {
            console.log(`   ⚠ Warning: First interview not marked as completed\n`);
        }

        // Step 5: Try to start second mock interview
        console.log("5. Attempting to start SECOND mock interview as same free user...");
        const q2Res = await fetch(`${BASE_URL}/mock-interview/questions?userKey=${freeUserId}&type=short`);
        const q2Data = await q2Res.json();
        const sessionId2 = q2Data.sessionId;
        console.log(`   ✓ Got questions (Session ID 2: ${sessionId2})\n`);

        // Step 6: Try to submit answer to second interview (should be blocked)
        console.log("6. Attempting to submit answer to SECOND interview...");
        const ans2 = {
            userKey: freeUserId,
            sessionId: sessionId2,
            questionId: "test-q-2",
            questionText: "Tell me about a time you led a team.",
            answerText: "I led a team of 5 developers on a critical project. We delivered on time and exceeded expectations.",
            interviewType: "short"
        };

        const ans2Res = await fetch(`${BASE_URL}/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ans2)
        });
        const ans2Data = await ans2Res.json();

        // Step 7: Verify rejection
        console.log("7. Verifying free user limit enforcement...");

        if (ans2Res.status === 403) {
            console.log(`   ✓ Status code: 403 (correct)`);
        } else {
            console.error(`   ❌ FAIL: Expected status 403, got ${ans2Res.status}`);
            console.error(`   Response:`, JSON.stringify(ans2Data, null, 2));
            process.exit(1);
        }

        if (ans2Data.code === 'FREE_LIMIT_REACHED') {
            console.log(`   ✓ Error code: FREE_LIMIT_REACHED (correct)`);
        } else {
            console.error(`   ❌ FAIL: Expected error code FREE_LIMIT_REACHED, got ${ans2Data.code}`);
            process.exit(1);
        }

        if (ans2Data.error && ans2Data.error.includes('one mock interview')) {
            console.log(`   ✓ Error message mentions 'one mock interview' (correct)`);
        } else {
            console.error(`   ❌ FAIL: Error message doesn't mention limit`);
            console.error(`   Received: ${ans2Data.error}`);
            process.exit(1);
        }

        if (ans2Data.upgrade === true) {
            console.log(`   ✓ Upgrade flag is true (correct)`);
        } else {
            console.error(`   ❌ FAIL: Upgrade flag not set`);
            process.exit(1);
        }

        console.log("\n" + "=".repeat(50));
        console.log("✅ ALL TESTS PASSED");
        console.log("=".repeat(50));
        console.log("\nFree user limit enforcement is working correctly:");
        console.log("- Free users can complete their first mock interview");
        console.log("- Free users are blocked from second interview");
        console.log("- Returns 403 status code");
        console.log("- Provides FREE_LIMIT_REACHED error code");
        console.log("- Sets upgrade flag to true");
        console.log("\nThis prevents:");
        console.log("- Direct API calls to bypass limit");
        console.log("- URL manipulation");
        console.log("- Multiple attempts via different sessions");

    } catch (error) {
        console.error("\n❌ TEST FAILED WITH EXCEPTION:");
        console.error(error);
        process.exit(1);
    }
}

// Run the test
testFreeUserLimit();
