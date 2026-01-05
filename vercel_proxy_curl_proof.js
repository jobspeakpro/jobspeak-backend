// Generate curl proof for Vercel proxy URL
// Test 4 attempts with fresh QA account

const VERCEL_URL = 'https://jobspeakpro.com/ai/micro-demo';
const TEST_USER_KEY = `qa-vercel-${Date.now()}`;

const texts = [
  "I worked on a project where we improved the system performance. We reduced latency by 50% and saved $50k annually.",
  "I managed a team of 5 engineers to migrate our database infrastructure. We reduced query time by 70% and improved system reliability.",
  "I handled a conflict situation by listening to both sides and finding common ground. We reached a compromise that satisfied everyone.",
  "I led a cross-functional initiative to streamline our workflow processes. We increased team productivity by 40% and reduced errors by 25%."
];

async function generateCurlProof() {
  console.log('='.repeat(70));
  console.log('VERCEL PROXY CURL PROOF: "Fix my answer" - 4 Attempts');
  console.log('='.repeat(70));
  console.log(`URL: ${VERCEL_URL}`);
  console.log(`Test User Key: ${TEST_USER_KEY}`);
  console.log('');

  const results = [];

  for (let i = 0; i < 4; i++) {
    const attemptNum = i + 1;
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`ATTEMPT ${attemptNum}: ${attemptNum <= 3 ? 'Should succeed (200)' : 'Should be BLOCKED (429)'}`);
    console.log('='.repeat(70));
    
    // Generate curl command
    const curlCmd = `curl -X POST ${VERCEL_URL} \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "${texts[i].replace(/'/g, "\\'")}",
    "userKey": "${TEST_USER_KEY}"
  }'`;
    
    console.log('\n📋 CURL COMMAND:');
    console.log(curlCmd);
    console.log('');
    
    try {
      const res = await fetch(VERCEL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: texts[i],
          userKey: TEST_USER_KEY
        })
      });
      
      const data = await res.json();
      const status = res.status;
      
      console.log(`📊 STATUS CODE: ${status} ${res.statusText}`);
      console.log('');
      console.log('📄 JSON RESPONSE:');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
      
      // Verify required fields for blocked response
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
        const hasImproved = !!data.improved;
        const hasUsage = !!data.usage;
        const usageUsed = data.usage?.used;
        
        console.log('✅ VERIFICATION (200 SUCCESS):');
        console.log(`   - improved: ${hasImproved ? '✅' : '❌'}`);
        console.log(`   - usage.used: ${usageUsed} ${usageUsed === attemptNum ? '✅' : '⚠️'}`);
        console.log(`   - usage.remaining: ${data.usage?.remaining}`);
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

generateCurlProof().catch(console.error);

