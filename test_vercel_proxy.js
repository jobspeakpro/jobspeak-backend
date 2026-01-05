// Test "Fix my answer" via Vercel proxy (same URL frontend uses)
// Test 4 attempts: 1-3 should succeed, 4th should be blocked

const VERCEL_PROXY_URL = 'https://jobspeakpro.com';
const TEST_USER_KEY = `qa-fix-answer-${Date.now()}`;

// Try both possible paths
const POSSIBLE_PATHS = [
  '/api/ai/micro-demo',
  '/ai/micro-demo'
];

async function testVercelProxy() {
  console.log('='.repeat(60));
  console.log('VERCEL PROXY TEST: "Fix my answer" - 4 Attempts');
  console.log('='.repeat(60));
  console.log(`Vercel Proxy URL: ${VERCEL_PROXY_URL}`);
  console.log(`Test User Key: ${TEST_USER_KEY}`);
  console.log('');

  // First, find the correct path
  let correctPath = null;
  for (const path of POSSIBLE_PATHS) {
    try {
      const testRes = await fetch(`${VERCEL_PROXY_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: "Test",
          userKey: TEST_USER_KEY
        })
      });
      
      if (testRes.status !== 404) {
        correctPath = path;
        console.log(`✅ Found correct path: ${path}`);
        break;
      }
    } catch (error) {
      // Continue to next path
    }
  }

  if (!correctPath) {
    console.log('❌ Could not find correct API path. Trying /api/ai/micro-demo as default.');
    correctPath = '/api/ai/micro-demo';
  }

  const FULL_URL = `${VERCEL_PROXY_URL}${correctPath}`;
  console.log(`Using URL: ${FULL_URL}`);
  console.log('');

  const texts = [
    "I worked on a project where we improved the system performance. We reduced latency by 50% and saved $50k annually.",
    "I managed a team of 5 engineers to migrate our database infrastructure. We reduced query time by 70% and improved system reliability.",
    "I handled a conflict situation by listening to both sides and finding common ground. We reached a compromise that satisfied everyone.",
    "I led a cross-functional initiative to streamline our workflow processes. We increased team productivity by 40% and reduced errors by 25%."
  ];

  const results = [];

  for (let i = 0; i < 4; i++) {
    const attemptNum = i + 1;
    const expectedStatus = attemptNum <= 3 ? 200 : 429;
    const expectedResult = attemptNum <= 3 ? 'SUCCESS' : 'BLOCKED';
    
    console.log(`📋 ATTEMPT ${attemptNum}: ${expectedResult === 'SUCCESS' ? 'Should succeed' : 'Should be BLOCKED'}`);
    console.log('-'.repeat(60));
    
    try {
      const res = await fetch(FULL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: texts[i],
          userKey: TEST_USER_KEY
        })
      });
      
      const data = await res.json();
      const status = res.status;
      
      console.log(`Status: ${status} ${res.statusText}`);
      console.log('Response:');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
      
      // Store result
      results.push({
        attempt: attemptNum,
        status: status,
        response: data,
        url: FULL_URL
      });
      
      if (attemptNum <= 3) {
        // Success case
        const hasImproved = !!data.improved;
        const hasUsage = !!data.usage;
        const usageUsed = data.usage?.used;
        
        if (status === 200 && hasImproved && usageUsed === attemptNum) {
          console.log(`✅ SUCCESS: Attempt ${attemptNum} succeeded (used: ${usageUsed}/3)`);
        } else {
          console.log(`❌ FAIL: Attempt ${attemptNum} should have succeeded`);
          console.log(`   Expected: 200 with used=${attemptNum}, Got: ${status} with used=${usageUsed}`);
        }
      } else {
        // Blocked case
        const hasBlocked = data.blocked === true;
        const hasReason = data.reason === 'DAILY_LIMIT_REACHED';
        const hasMessage = typeof data.message === 'string' && data.message.includes('3 free fixes');
        const hasNextAllowedAt = typeof data.nextAllowedAt === 'string' && data.nextAllowedAt.includes('T');
        const hasUpgrade = data.upgrade === true;
        
        if (status === 429 && hasBlocked && hasReason && hasMessage && hasNextAllowedAt && hasUpgrade) {
          console.log(`✅ SUCCESS: Attempt ${attemptNum} correctly blocked with structured response`);
          console.log(`   - blocked: ${hasBlocked}`);
          console.log(`   - reason: ${data.reason}`);
          console.log(`   - message: ${data.message}`);
          console.log(`   - nextAllowedAt: ${data.nextAllowedAt}`);
          console.log(`   - upgrade: ${hasUpgrade}`);
        } else {
          console.log(`❌ FAIL: Attempt ${attemptNum} should be blocked with structured response`);
          console.log(`   Expected: 429 with blocked=true, reason, message, nextAllowedAt, upgrade`);
          console.log(`   Got: ${status} with blocked=${hasBlocked}, reason=${hasReason}, message=${hasMessage}, nextAllowedAt=${hasNextAllowedAt}, upgrade=${hasUpgrade}`);
        }
      }
      
      console.log('');
      
      // Wait 1 second between attempts
      if (i < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ ERROR on attempt ${attemptNum}:`, error.message);
      results.push({
        attempt: attemptNum,
        error: error.message,
        url: FULL_URL
      });
      console.log('');
    }
  }

  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Endpoint: POST ${FULL_URL}`);
  console.log(`Test User: ${TEST_USER_KEY}`);
  console.log('');
  console.log('Results:');
  results.forEach(r => {
    if (r.error) {
      console.log(`  Attempt ${r.attempt}: ERROR - ${r.error}`);
    } else {
      console.log(`  Attempt ${r.attempt}: ${r.status} ${r.status === 200 ? 'OK' : r.status === 429 ? 'BLOCKED' : 'UNEXPECTED'}`);
    }
  });
  console.log('');
  
  return results;
}

testVercelProxy().catch(console.error);

