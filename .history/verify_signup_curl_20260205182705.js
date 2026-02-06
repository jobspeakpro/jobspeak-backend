import fetch from 'node-fetch';

const email = `qa+${Math.floor(Date.now() / 1000)}@example.com`;
const payload = {
    email: email,
    password: "TestPassword123!",
    firstName: "QA",
    inviteCode: "JSP2026!"
};

console.log("Testing Signup Endpoint...");
console.log("Target: https://jobspeakpro.com/api/auth/signup");
console.log("Payload:", JSON.stringify(payload, null, 2));

async function run() {
    try {
        const res = await fetch('https://jobspeakpro.com/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log(`HTTP Status: ${res.status}`);
        const text = await res.text();
        console.log("Raw Response Body:");
        console.log(text);

        try {
            const json = JSON.parse(text);
            if (json.ok && json.actionLink) {
                console.log("✅ SUCCESS: JSON valid and actionLink present.");
            } else {
                console.log("❌ FAILURE: JSON missing ok:true or actionLink.");
            }
        } catch (e) {
            console.log("❌ FAILURE: Response is not JSON.");
        }

    } catch (err) {
        console.error("Fetch failed:", err);
    }
}

run();
