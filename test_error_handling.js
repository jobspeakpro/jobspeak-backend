import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';

async function testErrorHandling() {
    console.log("═══════════════════════════════════════════════════════");
    console.log("  ERROR HANDLING TESTS");
    console.log("═══════════════════════════════════════════════════════\n");

    // Test 1: Missing sessionId in /answer
    console.log("TEST 1: POST /mock-interview/answer without sessionId");
    try {
        const res = await fetch(`${BASE_URL}/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                questionId: 'test-q1',
                questionText: 'Test question',
                answerText: 'Test answer'
            })
        });
        const data = await res.json();
        console.log(`   Status: ${res.status}`);
        console.log(`   Response:`, JSON.stringify(data, null, 2));
        console.log();
    } catch (e) {
        console.error(`   ❌ Error: ${e.message}\n`);
    }

    // Test 2: Missing sessionId in /summary
    console.log("TEST 2: GET /mock-interview/summary without sessionId");
    try {
        const res = await fetch(`${BASE_URL}/mock-interview/summary`);
        const data = await res.json();
        console.log(`   Status: ${res.status}`);
        console.log(`   Response:`, JSON.stringify(data, null, 2));
        console.log();
    } catch (e) {
        console.error(`   ❌ Error: ${e.message}\n`);
    }

    // Test 3: Valid sessionId with 0 attempts
    console.log("TEST 3: GET /mock-interview/summary with valid sessionId (no attempts)");
    try {
        const res = await fetch(`${BASE_URL}/mock-interview/summary?sessionId=session-empty-test-123`);
        const data = await res.json();
        console.log(`   Status: ${res.status}`);
        console.log(`   Response:`, JSON.stringify(data, null, 2));
        console.log();
    } catch (e) {
        console.error(`   ❌ Error: ${e.message}\n`);
    }

    console.log("═══════════════════════════════════════════════════════");
    console.log("  TESTS COMPLETE");
    console.log("═══════════════════════════════════════════════════════");
}

testErrorHandling();
