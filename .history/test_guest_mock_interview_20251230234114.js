// test_guest_mock_interview.js
// Test mock interview endpoints as guest (no userKey)

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testGuestMockInterview() {
    console.log('=== Guest Mock Interview Test ===\n');
    console.log(`Testing against: ${BASE_URL}\n`);

    let passed = 0;
    let failed = 0;

    // Test 1: Questions without userKey (short)
    console.log('1. Testing GET /api/mock-interview/questions?type=short (no userKey)...');
    try {
        const res = await fetch(`${BASE_URL}/api/mock-interview/questions?type=short`);
        const data = await res.json();

        if (res.status !== 200) {
            console.error(`   ❌ Expected 200, got ${res.status}`);
            console.error(`   Response:`, data);
            failed++;
        } else {
            console.log(`   ✅ 200 OK`);
            console.log(`   ✅ Interviewer: ${data.interviewer?.name}`);
            console.log(`   ✅ Questions: ${data.questions?.length}`);
            passed++;
        }
    } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
        failed++;
    }

    // Test 2: Questions without userKey (long)
    console.log('\n2. Testing GET /api/mock-interview/questions?type=long (no userKey)...');
    try {
        const res = await fetch(`${BASE_URL}/api/mock-interview/questions?type=long`);
        const data = await res.json();

        if (res.status !== 200) {
            console.error(`   ❌ Expected 200, got ${res.status}`);
            failed++;
        } else {
            console.log(`   ✅ 200 OK`);
            console.log(`   ✅ Questions: ${data.questions?.length}`);
            passed++;
        }
    } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
        failed++;
    }

    // Test 3: Status without userKey
    console.log('\n3. Testing GET /api/mock-interview/status (no userKey)...');
    try {
        const res = await fetch(`${BASE_URL}/api/mock-interview/status`);
        const data = await res.json();

        if (res.status !== 200) {
            console.error(`   ❌ Expected 200, got ${res.status}`);
            failed++;
        } else {
            console.log(`   ✅ 200 OK`);
            console.log(`   ✅ Response:`, data);
            passed++;
        }
    } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
        failed++;
    }

    // Test 4: Invalid type should still 400
    console.log('\n4. Testing GET /api/mock-interview/questions?type=invalid (should 400)...');
    try {
        const res = await fetch(`${BASE_URL}/api/mock-interview/questions?type=invalid`);
        const data = await res.json();

        if (res.status !== 400) {
            console.error(`   ❌ Expected 400, got ${res.status}`);
            failed++;
        } else {
            console.log(`   ✅ 400 Bad Request (as expected)`);
            console.log(`   ✅ Error: ${data.error}`);
            passed++;
        }
    } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
        failed++;
    }

    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`✅ Passed: ${passed}/4`);
    console.log(`❌ Failed: ${failed}/4`);

    if (failed === 0) {
        console.log('\n✅ ALL TESTS PASSED - Guest-friendly endpoints working!');
        process.exit(0);
    } else {
        console.log('\n❌ SOME TESTS FAILED');
        process.exit(1);
    }
}

testGuestMockInterview().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
