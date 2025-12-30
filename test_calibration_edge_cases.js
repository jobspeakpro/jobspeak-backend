// Test calibration endpoint edge cases
import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:3000';

async function testCalibrationEdgeCases() {
    console.log("🧪 Testing Calibration Edge Cases...\n");

    // Test 1: Empty body
    console.log("--- 1. Empty Body ---");
    try {
        const res = await fetch(`${BASE_URL}/ai/calibrate-difficulty`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
        });
        const json = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", JSON.stringify(json, null, 2));

        if (res.status === 200 && json.recommended && json.reason) {
            console.log("✅ Empty body returns valid JSON");
        } else {
            console.error("❌ Unexpected response");
        }
    } catch (e) {
        console.error("❌ Test 1 Failed:", e.message);
    }

    // Test 2: Malformed JSON (this will be caught by express.json middleware)
    console.log("\n--- 2. Malformed JSON ---");
    try {
        const res = await fetch(`${BASE_URL}/ai/calibrate-difficulty`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{invalid json"
        });

        // Check if response is JSON
        const contentType = res.headers.get("content-type");
        console.log("Status:", res.status);
        console.log("Content-Type:", contentType);

        if (contentType && contentType.includes("application/json")) {
            const json = await res.json();
            console.log("Response:", JSON.stringify(json, null, 2));
            console.log("✅ Malformed JSON returns JSON response (not HTML)");
        } else {
            const text = await res.text();
            console.error("❌ Response is not JSON:", text.substring(0, 200));
        }
    } catch (e) {
        console.error("Test 2 error:", e.message);
    }

    // Test 3: Missing fields
    console.log("\n--- 3. Missing Fields ---");
    try {
        const res = await fetch(`${BASE_URL}/ai/calibrate-difficulty`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_title: "Engineer" }) // No answer field
        });
        const json = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", JSON.stringify(json, null, 2));

        if (res.status === 200 && json.recommended && json.reason) {
            console.log("✅ Missing fields returns valid JSON with default");
        } else {
            console.error("❌ Unexpected response");
        }
    } catch (e) {
        console.error("❌ Test 3 Failed:", e.message);
    }

    // Test 4: Valid answer
    console.log("\n--- 4. Valid Answer ---");
    try {
        const res = await fetch(`${BASE_URL}/ai/calibrate-difficulty`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                answer: "I led a team of 5 engineers to migrate our legacy system to microservices, reducing deployment time by 60% and improving system reliability from 95% to 99.9% uptime."
            })
        });
        const json = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", JSON.stringify(json, null, 2));

        if (res.status === 200 && json.recommended && json.reason) {
            console.log("✅ Valid answer returns proper analysis");
        } else {
            console.error("❌ Unexpected response");
        }
    } catch (e) {
        console.error("❌ Test 4 Failed:", e.message);
    }

    // Test 5: No Content-Type header
    console.log("\n--- 5. No Content-Type Header ---");
    try {
        const res = await fetch(`${BASE_URL}/ai/calibrate-difficulty`, {
            method: "POST",
            body: JSON.stringify({ answer: "test" })
        });

        const contentType = res.headers.get("content-type");
        console.log("Status:", res.status);
        console.log("Response Content-Type:", contentType);

        if (contentType && contentType.includes("application/json")) {
            const json = await res.json();
            console.log("Response:", JSON.stringify(json, null, 2));
            console.log("✅ No Content-Type still returns JSON");
        } else {
            console.error("❌ Response is not JSON");
        }
    } catch (e) {
        console.error("Test 5 error:", e.message);
    }

    console.log("\n✅ All edge case tests completed!");
}

testCalibrationEdgeCases();
