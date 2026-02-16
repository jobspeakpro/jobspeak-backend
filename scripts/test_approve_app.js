
import fetch from 'node-fetch';

async function approveApp() {
    const appId = '2af4e689-c02d-4452-8686-74f97afe2c31';
    const url = `http://localhost:3000/api/admin/affiliates/${appId}/approve`;

    console.log(`Approving application ${appId}...`);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Response:", JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("Failed:", error);
    }
}

approveApp();
