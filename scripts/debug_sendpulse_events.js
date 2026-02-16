
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const SENDPULSE_ID = process.env.SENDPULSE_ID;
const SENDPULSE_SECRET = process.env.SENDPULSE_SECRET;

async function getToken() {
    const response = await fetch('https://api.sendpulse.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: SENDPULSE_ID,
            client_secret: SENDPULSE_SECRET,
        })
    });
    const data = await response.json();
    return data.access_token;
}

async function listEvents() {
    try {
        const token = await getToken();
        console.log("Got Token.");


        // Correct endpoint for listing events - trying 'https://events.sendpulse.com/events' again but checking docs results
        // Actually, the structure might be different. 
        // Let's try to get a single event status if listing fails, or check the URL.
        // Docs say: GET /events
        const response = await fetch('https://events.sendpulse.com/events', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        console.log("Events List:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

listEvents();
