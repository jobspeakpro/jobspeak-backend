import dotenv from 'dotenv';
dotenv.config();

async function testEndpoint() {
    try {
        const response = await fetch('https://jobspeakpro.com/api/profile/heard-about', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userKey: 'test-user-id',
                value: 'TikTok'
            })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (response.status === 404) {
            console.log('\n❌ Endpoint not deployed yet');
            process.exit(1);
        } else {
            console.log('\n✅ Endpoint is live!');
            process.exit(0);
        }
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

testEndpoint();
