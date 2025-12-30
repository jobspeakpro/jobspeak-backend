// Test script for production fixes
// Run: node test_production_fixes.js

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const TEST_USER_KEY = `test-prod-${Date.now()}`;

async function testProductionFixes() {
    console.log('=== Production Fixes Verification ===\n');

    let passed = 0;
    let failed = 0;

    // Test 1: Daily Reflection
    console.log('1. Testing daily reflection...');
    try {
        const res = await fetch(`${BASE_URL}/api/daily-reflection`);
        const data = await res.json();

        if (data.reflection && data.date) {
            console.log(`   ✅ Reflection: "${data.reflection.substring(0, 50)}..."`);
            console.log(`   ✅ Date: ${data.date}`);
            passed++;
        } else {
            console.error('   ❌ Missing reflection or date');
            failed++;
        }
    } catch (err) {
        console.error('   ❌ Error:', err.message);
        failed++;
    }

    // Test 2: Progress Summary (empty user)
    console.log('\n2. Testing progress summary (new user)...');
    try {
        const res = await fetch(`${BASE_URL}/api/progress/summary?userKey=${TEST_USER_KEY}`);
        const data = await res.json();

        if (data.total_practice_sessions === 0 && data.days_practiced === 0) {
            console.log('   ✅ Returns zeros for new user');
            passed++;
        } else {
            console.error('   ❌ Unexpected data for new user:', data);
            failed++;
        }
    } catch (err) {
        console.error('   ❌ Error:', err.message);
        failed++;
    }

    // Test 3: Account Deletion (soft delete)
    console.log('\n3. Testing account deletion...');
    try {
        const res = await fetch(`${BASE_URL}/api/account`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userKey: TEST_USER_KEY })
        });
        const data = await res.json();

        if (data.success && data.restore_until) {
            console.log('   ✅ Account soft-deleted');
            console.log(`   ✅ Restore until: ${data.restore_until}`);
            passed++;
        } else {
            console.error('   ❌ Deletion failed:', data);
            failed++;
        }
    } catch (err) {
        console.error('   ❌ Error:', err.message);
        failed++;
    }

    // Test 4: Account Restore
    console.log('\n4. Testing account restore...');
    try {
        const res = await fetch(`${BASE_URL}/api/account/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userKey: TEST_USER_KEY })
        });
        const data = await res.json();

        if (data.success && data.restored) {
            console.log('   ✅ Account restored');
            passed++;
        } else {
            console.error('   ❌ Restore failed:', data);
            failed++;
        }
    } catch (err) {
        console.error('   ❌ Error:', err.message);
        failed++;
    }

    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed === 0) {
        console.log('\n✅ ALL TESTS PASSED');
        process.exit(0);
    } else {
        console.log('\n❌ SOME TESTS FAILED');
        process.exit(1);
    }
}

testProductionFixes().catch(err => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
});
