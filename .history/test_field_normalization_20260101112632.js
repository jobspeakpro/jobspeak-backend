// Test script to verify the backend hotfix accepts both camelCase and snake_case
// Run with: node test_field_normalization.js

const BASE_URL = 'http://localhost:3000';

async function testCamelCaseFields() {
    console.log('\n=== TEST 1: camelCase fields (JSON) ===');

    const sessionId = 'test-session-' + Date.now();

    try {
        const res = await fetch(`${BASE_URL}/api/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: sessionId,
                questionId: 'q1',
                questionText: 'Tell me about yourself',
                answerText: 'I am a software engineer with 5 years of experience.',
                userKey: 'test-user',
                interviewType: 'short'
            })
        });

        console.log('Response status:', res.status);
        const data = await res.json();

        if (res.status === 200) {
            console.log('✅ PASS: camelCase fields accepted');
        } else {
            console.log('❌ FAIL:', data.error);
            console.log('Missing:', data.missing);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function testSnakeCaseFields() {
    console.log('\n=== TEST 2: snake_case fields (FormData) ===');

    const sessionId = 'test-session-' + Date.now();

    try {
        const res = await fetch(`${BASE_URL}/api/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                question_id: 'q2',
                question_text: 'What are your strengths?',
                answer_text: 'My strengths include problem solving and communication.',
                user_key: 'test-user',
                interview_type: 'short'
            })
        });

        console.log('Response status:', res.status);
        const data = await res.json();

        if (res.status === 200) {
            console.log('✅ PASS: snake_case fields accepted');
        } else {
            console.log('❌ FAIL:', data.error);
            console.log('Missing:', data.missing);
            console.log('Received keys:', data.receivedKeys);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function testMixedFields() {
    console.log('\n=== TEST 3: Mixed camelCase and snake_case ===');

    const sessionId = 'test-session-' + Date.now();

    try {
        const res = await fetch(`${BASE_URL}/api/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,  // snake_case
                questionId: 'q3',        // camelCase
                question_text: 'Why should we hire you?',  // snake_case
                answerText: 'You should hire me because I bring unique value.',  // camelCase
                user_key: 'test-user',
                interviewType: 'short'
            })
        });

        console.log('Response status:', res.status);
        const data = await res.json();

        if (res.status === 200) {
            console.log('✅ PASS: Mixed fields accepted');
        } else {
            console.log('❌ FAIL:', data.error);
            console.log('Missing:', data.missing);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function testMissingFields() {
    console.log('\n=== TEST 4: Missing required fields ===');

    try {
        const res = await fetch(`${BASE_URL}/api/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                questionText: 'Test question',
                answerText: 'Test answer'
                // Missing sessionId and questionId
            })
        });

        console.log('Response status:', res.status);
        const data = await res.json();

        if (res.status === 400 && data.missing.includes('sessionId') && data.missing.includes('questionId')) {
            console.log('✅ PASS: Validation correctly rejects missing fields');
            console.log('Received keys:', data.receivedKeys);
        } else {
            console.log('❌ FAIL: Should have returned 400 with missing fields');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function runTests() {
    console.log('Starting field normalization tests...');
    await testCamelCaseFields();
    await testSnakeCaseFields();
    await testMixedFields();
    await testMissingFields();
    console.log('\n=== Tests complete ===');
}

runTests();
