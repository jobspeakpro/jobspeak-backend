// Test "Fix my answer" daily limit on production
// Tests all 3 attempts: success, success, blocked

const PRODUCTION_URL = 'https://jobspeak-backend-production.up.railway.app';
const TEST_USER_KEY = `qa-fix-answer-${Date.now()}`;

async function testProductionFixAnswer() {
  console.log('='.repeat(60));
  console.log('PRODUCTION TEST: "Fix my answer" Daily Limit (3/day)');
  console.log('='.repeat(60));
  console.log(`Production URL: ${PRODUCTION_URL}`);
  console.log(`Test User Key: ${TEST_USER_KEY}`);
  console.log(`Commit: 8c490b9`);
  console.log('');

  const testText1 = "I worked on a project where we improved the system performance. We reduced latency by 50% and saved $50k annually.";
  const testText2 = "I managed a team of 5 engineers to migrate our database infrastructure. We reduced query time by 70% and improved system reliability.";
  const testText3 = "I handled a conflict situation by listening to both sides and finding common ground. We reached a compromise that satisfied everyone.";

  // Attempt 1: Should succeed
  console.log('📋 ATTEMPT 1: First "Fix my answer" (should succeed)');
  console.log('-'.repeat(60));
  try {
    const res1 = await fetch(`${PRODUCTION_URL}/ai/micro-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: testText1,
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

  // Wait 1 second
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Attempt 2: Should succeed
  console.log('📋 ATTEMPT 2: Second "Fix my answer" (should succeed)');
  console.log('-'.repeat(60));
  try {
    const res2 = await fetch(`${PRODUCTION_URL}/ai/micro-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: testText2,
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

  // Wait 1 second
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Attempt 3: Should be blocked
  console.log('📋 ATTEMPT 3: Third "Fix my answer" (should be BLOCKED)');
  console.log('-'.repeat(60));
  try {
    const res3 = await fetch(`${PRODUCTION_URL}/ai/micro-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: testText3,
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
  console.log(`Endpoint: POST ${PRODUCTION_URL}/ai/micro-demo`);
  console.log(`Test User: ${TEST_USER_KEY}`);
  console.log(`Commit: 8c490b9`);
  console.log('');
}

// Run the test
testProductionFixAnswer().catch(console.error);

