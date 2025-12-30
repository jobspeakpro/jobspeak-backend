// Test usage endpoint for new users
import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:3000';

async function testUsage() {
    console.log("🧪 Testing Usage Endpoint...\n");

    // Test 1: New user should start at 0/3
    console.log("--- 1. New User (test-new-user-789) ---");
    try {
        const res = await fetch(`${BASE_URL}/api/usage/today?userKey=test-new-user-789`);
        const json = await res.json();
        console.log("Response:", JSON.stringify(json, null, 2));

        if (json.usage && json.usage.used === 0 && json.usage.limit === 3 && json.usage.remaining === 3) {
            console.log("✅ New user correctly starts at 0/3");
        } else {
            console.error("❌ Unexpected usage values:", json);
        }
    } catch (e) {
        console.error("Test 1 Failed:", e.message);
    }

    // Test 2: Another new user
    console.log("\n--- 2. Another New User (test-user-abc-123) ---");
    try {
        const res = await fetch(`${BASE_URL}/api/usage/today?userKey=test-user-abc-123`);
        const json = await res.json();
        console.log("Response:", JSON.stringify(json, null, 2));

        if (json.usage && json.usage.used === 0 && json.usage.limit === 3) {
            console.log("✅ Second new user also starts at 0/3");
        } else {
            console.error("❌ Unexpected usage values:", json);
        }
    } catch (e) {
        console.error("Test 2 Failed:", e.message);
    }

    // Test 3: Empty input calibration
    console.log("\n--- 3. Calibration with Empty Input ---");
    try {
        const res = await fetch(`${BASE_URL}/ai/calibrate-difficulty`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
        });
        const json = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", JSON.stringify(json, null, 2));

        if (res.status === 200 && json.recommended === "normal" && json.reason.includes("Not enough signal")) {
            console.log("✅ Empty calibration returns 200 with default");
        } else {
            console.error("❌ Unexpected response");
        }
    } catch (e) {
        console.error("Test 3 Failed:", e.message);
    }
}

testUsage();
