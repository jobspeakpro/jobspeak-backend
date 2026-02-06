import fetch from 'node-fetch';

const email = `qa+${Date.now()}@example.com`;
const payload = {
    email: email,
    password: "TestPassword123!",
    firstName: "QA",
    inviteCode: "JSP2026!"
};

console.log("Starting verification...");

fetch("https://jobspeakpro.com/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
}).then(async r => {
    let json;
    try {
        json = await r.json();
    } catch {
        json = { notJson: true };
    }

    console.log("STATUS", r.status);
    console.log("X-Origin", r.headers.get("X-Origin"));
    console.log("BODY", JSON.stringify(json, null, 2));

    if (r.status === 200 && json.ok === true && json.actionLink) {
        console.log("✅ PASS: Signup sequence verified.");
        console.log("Action Link:", json.actionLink);
    } else {
        console.log("❌ FAIL: Response did not meet strict criteria.");
    }

}).catch(err => {
    console.error("Fetch failed:", err);
});
