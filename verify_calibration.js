
import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';

const BASE_URL = 'http://127.0.0.1:3000';

async function testCalibration() {
    console.log("🚀 Testing Calibration Endpoint...");

    // 1. JSON Payload (Original)
    console.log("\n--- 1. JSON Payload ---");
    try {
        const res = await fetch(`${BASE_URL}/ai/calibrate-difficulty`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                answer: "I used the STAR method to solve the problem efficiently.",
                job_title: "Engineer"
            })
        });
        const json = await res.json();
        console.log("JSON Response:", json);
        if (json.recommended && json.reason) console.log("✅ JSON format correct");
        else console.error("❌ JSON format mismatch", json);
    } catch (e) {
        console.error("JSON Test Failed:", e.message);
    }

    // 2. Multipart with Text field ('answer')
    console.log("\n--- 2. Multipart Text (answer) ---");
    try {
        const form = new FormData();
        form.append("answer", "I acted as a team lead and delegated tasks.");
        form.append("job_title", "Manager");

        const res = await fetch(`${BASE_URL}/ai/calibrate-difficulty`, {
            method: "POST",
            body: form
        });
        const json = await res.json();
        console.log("Multipart(answer) Response:", json);
        if (json.recommended) console.log("✅ Multipart text worked");
    } catch (e) {
        console.error("Multipart Text Failed:", e.message);
    }

    // 3. Multipart with Missing Audio/Text (Expect 200 with default)
    console.log("\n--- 3. Missing Inputs (Expect 200 with default) ---");
    try {
        const form = new FormData();
        form.append("job_title", "Ghost");

        const res = await fetch(`${BASE_URL}/ai/calibrate-difficulty`, {
            method: "POST",
            body: form
        });
        const json = await res.json();
        console.log("Status:", res.status); // Expect 200
        console.log("Response:", json);
        if (res.status === 200 && json.recommended === "normal" && json.reason.includes("Not enough signal")) {
            console.log("✅ Correctly returned default response for missing input");
        } else {
            console.error("❌ Unexpected response:", json);
        }
    } catch (e) {
        console.error("Missing Input Test Failed:", e.message);
    }
}

testCalibration();
