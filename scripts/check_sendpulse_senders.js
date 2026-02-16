import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const CLIENT_ID = process.env.SENDPULSE_ID || 'c40eb82a53dd48e8c4b7880eae86690d';
const CLIENT_SECRET = process.env.SENDPULSE_SECRET || 'b021c05abcd3708e967fc7ce95db4dc0';

async function listSenders() {
    console.log("Authenticating...");
    const authRes = await fetch('https://api.sendpulse.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        })
    });
    const authData = await authRes.json();
    if (!authData.access_token) {
        console.error("Auth failed:", authData);
        return;
    }
    const token = authData.access_token;
    console.log("Token received.");

    // Try to list senders (SMTP API)
    console.log("Fetching senders...");
    // Endpoint assumption: /smtp/senders
    const res = await fetch('https://api.sendpulse.com/smtp/senders', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
        const data = await res.json();
        console.log("Senders Data:", JSON.stringify(data, null, 2));
    } else {
        console.error("Failed to fetch senders. Status:", res.status);
        const err = await res.text();
        console.error("Error:", err);
    }
}

listSenders();
