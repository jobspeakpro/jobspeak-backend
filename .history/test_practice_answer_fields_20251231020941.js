// Test practice answer endpoint with required UI fields
const BASE_URL = 'http://127.0.0.1:3000';

async function testPracticeAnswer() {
    console.log('Testing POST /api/practice/answer...\n');

    const payload = {
        userKey: `guest-${Date.now()}`,
        sessionId: `practice-test-${Date.now()}`,
        questionId: 'test-q1',
        questionText: 'Tell me about a time you solved a difficult problem.',
        answerText: 'In my previous role, we had a critical bug affecting 50% of users. I analyzed the logs, identified a race condition in our caching layer, and implemented a fix using distributed locks. This reduced errors by 95% and improved response time by 30%.'
    };

    const res = await fetch(`${BASE_URL}/api/practice/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await res.json();

    console.log('Status:', res.status);
    console.log('\nResponse:');
    console.log(JSON.stringify(data, null, 2));

    // Verify required fields
    const requiredFields = ['score', 'whatWorked', 'improveNext', 'interpretation', 'vocabulary', 'clearerRewrite'];
    const missingFields = requiredFields.filter(field => !(field in data));

    if (missingFields.length > 0) {
        console.log('\n❌ Missing fields:', missingFields);
    } else {
        console.log('\n✅ All required fields present');
    }
}

testPracticeAnswer();
