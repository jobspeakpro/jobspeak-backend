// Test /api/practice/answer with 4 attempts via Vercel proxy
// Test 4 attempts: 1-3 should succeed, 4th should be blocked

const VERCEL_URL = 'https://jobspeakpro.com/api/practice/answer';
const TEST_USER_KEY = `qa-practice-${Date.now()}`;
const SESSION_ID = `test-session-${Date.now()}`;

const testCases = [
  {
    questionId: 'q1',
    questionText: 'Tell me about a time you led a project.',
    answerText: 'I worked on a project where we improved the system performance. We reduced latency by 50% and saved $50k annually.'
  },
  {
    questionId: 'q2',
    questionText: 'How do you handle conflict?',
    answerText: 'I managed a team of 5 engineers to migrate our database infrastructure. We reduced query time by 70% and improved system reliability.'
  },
  {
    questionId: 'q3',
    questionText: 'What is your greatest strength?',
    answerText: 'I handled a conflict situation by listening to both sides and finding common ground. We reached a compromise that satisfied everyone.'
  },
  {
    questionId: 'q4',
    questionText: 'Where do you see yourself in 5 years?',
    answerText: 'I led a cross-functional initiative to streamline our workflow processes. We increased team productivity by 40% and reduced errors by 25%.'
  }
];

async function testPracticeAnswer() {
  console.log('='.repeat(70));
  console.log('VERCEL PROXY CURL PROOF: /api/practice/answer - 4 Attempts');
  console.log('='.repeat(70));
  console.log(`URL: ${VERCEL_URL}`);
  console.log(`Test User Key: ${TEST_USER_KEY}`);
  console.log(`Session ID: ${SESSION_ID}`);
  console.log('');

  const results = [];

  for (let i = 0; i < 4; i++) {
    const attemptNum = i + 1;
    const testCase = testCases[i];
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`ATTEMPT ${attemptNum}: ${attemptNum <= 3 ? 'Should succeed (200)' : 'Should be BLOCKED (429)'}`);
    console.log('='.repeat(70));
    
    // Generate curl command
    const curlCmd = `curl -X POST ${VERCEL_URL} \\
  -H "Content-Type: application/json" \\
  -d '{
    "userKey": "${TEST_USER_KEY}",
    "sessionId": "${SESSION_ID}",
    "questionId": "${testCase.questionId}",
    "questionText": "${testCase.questionText.replace(/'/g, "\\'")}",
    "answerText": "${testCase.answerText.replace(/'/g, "\\'")}"
  }'`;
    
    console.log('\n📋 CURL COMMAND:');
    console.log(curlCmd);
    console.log('');
    
    try {
      const res = await fetch(VERCEL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userKey: TEST_USER_KEY,
          sessionId: SESSION_ID,
          questionId: testCase.questionId,
          questionText: testCase.questionText,
          answerText: testCase.answerText
        })
      });
      
      const data = await res.json();
      const status = res.status;
      
      console.log(`📊 STATUS CODE: ${status} ${res.statusText}`);
      console.log('');
      console.log('📄 JSON RESPONSE:');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
      
      // Verify required fields
      if (status === 429) {
        const hasBlocked = data.blocked === true;
        const hasReason = data.reason === 'DAILY_LIMIT_REACHED';
        const hasMessage = typeof data.message === 'string' && data.message.includes('3 free fixes');
        const hasNextAllowedAt = typeof data.nextAllowedAt === 'string' && data.nextAllowedAt.includes('T');
        const hasUpgrade = data.upgrade === true;
        
        console.log('✅ VERIFICATION (429 BLOCKED):');
        console.log(`   - blocked: ${hasBlocked} ${hasBlocked ? '✅' : '❌'}`);
        console.log(`   - reason: ${hasReason ? '✅' : '❌'} (${data.reason})`);
        console.log(`   - message: ${hasMessage ? '✅' : '❌'}`);
        console.log(`   - nextAllowedAt: ${hasNextAllowedAt ? '✅' : '❌'} (${data.nextAllowedAt})`);
        console.log(`   - upgrade: ${hasUpgrade ? '✅' : '❌'}`);
      } else if (status === 200) {
        const hasClearerRewrite = !!data.clearerRewrite;
        const hasUsage = !!data.usage;
        const usageUsed = data.usage?.used;
        const usageRemaining = data.usage?.remaining;
        const usageBlocked = data.usage?.blocked;
        
        console.log('✅ VERIFICATION (200 SUCCESS):');
        console.log(`   - clearerRewrite: ${hasClearerRewrite ? '✅' : '❌'}`);
        console.log(`   - usage.used: ${usageUsed} ${usageUsed === attemptNum ? '✅' : '⚠️'}`);
        console.log(`   - usage.remaining: ${usageRemaining}`);
        console.log(`   - usage.blocked: ${usageBlocked} ${attemptNum === 3 ? (usageBlocked === false ? '✅' : '❌') : '✅'}`);
        
        // Contract check: Attempt 3 must have blocked=false and remaining=0
        if (attemptNum === 3) {
          if (usageBlocked === false && usageRemaining === 0) {
            console.log('   ✅ CONTRACT: Attempt 3 has blocked=false and remaining=0');
          } else {
            console.log(`   ❌ CONTRACT VIOLATION: Attempt 3 should have blocked=false and remaining=0, got blocked=${usageBlocked}, remaining=${usageRemaining}`);
          }
        }
      }
      
      results.push({
        attempt: attemptNum,
        status: status,
        curl: curlCmd,
        response: data
      });
      
      // Wait between attempts
      if (i < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ ERROR: ${error.message}`);
      results.push({
        attempt: attemptNum,
        error: error.message,
        curl: curlCmd
      });
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Endpoint: POST ${VERCEL_URL}`);
  console.log(`Test User: ${TEST_USER_KEY}`);
  console.log('');
  results.forEach(r => {
    if (r.error) {
      console.log(`Attempt ${r.attempt}: ERROR - ${r.error}`);
    } else {
      console.log(`Attempt ${r.attempt}: ${r.status} ${r.status === 200 ? 'OK' : r.status === 429 ? 'BLOCKED' : 'UNEXPECTED'}`);
    }
  });
  console.log('');
  
  return results;
}

testPracticeAnswer().catch(console.error);

