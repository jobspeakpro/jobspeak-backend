// Test malformed JSON specifically
import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:3000';

async function testMalformedJSON() {
    console.log("🧪 Testing Malformed JSON Handling...\n");

    console.log("--- Malformed JSON Test ---");
    try {
        const res = await fetch(`${BASE_URL}/ai/calibrate-difficulty`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{invalid json"
        });

        const contentType = res.headers.get("content-type");
        console.log("Status:", res.status);
        console.log("Content-Type:", contentType);

        if (contentType && contentType.includes("application/json")) {
            const json = await res.json();
            console.log("Response:", JSON.stringify(json, null, 2));

            if (res.status === 200 && json.recommended === "normal") {
                console.log("✅ Malformed JSON returns 200 with default response");
            } else if (res.status === 400) {
                console.log("⚠️  Malformed JSON returns 400 (but still JSON, not HTML)");
            }
        } else {
            const text = await res.text();
            console.error("❌ Response is not JSON (HTML?):", text.substring(0, 200));
        }
    } catch (e) {
        console.error("❌ Test Failed:", e.message);
    }
}

testMalformedJSON();
