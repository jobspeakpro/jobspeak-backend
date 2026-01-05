import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';

async function verifyMockPersistence() {
    console.log("═══════════════════════════════════════════════════════");
    console.log("  MOCK INTERVIEW PERSISTENCE VERIFICATION");
    console.log("═══════════════════════════════════════════════════════\n");

    // Test with guest user (most common case)
    const userKey = `guest-verify-${Date.now()}`;
    let sessionId = null;

    console.log("📝 Testing as GUEST user");
    console.log(`   UserKey: ${userKey}\n`);

    // Step 1: Start session
    console.log("STEP 1: Starting mock interview session...");
    try {
        const startRes = await fetch(`${BASE_URL}/mock-interview/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userKey, interviewType: 'short' })
        });

        if (!startRes.ok) {
            console.error(`   ❌ Start failed with status ${startRes.status}`);
            const error = await startRes.text();
            console.error(`   Error: ${error}`);
            return;
        }

        const startData = await startRes.json();
        console.log(`   ✅ Session start allowed: ${startData.reason}`);
    } catch (e) {
        console.error(`   ❌ Start request failed: ${e.message}`);
        return;
    }

    // Step 2: Get questions
    console.log("\nSTEP 2: Getting interview questions...");
    try {
        const qRes = await fetch(`${BASE_URL}/mock-interview/questions?userKey=${userKey}&type=short`);

        if (!qRes.ok) {
            console.error(`   ❌ Questions failed with status ${qRes.status}`);
            return;
        }

        const qData = await qRes.json();
        sessionId = qData.sessionId;
        console.log(`   ✅ Questions received`);
        console.log(`   Session ID: ${sessionId}`);
        console.log(`   Questions count: ${qData.questions?.length || 0}\n`);

        if (!sessionId) {
            console.error("   ❌ CRITICAL: No sessionId returned!");
            return;
        }
    } catch (e) {
        console.error(`   ❌ Questions request failed: ${e.message}`);
        return;
    }

    // Step 3: Submit answer
    console.log("STEP 3: Submitting answer...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📺 WATCH BACKEND CONSOLE FOR:");
    console.log("   [MOCK ANSWER] Request received - sessionId=...");
    console.log("   MOCK_ATTEMPT_SAVE sessionId=...");
    console.log("   [MOCK ANSWER] ✅ ATTEMPT INSERTED SUCCESSFULLY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const answerPayload = {
        userKey,
        sessionId,
        questionId: "verify-q1",
        questionText: "Tell me about a time you solved a difficult problem.",
        answerText: "In my previous role, I encountered a critical performance issue in our production system. The database queries were taking over 30 seconds to complete, affecting thousands of users. I analyzed the query execution plans, identified missing indexes, and implemented a caching layer. After optimization, query times dropped to under 2 seconds, and we saw a 95% improvement in response times. The solution saved the company approximately $50,000 in potential lost revenue.",
        audioUrl: null
    };

    try {
        const ansRes = await fetch(`${BASE_URL}/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(answerPayload)
        });

        const ansData = await ansRes.json();

        if (ansData.success) {
            console.log("   ✅✅✅ ANSWER SUBMITTED SUCCESSFULLY!");
            console.log(`   Score: ${ansData.score}`);
            console.log(`   Progress: ${ansData.progress?.answered || 0} answers submitted\n`);
        } else {
            console.error("   ❌❌❌ ANSWER SUBMISSION FAILED!");
            console.error(`   Error: ${ansData.error}`);

            if (ansData.code) {
                console.error(`   Error Code: ${ansData.code}`);
                console.error(`   Details: ${ansData.details}`);

                console.error("\n🔍 DIAGNOSIS:");
                if (ansData.code === 'PGRST204') {
                    console.error("   → Schema issue: Column missing from mock_attempts table");
                    console.error("   → Run: mock_optimization.sql in Supabase SQL Editor");
                } else if (ansData.code === '42501') {
                    console.error("   → RLS policy blocking insert");
                    console.error("   → Run: mock_rls_fix.sql in Supabase SQL Editor");
                } else if (ansData.code === '23503') {
                    console.error("   → Foreign key violation: session doesn't exist");
                    console.error("   → Check session creation logic");
                } else {
                    console.error(`   → Unknown error code: ${ansData.code}`);
                }
            }

            console.error("\n📋 FULL ERROR OBJECT:");
            console.error(JSON.stringify(ansData, null, 2));
            return;
        }
    } catch (e) {
        console.error(`   ❌ Answer request failed: ${e.message}`);
        return;
    }

    // Step 4: Fetch summary
    console.log("STEP 4: Fetching summary...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📺 WATCH BACKEND CONSOLE FOR:");
    console.log("   MOCK_SUMMARY_FETCH sessionId=... attemptsCount=...");
    console.log("   [MOCK SUMMARY] ✅ Found X attempts");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    try {
        const sumRes = await fetch(`${BASE_URL}/mock-interview/summary?sessionId=${sessionId}`);

        if (!sumRes.ok) {
            console.error(`   ❌ Summary failed with status ${sumRes.status}`);
            return;
        }

        const sumData = await sumRes.json();

        console.log("   SUMMARY RESULTS:");
        console.log(`   - Attempt Count: ${sumData.attemptCount}`);
        console.log(`   - Overall Score: ${sumData.overall_score}`);
        console.log(`   - Completed: ${sumData.completed}`);
        console.log(`   - Strengths: ${sumData.strengths?.length || 0} items`);
        console.log(`   - Weaknesses: ${sumData.weaknesses?.length || 0} items\n`);

        if (sumData.attemptCount > 0) {
            console.log("═══════════════════════════════════════════════════════");
            console.log("  ✅✅✅ SUCCESS: PERSISTENCE IS WORKING!");
            console.log("═══════════════════════════════════════════════════════");
            console.log(`  Mock interview data saved and retrieved successfully.`);
            console.log(`  Attempts recorded: ${sumData.attemptCount}`);
            console.log(`  Overall score: ${sumData.overall_score}/100`);
            console.log("═══════════════════════════════════════════════════════\n");
        } else {
            console.error("═══════════════════════════════════════════════════════");
            console.error("  ❌❌❌ FAILURE: PERSISTENCE BROKEN");
            console.error("═══════════════════════════════════════════════════════");
            console.error("  attemptCount = 0 (no data saved or retrieved)");
            console.error("\n🔍 TROUBLESHOOTING STEPS:");
            console.error("  1. Check backend console logs above for insert errors");
            console.error("  2. Verify RLS policies allow guest access (user_id IS NULL)");
            console.error("  3. Confirm sessionId matches between insert and select");
            console.error("  4. Run schema verification query in Supabase");
            console.error("═══════════════════════════════════════════════════════\n");
        }

    } catch (e) {
        console.error(`   ❌ Summary request failed: ${e.message}`);
    }
}

verifyMockPersistence();
