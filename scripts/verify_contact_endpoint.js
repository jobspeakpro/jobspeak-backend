
import fetch from 'node-fetch';

async function verifyEndpoint() {
    console.log("Verifying /api/support/contact endpoint...");

    const payload = {
        name: "Test User",
        email: "test@example.com",
        subject: "Endpoint Verification",
        message: "This is a test message from the verification script."
    };

    try {
        const response = await fetch('http://127.0.0.1:8080/api/support/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Response:", JSON.stringify(data, null, 2));

        if (response.ok && data.success) {
            console.log("✅ Endpoint verification successful!");
        } else {
            console.error("❌ Endpoint verification failed.");
        }

    } catch (error) {
        console.error("Request failed:", error.message);
    }
}

// Wait for server to start
setTimeout(verifyEndpoint, 2000);
