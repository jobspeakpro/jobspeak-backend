// Test "Fix my answer" with 4 attempts: 1-3 should succeed, 4th should be blocked

const PRODUCTION_URL = 'https://jobspeak-backend-production.up.railway.app';
const TEST_USER_KEY = `qa-fix-answer-${Date.now()}`;

async function test4Attempts() {
  console.log('='.repeat(60));
  console.log('PRODUCTION TEST: "Fix my answer" - 4 Attempts (3 allowed, 4th blocked)');
  console.log('='.repeat(60));
  console.log(`Production URL: ${PRODUCTION_URL}`);
  console.log(`Test User Key: ${TEST_USER_KEY}`);
  console.log('');

  const texts = [
    "I worked on a project where we improved the system performance. We reduced latency by 50% and saved $50k annually.",
    "I managed a team of 5 engineers to migrate our database infrastructure. We reduced query time by 70% and improved system reliability.",
    "I handled a conflict situation by listening to both sides and finding common ground. We reached a compromise that satisfied everyone.",
    "I led a cross-functional initiative to streamline our workflow processes. We increased team productivity by 40% and reduced errors by 25%."
  ];

  for (let i = 0; i < 4; i++) {
    const attemptNum = i + 1;
    const expectedStatus = attemptNum <= 3 ? 200 : 429;
    const expectedResult = attemptNum <= 3 ? 'SUCCESS' : 'BLOCKED';
    
    console.log(`📋 ATTEMPT ${attemptNum}: ${expectedResult === 'SUCCESS' ? 'Should succeed' : 'Should be BLOCKED'}`);
    console.log('-'.repeat(60));
    
    try {
      const res = await fetch(`${PRODUCTION_URL}/ai/micro-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: texts[i],
          userKey: TEST_USER_KEY
        })
      });
      
      const data = await res.json();
      console.log(`Status: ${res.status} ${res.statusText}`);
      
      if (attemptNum <= 3) {
        // Success case
        const hasImproved = !!data.improved;
        const hasUsage = !!data.usage;
        const usageUsed = data.usage?.used;
        const usageRemaining = data.usage?.remaining;
        
        console.log(`Response includes improved: ${hasImproved}`);
        console.log(`Response includes usage: ${hasUsage}`);
        console.log(`Usage - used: ${usageUsed}, remaining: ${usageRemaining}`);
        
        if (res.status === 200 && hasImproved && usageUsed === attemptNum) {
          console.log(`✅ SUCCESS: Attempt ${attemptNum} succeeded (used: ${usageUsed}/3)`);
        } else {
          console.log(`❌ FAIL: Attempt ${attemptNum} should have succeeded`);
        }
      } else {
        // Blocked case
        const hasBlocked = data.blocked === true;
        const hasReason = data.reason === 'DAILY_LIMIT_REACHED';
        const hasMessage = typeof data.message === 'string' && data.message.includes('3 free fixes');
        const hasNextAllowedAt = typeof data.nextAllowedAt === 'string' && data.nextAllowedAt.includes('T');
        const hasUpgrade = data.upgrade === true;
        
        console.log(`Response - blocked: ${hasBlocked}, reason: ${data.reason}`);
        console.log(`Response - message: ${data.message}`);
        console.log(`Response - nextAllowedAt: ${data.nextAllowedAt}`);
        console.log(`Response - upgrade: ${hasUpgrade}`);
        
        if (res.status === 429 && hasBlocked && hasReason && hasMessage && hasNextAllowedAt && hasUpgrade) {
          console.log(`✅ SUCCESS: Attempt ${attemptNum} correctly blocked with structured response`);
        } else {
          console.log(`❌ FAIL: Attempt ${attemptNum} should be blocked with structured response`);
        }
      }
      
      console.log('');
      
      // Wait 1 second between attempts
      if (i < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ ERROR on attempt ${attemptNum}:`, error.message);
      console.log('');
    }
  }

  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Endpoint: POST ${PRODUCTION_URL}/ai/micro-demo`);
  console.log(`Test User: ${TEST_USER_KEY}`);
  console.log('');
  console.log('Expected Results:');
  console.log('  - Attempt 1: 200 OK (success)');
  console.log('  - Attempt 2: 200 OK (success)');
  console.log('  - Attempt 3: 200 OK (success)');
  console.log('  - Attempt 4: 429 (blocked) with structured response');
  console.log('');
}

test4Attempts().catch(console.error);

