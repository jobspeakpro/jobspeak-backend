import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = 'meyefaf490@24faw.com';
const TEST_PASSWORD = 'meyefaf490@24faw.com';

async function testAuthenticatedMockFlow() {
    console.log("═══════════════════════════════════════════════════════");
    console.log("  AUTHENTICATED MOCK INTERVIEW - FULL FLOW TEST");
    console.log("═══════════════════════════════════════════════════════\n");

    let sessionId = null;
    let userId = null;

    // Step 1: Login
    console.log("STEP 1: Authenticating user...");
    try {
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
        });

        const loginData = await loginRes.json();

        if (loginData.user?.id) {
            userId = loginData.user.id;
            console.log(`   ✅ Login successful`);
            console.log(`   User ID: ${userId}\n`);
        } else {
            console.log(`   ⚠️ Login response (using as guest):`, loginData);
            userId = `guest-auth-${Date.now()}`;
        }
    } catch (e) {
        console.error(`   ❌ Login failed: ${e.message}`);
        userId = `guest-fallback-${Date.now()}`;
    }

    // Step 2: Start Mock Interview
    console.log("STEP 2: Starting mock interview...");
    try {
        const startRes = await fetch(`${BASE_URL}/mock-interview/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userKey: userId, interviewType: 'short' })
        });

        const startData = await startRes.json();
        console.log(`   Response:`, startData);
        console.log();
    } catch (e) {
        console.error(`   ❌ Start failed: ${e.message}\n`);
    }

    // Step 3: Get Questions
    console.log("STEP 3: Getting questions...");
    try {
        const qRes = await fetch(`${BASE_URL}/mock-interview/questions?userKey=${userId}&type=short`);
        const qData = await qRes.json();
        sessionId = qData.sessionId;

        console.log(`   ✅ Session ID: ${sessionId}`);
        console.log(`   Questions: ${qData.questions?.length || 0}\n`);
    } catch (e) {
        console.error(`   ❌ Questions failed: ${e.message}\n`);
        return;
    }

    // Step 4: Submit Answer
    console.log("STEP 4: Submitting answer...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📺 WATCH BACKEND CONSOLE FOR:");
    console.log("   MOCK_ATTEMPT_SAVE sessionId=...");
    console.log("   [MOCK ANSWER] ✅ ATTEMPT INSERTED SUCCESSFULLY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const answerPayload = {
        userKey: userId,
        sessionId,
        questionId: "auth-test-q1",
        questionText: "Describe a challenging project you led.",
        answerText: "I led a team of 8 engineers to migrate our monolithic application to microservices. We faced significant technical debt and tight deadlines. I broke down the project into phases, established clear milestones, and implemented CI/CD pipelines. The migration completed 2 weeks ahead of schedule with zero downtime, and system performance improved by 60%.",
        audioUrl: null
    };

    let answerResponse = null;
    try {
        const ansRes = await fetch(`${BASE_URL}/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(answerPayload)
        });

        answerResponse = await ansRes.json();

        if (answerResponse.success) {
            console.log("   ✅ Answer submitted successfully!");
            console.log(`   Score: ${answerResponse.score}`);
            console.log(`   Progress: ${answerResponse.progress?.answered || 0} answers\n`);
        } else {
            console.error("   ❌ Answer submission failed!");
            console.error("   Error:", answerResponse.error);
            console.error("   Code:", answerResponse.code);
            console.error("   Details:", answerResponse.details);
            console.error("\n   Full Response:", JSON.stringify(answerResponse, null, 2));
            return;
        }
    } catch (e) {
        console.error(`   ❌ Answer request failed: ${e.message}\n`);
        return;
    }

    // Step 5: Get Summary
    console.log("STEP 5: Fetching summary...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📺 WATCH BACKEND CONSOLE FOR:");
    console.log("   MOCK_SUMMARY_FETCH sessionId=... attemptsCount=...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    try {
        const sumRes = await fetch(`${BASE_URL}/mock-interview/summary?sessionId=${sessionId}`);
        const summaryData = await sumRes.json();

        console.log("═══════════════════════════════════════════════════════");
        console.log("  SUMMARY RESPONSE (EXACT JSON)");
        console.log("═══════════════════════════════════════════════════════");
        console.log(JSON.stringify(summaryData, null, 2));
        console.log("═══════════════════════════════════════════════════════\n");

        // Verify key fields
        console.log("FIELD VERIFICATION:");
        console.log(`✓ attemptCount: ${summaryData.attemptCount} (type: ${typeof summaryData.attemptCount})`);
        console.log(`✓ overall_score: ${summaryData.overall_score} (type: ${typeof summaryData.overall_score})`);
        console.log(`✓ bullets: ${Array.isArray(summaryData.bullets) ? summaryData.bullets.length + ' items' : 'NOT AN ARRAY'}`);
        console.log(`✓ strengths: ${Array.isArray(summaryData.strengths) ? summaryData.strengths.length + ' items' : 'NOT AN ARRAY'}`);
        console.log(`✓ weaknesses: ${Array.isArray(summaryData.weaknesses) ? summaryData.weaknesses.length + ' items' : 'NOT AN ARRAY'}`);
        console.log(`✓ completed: ${summaryData.completed} (type: ${typeof summaryData.completed})\n`);

        if (summaryData.attemptCount > 0) {
            console.log("═══════════════════════════════════════════════════════");
            console.log("  ✅✅✅ PERSISTENCE VERIFIED - WORKING CORRECTLY!");
            console.log("═══════════════════════════════════════════════════════");
            console.log(`  Attempts recorded: ${summaryData.attemptCount}`);
            console.log(`  Overall score: ${summaryData.overall_score}/100`);
            console.log(`  Status: ${summaryData.completed ? 'Completed' : 'In Progress'}`);
            console.log("═══════════════════════════════════════════════════════\n");
        } else {
            console.error("═══════════════════════════════════════════════════════");
            console.error("  ❌ PERSISTENCE ISSUE: attemptCount = 0");
            console.error("═══════════════════════════════════════════════════════");
            console.error("  Check backend logs for insert errors");
            console.error("═══════════════════════════════════════════════════════\n");
        }

    } catch (e) {
        console.error(`   ❌ Summary request failed: ${e.message}\n`);
    }
}

testAuthenticatedMockFlow();
