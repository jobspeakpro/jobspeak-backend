import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';

async function testMockFlow() {
    console.log("=== Testing Mock Interview Persistence ===\n");

    const userKey = `test-user-${Date.now()}`;
    let sessionId = null;

    // 1. Start Session
    console.log("1. Starting Session...");
    try {
        const startRes = await fetch(`${BASE_URL}/mock-interview/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userKey, interviewType: 'short' })
        });
        const startData = await startRes.json();
        console.log("   Start Response:", startData);
    } catch (e) {
        console.error("   Start Failed:", e.message);
    }

    // 2. Get Questions (to get a valid sessionId or generate one)
    console.log("\n2. Getting Questions...");
    try {
        const qRes = await fetch(`${BASE_URL}/mock-interview/questions?userKey=${userKey}&type=short`);
        const qData = await qRes.json();
        sessionId = qData.sessionId;
        console.log("   Session ID:", sessionId);

        if (!sessionId) {
            console.error("FAIL: No sessionId returned");
            process.exit(1);
        }
    } catch (e) {
        console.error("   Get Questions Failed:", e.message);
    }

    // 3. Submit Answer
    console.log("\n3. Submitting Answer...");
    const answerPayload = {
        userKey,
        sessionId,
        questionId: "test-q-1",
        questionText: "Tell me about a time you failed.",
        answerText: "I was working on a project and I missed the deadline. I communicated the issue and took steps to fix it.",
        audioUrl: "/fake/audio.mp3"
    };

    try {
        const ansRes = await fetch(`${BASE_URL}/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(answerPayload)
        });
        const ansData = await ansRes.json();
        console.log("   Answer Response:", ansData);

        if (!ansData.success) {
            console.error("FAIL: Answer submission reported failure");
        }
    } catch (e) {
        console.error("   Submit Answer Failed:", e.message);
    }

    // 4. Get Summary
    console.log("\n4. Fetching Summary...");
    try {
        const sumRes = await fetch(`${BASE_URL}/mock-interview/summary?sessionId=${sessionId}`);
        const sumData = await sumRes.json();
        console.log("   Summary Response:", JSON.stringify(sumData, null, 2));

        if (sumData.attemptCount > 0) {
            console.log("\n✅ PASS: Summary shows Persistence (attemptCount > 0)");
            console.log(`   Overall Score: ${sumData.overall_score}`);
        } else {
            console.error("\n❌ FAIL: Persistence Broken (attemptCount = 0)");
        }

    } catch (e) {
        console.error("   Fetch Summary Failed:", e.message);
    }
}

testMockFlow();
