// Test production health after better-sqlite3 fix
const HEALTH_URL = 'https://jobspeakpro.com/health';
const PRACTICE_URL = 'https://jobspeakpro.com/api/practice/answer';

async function testProductionHealth() {
    console.log('='.repeat(80));
    console.log('PRODUCTION HEALTH CHECK');
    console.log('='.repeat(80));

    // Test 1: Health endpoint
    console.log('\n1. Testing /health endpoint...');
    try {
        const healthRes = await fetch(HEALTH_URL);
        const healthData = await healthRes.json();

        console.log(`   Status: ${healthRes.status}`);
        console.log(`   Response:`, JSON.stringify(healthData, null, 2));

        if (healthRes.status === 200) {
            console.log('   ✅ Health check PASSED');
        } else {
            console.log(`   ❌ Health check FAILED (expected 200, got ${healthRes.status})`);
        }
    } catch (error) {
        console.log(`   ❌ Health check ERROR: ${error.message}`);
    }

    // Test 2: Practice answer endpoint
    console.log('\n2. Testing /api/practice/answer endpoint...');
    const testKey = `test-health-${Date.now()}`;

    try {
        const practiceRes = await fetch(PRACTICE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-key': testKey
            },
            body: JSON.stringify({
                sessionId: `health-session-${Date.now()}`,
                questionId: 'health-q1',
                questionText: 'Tell me about yourself.',
                answerText: 'I am a software engineer with experience in web development.'
            })
        });

        const practiceData = await practiceRes.json();

        console.log(`   Status: ${practiceRes.status}`);

        if (practiceRes.status === 200) {
            console.log('   ✅ Practice endpoint PASSED');
            console.log(`   Debug field present: ${!!practiceData.debug}`);
            if (practiceData.debug) {
                console.log(`   Identity: ${practiceData.debug.identityKey}`);
                console.log(`   Source: ${practiceData.debug.identitySource}`);
                console.log(`   Usage: ${practiceData.debug.used}/${practiceData.debug.limit}`);
            }
        } else {
            console.log(`   ❌ Practice endpoint FAILED (expected 200, got ${practiceRes.status})`);
            console.log(`   Response:`, JSON.stringify(practiceData, null, 2));
        }
    } catch (error) {
        console.log(`   ❌ Practice endpoint ERROR: ${error.message}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('HEALTH CHECK COMPLETE');
    console.log('='.repeat(80));
}

testProductionHealth().catch(console.error);
