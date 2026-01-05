// Test script for "Fix my answer" daily limit (3/day)
// Tests all 3 attempts: success, success, blocked

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const TEST_USER_KEY = `test-fix-answer-${Date.now()}`;

async function testFixAnswerLimit() {
  console.log('='.repeat(60));
  console.log('TEST: "Fix my answer" Daily Limit (3/day)');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test User Key: ${TEST_USER_KEY}`);
  console.log('');

  const testText = "I worked on a project where we improved the system performance.";

  // Attempt 1: Should succeed
  console.log('📋 ATTEMPT 1: First "Fix my answer" (should succeed)');
  console.log('-'.repeat(60));
  try {
    const res1 = await fetch(`${BASE_URL}/ai/micro-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: testText,
        userKey: TEST_USER_KEY
      })
    });
    
    const data1 = await res1.json();
    console.log(`Status: ${res1.status} ${res1.statusText}`);
    console.log('Response:');
    console.log(JSON.stringify(data1, null, 2));
    console.log('');
    
    if (res1.status === 200 && data1.improved) {
      console.log('✅ SUCCESS: Attempt 1 succeeded');
    } else {
      console.log('❌ FAIL: Attempt 1 should have succeeded');
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
  console.log('');

  // Attempt 2: Should succeed
  console.log('📋 ATTEMPT 2: Second "Fix my answer" (should succeed)');
  console.log('-'.repeat(60));
  try {
    const res2 = await fetch(`${BASE_URL}/ai/micro-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: testText + " We reduced latency by 50%.",
        userKey: TEST_USER_KEY
      })
    });
    
    const data2 = await res2.json();
    console.log(`Status: ${res2.status} ${res2.statusText}`);
    console.log('Response:');
    console.log(JSON.stringify(data2, null, 2));
    console.log('');
    
    if (res2.status === 200 && data2.improved) {
      console.log('✅ SUCCESS: Attempt 2 succeeded');
    } else {
      console.log('❌ FAIL: Attempt 2 should have succeeded');
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
  console.log('');

  // Attempt 3: Should be blocked
  console.log('📋 ATTEMPT 3: Third "Fix my answer" (should be BLOCKED)');
  console.log('-'.repeat(60));
  try {
    const res3 = await fetch(`${BASE_URL}/ai/micro-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: testText + " The team was happy with the results.",
        userKey: TEST_USER_KEY
      })
    });
    
    const data3 = await res3.json();
    console.log(`Status: ${res3.status} ${res3.statusText}`);
    console.log('Response:');
    console.log(JSON.stringify(data3, null, 2));
    console.log('');
    
    // Verify blocked response structure
    const hasBlocked = data3.blocked === true;
    const hasReason = data3.reason === 'DAILY_LIMIT_REACHED';
    const hasMessage = typeof data3.message === 'string' && data3.message.includes('3 free fixes');
    const hasNextAllowedAt = typeof data3.nextAllowedAt === 'string' && data3.nextAllowedAt.includes('T');
    
    if (res3.status === 429 && hasBlocked && hasReason && hasMessage && hasNextAllowedAt) {
      console.log('✅ SUCCESS: Attempt 3 correctly blocked with structured response');
      console.log(`   - blocked: ${data3.blocked}`);
      console.log(`   - reason: ${data3.reason}`);
      console.log(`   - message: ${data3.message}`);
      console.log(`   - nextAllowedAt: ${data3.nextAllowedAt}`);
    } else {
      console.log('❌ FAIL: Attempt 3 should be blocked with structured response');
      console.log(`   - Status should be 429, got: ${res3.status}`);
      console.log(`   - blocked should be true, got: ${data3.blocked}`);
      console.log(`   - reason should be "DAILY_LIMIT_REACHED", got: ${data3.reason}`);
      console.log(`   - message should include "3 free fixes", got: ${data3.message}`);
      console.log(`   - nextAllowedAt should be ISO timestamp, got: ${data3.nextAllowedAt}`);
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Endpoint: POST ${BASE_URL}/ai/micro-demo`);
  console.log(`Test User: ${TEST_USER_KEY}`);
  console.log('');
  console.log('Expected Results:');
  console.log('  - Attempt 1: 200 OK (success)');
  console.log('  - Attempt 2: 200 OK (success)');
  console.log('  - Attempt 3: 429 (blocked) with structured response');
  console.log('');
}

// Run the test
testFixAnswerLimit().catch(console.error);

