// test_critical_endpoints.js
// Verify critical endpoints exist and return correct responses

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER_KEY = `test-endpoints-${Date.now()}`;

async function testCriticalEndpoints() {
    console.log('=== Critical Endpoints Verification ===\n');
    console.log(`Testing against: ${BASE_URL}\n`);

    let passed = 0;
    let failed = 0;

    // Test 1: GET /api/progress/summary
    console.log('1. Testing GET /api/progress/summary...');
    try {
        const res = await fetch(`${BASE_URL}/api/progress/summary?userKey=${TEST_USER_KEY}`);

        if (res.status === 404) {
            console.error('   ❌ 404 Not Found - Route not registered');
            failed++;
        } else if (res.status !== 200) {
            console.error(`   ❌ Unexpected status: ${res.status}`);
            failed++;
        } else {
            const data = await res.json();
            const hasRequiredFields =
                typeof data.total_practice_sessions === 'number' &&
                typeof data.days_practiced === 'number' &&
                typeof data.current_streak_days === 'number' &&
                Array.isArray(data.recent_practice) &&
                typeof data.weekly_minutes === 'number';

            if (!hasRequiredFields) {
                console.error('   ❌ Missing required fields in response');
                console.log('   Response:', data);
                failed++;
            } else {
                console.log('   ✅ 200 OK');
                console.log(`   ✅ Response: ${JSON.stringify(data)}`);
                passed++;
            }
        }
    } catch (err) {
        console.error('   ❌ Error:', err.message);
        failed++;
    }

    // Test 2: GET /api/daily-reflection
    console.log('\n2. Testing GET /api/daily-reflection...');
    try {
        const res = await fetch(`${BASE_URL}/api/daily-reflection`);

        if (res.status === 404) {
            console.error('   ❌ 404 Not Found - Route not registered');
            failed++;
        } else if (res.status !== 200) {
            console.error(`   ❌ Unexpected status: ${res.status}`);
            failed++;
        } else {
            const data = await res.json();
            if (!data.reflection || !data.date) {
                console.error('   ❌ Missing reflection or date');
                failed++;
            } else {
                console.log('   ✅ 200 OK');
                console.log(`   ✅ Reflection: "${data.reflection.substring(0, 50)}..."`);
                console.log(`   ✅ Date: ${data.date}`);
                passed++;
            }
        }
    } catch (err) {
        console.error('   ❌ Error:', err.message);
        failed++;
    }

    // Test 3: GET /api/practice/demo-questions
    console.log('\n3. Testing GET /api/practice/demo-questions...');
    try {
        const res = await fetch(`${BASE_URL}/api/practice/demo-questions?jobTitle=Software Engineer`);

        if (res.status === 404) {
            console.error('   ❌ 404 Not Found - Route not registered');
            failed++;
        } else if (res.status !== 200) {
            console.error(`   ❌ Unexpected status: ${res.status}`);
            failed++;
        } else {
            const data = await res.json();
            if (!data.questions || !Array.isArray(data.questions)) {
                console.error('   ❌ Missing questions array');
                failed++;
            } else {
                console.log('   ✅ 200 OK');
                console.log(`   ✅ Questions: ${data.questions.length}`);
                passed++;
            }
        }
    } catch (err) {
        console.error('   ❌ Error:', err.message);
        failed++;
    }

    // Test 4: GET /api/mock-interview/questions
    console.log('\n4. Testing GET /api/mock-interview/questions...');
    try {
        const res = await fetch(`${BASE_URL}/api/mock-interview/questions?userKey=${TEST_USER_KEY}&type=short`);

        if (res.status === 404) {
            console.error('   ❌ 404 Not Found - Route not registered');
            failed++;
        } else if (res.status !== 200) {
            console.error(`   ❌ Unexpected status: ${res.status}`);
            failed++;
        } else {
            const data = await res.json();
            if (!data.interviewer || !data.questions) {
                console.error('   ❌ Missing interviewer or questions');
                failed++;
            } else {
                console.log('   ✅ 200 OK');
                console.log(`   ✅ Interviewer: ${data.interviewer.name}`);
                console.log(`   ✅ Questions: ${data.questions.length}`);
                passed++;
            }
        }
    } catch (err) {
        console.error('   ❌ Error:', err.message);
        failed++;
    }

    // Test 5: GET /health
    console.log('\n5. Testing GET /health...');
    try {
        const res = await fetch(`${BASE_URL}/health`);

        if (res.status !== 200) {
            console.error(`   ❌ Unexpected status: ${res.status}`);
            failed++;
        } else {
            const data = await res.json();
            console.log('   ✅ 200 OK');
            console.log(`   ✅ Service: ${data.service}`);
            passed++;
        }
    } catch (err) {
        console.error('   ❌ Error:', err.message);
        failed++;
    }

    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`✅ Passed: ${passed}/5`);
    console.log(`❌ Failed: ${failed}/5`);

    if (failed === 0) {
        console.log('\n✅ ALL CRITICAL ENDPOINTS WORKING');
        process.exit(0);
    } else {
        console.log('\n❌ SOME ENDPOINTS FAILING');
        console.log('\n⚠️  If routes return 404, server needs restart to load new routes');
        process.exit(1);
    }
}

testCriticalEndpoints().catch(err => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
});
