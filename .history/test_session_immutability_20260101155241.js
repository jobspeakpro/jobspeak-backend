import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'http://localhost:3000/api';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Test: Session Immutability
 * 
 * Verifies that:
 * 1. Completed sessions reject new answer submissions
 * 2. Backend returns 403 with SESSION_COMPLETED error code
 * 3. Error message is clear and actionable
 */
async function testSessionImmutability() {
    console.log("=== Testing Session Immutability ===\n");

    const userKey = `guest-test-${Date.now()}`;
    let sessionId = null;

    try {
        // Step 1: Start a new mock interview
        console.log("1. Starting mock interview...");
        const startRes = await fetch(`${BASE_URL}/mock-interview/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userKey, interviewType: 'short' })
        });
        const startData = await startRes.json();
        console.log(`   ✓ Started: ${JSON.stringify(startData)}\n`);

        // Step 2: Get questions (generates sessionId)
        console.log("2. Getting questions...");
        const qRes = await fetch(`${BASE_URL}/mock-interview/questions?userKey=${userKey}&type=short`);
        const qData = await qRes.json();
        sessionId = qData.sessionId;
        console.log(`   ✓ Session ID: ${sessionId}\n`);

        if (!sessionId) {
            console.error("❌ FAIL: No sessionId returned");
            process.exit(1);
        }

        // Step 3: Submit first answer
        console.log("3. Submitting first answer...");
        const answer1 = {
            userKey,
            sessionId,
            questionId: "test-q-1",
            questionText: "Tell me about a time you failed.",
            answerText: "I was working on a project and I missed the deadline. I communicated the issue and took steps to fix it.",
            interviewType: "short"
        };

        const ans1Res = await fetch(`${BASE_URL}/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(answer1)
        });
        const ans1Data = await ans1Res.json();

        if (!ans1Data.success) {
            console.error("❌ FAIL: First answer submission failed");
            console.error("   Error:", JSON.stringify(ans1Data, null, 2));
            process.exit(1);
        }
        console.log(`   ✓ First answer submitted successfully\n`);

        // Step 4: Mark session as completed (directly in DB)
        console.log("4. Marking session as completed...");
        const { error: updateError } = await supabase
            .from('mock_sessions')
            .update({ completed: true })
            .eq('session_id', sessionId);

        if (updateError) {
            console.error("❌ FAIL: Could not mark session as completed");
            console.error("   Error:", updateError);
            process.exit(1);
        }
        console.log(`   ✓ Session marked as completed\n`);

        // Step 5: Attempt to submit another answer (should be rejected)
        console.log("5. Attempting to submit answer to completed session...");
        const answer2 = {
            userKey,
            sessionId,
            questionId: "test-q-2",
            questionText: "Tell me about a time you led a team.",
            answerText: "I led a team of 5 developers on a critical project. We delivered on time and exceeded expectations.",
            interviewType: "short"
        };

        const ans2Res = await fetch(`${BASE_URL}/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(answer2)
        });
        const ans2Data = await ans2Res.json();

        // Step 6: Verify rejection
        console.log("6. Verifying rejection...");

        if (ans2Res.status === 403) {
            console.log(`   ✓ Status code: 403 (correct)`);
        } else {
            console.error(`   ❌ FAIL: Expected status 403, got ${ans2Res.status}`);
            process.exit(1);
        }

        if (ans2Data.code === 'SESSION_COMPLETED') {
            console.log(`   ✓ Error code: SESSION_COMPLETED (correct)`);
        } else {
            console.error(`   ❌ FAIL: Expected error code SESSION_COMPLETED, got ${ans2Data.code}`);
            process.exit(1);
        }

        if (ans2Data.error && ans2Data.error.includes('completed')) {
            console.log(`   ✓ Error message mentions 'completed' (correct)`);
        } else {
            console.error(`   ❌ FAIL: Error message doesn't mention 'completed'`);
            console.error(`   Received: ${ans2Data.error}`);
            process.exit(1);
        }

        if (ans2Data.message && ans2Data.message.includes('start a new interview')) {
            console.log(`   ✓ Message suggests starting new interview (correct)`);
        } else {
            console.error(`   ❌ FAIL: Message doesn't suggest starting new interview`);
            console.error(`   Received: ${ans2Data.message}`);
            process.exit(1);
        }

        console.log("\n" + "=".repeat(50));
        console.log("✅ ALL TESTS PASSED");
        console.log("=".repeat(50));
        console.log("\nSession immutability is working correctly:");
        console.log("- Completed sessions reject new answers");
        console.log("- Returns 403 status code");
        console.log("- Provides SESSION_COMPLETED error code");
        console.log("- Gives clear, actionable error message");

    } catch (error) {
        console.error("\n❌ TEST FAILED WITH EXCEPTION:");
        console.error(error);
        process.exit(1);
    }
}

// Run the test
testSessionImmutability();
