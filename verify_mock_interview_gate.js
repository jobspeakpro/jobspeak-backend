// verify_mock_interview_gate.js
// Test mock interview one-time gate logic

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_USER_KEY = "test-mock-" + Date.now();

async function testMockInterviewGate() {
    console.log("=== Mock Interview Gate Verification ===\n");

    try {
        // 1. Check initial status (should be allowed, not used)
        console.log("1. Checking initial status...");
        let response = await fetch(`${BASE_URL}/api/mock-interview/status?userKey=${TEST_USER_KEY}`);
        let data = await response.json();
        console.log("   Status:", data);

        if (data.used !== false || data.allowed !== true) {
            throw new Error("Initial status should be: used=false, allowed=true");
        }
        console.log("   ✅ Initial status correct\n");

        // 2. Start mock interview (should succeed - free attempt)
        console.log("2. Starting mock interview (free attempt)...");
        response = await fetch(`${BASE_URL}/api/mock-interview/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userKey: TEST_USER_KEY, interviewType: "short" }),
        });
        data = await response.json();
        console.log("   Response:", data);

        if (!data.allowed || data.reason !== "free_attempt") {
            throw new Error("First start should be allowed with reason 'free_attempt'");
        }
        console.log("   ✅ Free attempt started\n");

        // 3. Check status after starting (should be used=true, allowed=false)
        console.log("3. Checking status after first attempt...");
        response = await fetch(`${BASE_URL}/api/mock-interview/status?userKey=${TEST_USER_KEY}`);
        data = await response.json();
        console.log("   Status:", data);

        if (data.used !== true || data.allowed !== false) {
            throw new Error("After first attempt: used=true, allowed=false");
        }
        console.log("   ✅ Status updated correctly\n");

        // 4. Try to start again (should fail with 403)
        console.log("4. Trying to start again (should fail)...");
        response = await fetch(`${BASE_URL}/api/mock-interview/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userKey: TEST_USER_KEY, interviewType: "long" }),
        });
        data = await response.json();
        console.log("   Response:", data);
        console.log("   Status:", response.status);

        if (response.status !== 403 || !data.upgrade) {
            throw new Error("Second attempt should return 403 with upgrade=true");
        }
        console.log("   ✅ Second attempt blocked correctly\n");

        // 5. Complete mock interview
        console.log("5. Completing mock interview...");
        response = await fetch(`${BASE_URL}/api/mock-interview/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userKey: TEST_USER_KEY,
                interviewType: "short",
                overallScore: 75
            }),
        });
        data = await response.json();
        console.log("   Response:", data);

        if (!data.id || data.hiring_recommendation !== "recommend_with_reservations") {
            throw new Error("Complete should save interview with correct recommendation");
        }
        console.log("   ✅ Interview completed and saved\n");

        // 6. Test hiring recommendation mapping
        console.log("6. Testing hiring recommendation mapping...");

        // Test score >= 80
        response = await fetch(`${BASE_URL}/api/mock-interview/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userKey: TEST_USER_KEY,
                interviewType: "long",
                overallScore: 85
            }),
        });
        data = await response.json();
        if (data.hiring_recommendation !== "strong_recommend") {
            throw new Error("Score 85 should map to 'strong_recommend'");
        }

        // Test score < 60
        response = await fetch(`${BASE_URL}/api/mock-interview/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userKey: TEST_USER_KEY,
                interviewType: "short",
                overallScore: 45
            }),
        });
        data = await response.json();
        if (data.hiring_recommendation !== "not_recommended_yet") {
            throw new Error("Score 45 should map to 'not_recommended_yet'");
        }

        console.log("   ✅ Hiring recommendations correct\n");

        console.log("✅ ALL TESTS PASSED\n");
        return true;
    } catch (error) {
        console.error("❌ TEST FAILED:", error.message);
        console.error(error.stack);
        return false;
    }
}

testMockInterviewGate().then(success => {
    process.exit(success ? 0 : 1);
});
