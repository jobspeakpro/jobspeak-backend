
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
    console.error("ADMIN_TOKEN is missing in .env");
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("1. Checking Admin Endpoint (Initial)...");
    const adminUrl = `${BASE_URL}/api/__admin/affiliate-applications/latest`;

    // Check if endpoint exists and works
    try {
        const adminRes = await fetch(adminUrl, {
            headers: { 'x-admin-token': ADMIN_TOKEN }
        });

        if (adminRes.status === 404) {
            console.error("Admin endpoint not found (404). Is the server running with latest code?");
            // Don't exit, might be just not deployed yet, but we are verifying local?
        } else if (adminRes.status === 403) {
            console.error("Admin endpoint returned 403 Forbidden. Check ADMIN_TOKEN.");
            return;
        }

        const adminData = await adminRes.json();
        console.log("Admin Endpoint Response:", JSON.stringify(adminData, null, 2));
    } catch (e) {
        console.error("Failed to call admin endpoint:", e.message);
    }

    console.log("\n2. Submitting Application...");
    const applyUrl = `${BASE_URL}/api/affiliate/apply`;
    const payload = {
        name: "Silver Verifier",
        email: "silver.verifier@example.com",
        country: "TestLand",
        primaryPlatform: "YouTube",
        audienceSize: "10k-50k",
        payoutPreference: "paypal",
        payoutDetails: "silver.verifier@example.com"
    };

    try {
        const applyRes = await fetch(applyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const applyData = await applyRes.json();
        console.log("Apply Response:", applyRes.status, JSON.stringify(applyData, null, 2));

        if (applyRes.status === 200 && applyData.success) {
            console.log("Application submitted successfully.");

            // Wait a moment for DB update (async notification? No, it's awaited in the route)

            console.log("\n3. Verifying Status via Admin Endpoint...");
            const verifyRes = await fetch(adminUrl, {
                headers: { 'x-admin-token': ADMIN_TOKEN }
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success && verifyData.applications) {
                const app = verifyData.applications.find(a => a.id === applyData.applicationId);
                if (app) {
                    console.log("Found Application in DB:");
                    console.log(`- ID: ${app.id}`);
                    console.log(`- Notify Status: ${app._notify_status}`);
                    console.log(`- Notify Time: ${app._notify_time}`);
                    console.log(`- Notify Error: ${app._notify_error}`);
                    console.log(`- Raw Payout Details: ${app.payout_details}`);
                } else {
                    console.error("Newly created application not found in list!");
                }
            }
        }
    } catch (e) {
        console.error("Error during submission:", e.message);
    }
}

run();
