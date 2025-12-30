// verify_dashboard_summary.js
// Test dashboard summary endpoint returns real data only

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_USER_KEY = "test-dashboard-" + Date.now();

async function testDashboardSummary() {
    console.log("=== Dashboard Summary Verification ===\n");

    try {
        // 1. Check new user (should have zeros/nulls)
        console.log("1. Checking new user dashboard (should be empty)...");
        let response = await fetch(`${BASE_URL}/api/dashboard/summary?userKey=${TEST_USER_KEY}`);
        let data = await response.json();
        console.log("   Response:", data);

        if (data.total_practice_sessions !== 0 || data.total_mock_interviews !== 0 || data.last_mock_interview !== null) {
            throw new Error("New user should have: total_practice_sessions=0, total_mock_interviews=0, last_mock_interview=null");
        }
        console.log("   ✅ New user dashboard is empty (no fake data)\n");

        // 2. Create a practice session
        console.log("2. Creating practice session...");
        response = await fetch(`${BASE_URL}/api/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userKey: TEST_USER_KEY,
                transcript: "Test answer for dashboard verification",
                aiResponse: "Test feedback",
                score: 80,
            }),
        });
        const session = await response.json();
        console.log("   Session created:", session.id);
        console.log("   ✅ Practice session created\n");

        // 3. Check dashboard after practice session
        console.log("3. Checking dashboard after practice session...");
        response = await fetch(`${BASE_URL}/api/dashboard/summary?userKey=${TEST_USER_KEY}`);
        data = await response.json();
        console.log("   Response:", data);

        if (data.total_practice_sessions !== 1) {
            throw new Error("Should have 1 practice session");
        }
        console.log("   ✅ Practice session counted correctly\n");

        // 4. Complete a mock interview
        console.log("4. Completing mock interview...");
        response = await fetch(`${BASE_URL}/api/mock-interview/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userKey: TEST_USER_KEY, interviewType: "short" }),
        });

        response = await fetch(`${BASE_URL}/api/mock-interview/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userKey: TEST_USER_KEY,
                interviewType: "short",
                overallScore: 85,
            }),
        });
        const interview = await response.json();
        console.log("   Interview completed:", interview.id);
        console.log("   ✅ Mock interview completed\n");

        // 5. Check dashboard after mock interview
        console.log("5. Checking dashboard after mock interview...");
        response = await fetch(`${BASE_URL}/api/dashboard/summary?userKey=${TEST_USER_KEY}`);
        data = await response.json();
        console.log("   Response:", JSON.stringify(data, null, 2));

        if (data.total_mock_interviews !== 1) {
            throw new Error("Should have 1 mock interview");
        }

        if (!data.last_mock_interview) {
            throw new Error("Should have last_mock_interview data");
        }

        if (data.last_mock_interview.type !== "short") {
            throw new Error("Last mock interview type should be 'short'");
        }

        if (data.last_mock_interview.score !== 85) {
            throw new Error("Last mock interview score should be 85");
        }

        if (data.last_mock_interview.hiring_recommendation !== "strong_recommend") {
            throw new Error("Last mock interview recommendation should be 'strong_recommend'");
        }

        if (!data.last_mock_interview.completed_at) {
            throw new Error("Last mock interview should have completed_at timestamp");
        }

        console.log("   ✅ Mock interview data correct\n");

        // 6. Verify structure
        console.log("6. Verifying response structure...");
        const requiredFields = ['total_practice_sessions', 'total_mock_interviews', 'last_mock_interview'];
        for (const field of requiredFields) {
            if (!(field in data)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        if (data.last_mock_interview) {
            const mockFields = ['type', 'score', 'hiring_recommendation', 'completed_at'];
            for (const field of mockFields) {
                if (!(field in data.last_mock_interview)) {
                    throw new Error(`Missing required field in last_mock_interview: ${field}`);
                }
            }
        }

        console.log("   ✅ Response structure correct\n");

        console.log("✅ ALL TESTS PASSED\n");
        return true;
    } catch (error) {
        console.error("❌ TEST FAILED:", error.message);
        console.error(error.stack);
        return false;
    }
}

testDashboardSummary().then(success => {
    process.exit(success ? 0 : 1);
});
