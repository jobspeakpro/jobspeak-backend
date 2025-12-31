// test_mock_interview_questions.js
// Quick test for mock interview questions endpoint

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testMockInterviewQuestions() {
    console.log('=== Mock Interview Questions Endpoint Test ===\n');
    console.log(`Testing against: ${BASE_URL}\n`);

    // Test 1: Health check
    console.log('1. Testing GET /health...');
    try {
        const res = await fetch(`${BASE_URL}/health`);
        const data = await res.json();
        console.log(`   ✅ ${res.status} - ${data.service}\n`);
    } catch (err) {
        console.error(`   ❌ Error: ${err.message}\n`);
    }

    // Test 2: Short mock interview questions
    console.log('2. Testing GET /api/mock-interview/questions?type=short...');
    try {
        const res = await fetch(`${BASE_URL}/api/mock-interview/questions?userKey=test-user&type=short`);

        if (res.status === 404) {
            console.error('   ❌ 404 Not Found - Route not registered or server not restarted');
            console.log('   Server needs restart to load new routes\n');
            return;
        }

        const data = await res.json();

        console.log(`   ✅ ${res.status} OK`);
        console.log(`   ✅ Interviewer: ${data.interviewer?.name}`);
        console.log(`   ✅ Questions: ${data.questions?.length}`);

        if (data.questions && data.questions.length > 0) {
            const q = data.questions[0];
            console.log(`   ✅ Sample question:`);
            console.log(`      - ID: ${q.id}`);
            console.log(`      - Category: ${q.category}`);
            console.log(`      - Difficulty: ${q.difficulty}`);
            console.log(`      - Text: "${q.text?.substring(0, 50)}..."`);
            console.log(`      - Has hint: ${q.hint ? 'Yes' : 'No'}`);
        }

        console.log();
    } catch (err) {
        console.error(`   ❌ Error: ${err.message}\n`);
    }

    // Test 3: Long mock interview questions
    console.log('3. Testing GET /api/mock-interview/questions?type=long...');
    try {
        const res = await fetch(`${BASE_URL}/api/mock-interview/questions?userKey=test-user&type=long`);
        const data = await res.json();

        console.log(`   ✅ ${res.status} OK`);
        console.log(`   ✅ Questions: ${data.questions?.length}`);
        console.log();
    } catch (err) {
        console.error(`   ❌ Error: ${err.message}\n`);
    }

    console.log('=== Test Complete ===');
}

testMockInterviewQuestions().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
