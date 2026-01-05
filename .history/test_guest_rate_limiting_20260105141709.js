// Test guest rate limiting for /api/practice/answer in production
// Verify that a stable guest identifier is tracked across 4 attempts
// Expected: 200/200/200/429 if tracking works, 200/200/200/200 if bug exists

const PRODUCTION_URL = 'https://jobspeakpro.com/api/practice/answer';

// Use a stable guest key (same for all 4 attempts)
const GUEST_KEY = `guest-test-${Date.now()}`;
const SESSION_ID = `guest-session-${Date.now()}`;

const testCases = [
    {
        questionId: 'guest-q1',
        questionText: 'Tell me about a time you led a project.',
        answerText: 'I led a team of 5 engineers to migrate our database infrastructure. We reduced query time by 70% and improved system reliability.'
    },
    {
        questionId: 'guest-q2',
        questionText: 'How do you handle conflict?',
        answerText: 'I handled a conflict situation by listening to both sides and finding common ground. We reached a compromise that satisfied everyone.'
    },
    {
        questionId: 'guest-q3',
        questionText: 'What is your greatest strength?',
        answerText: 'My greatest strength is problem-solving. I can break down complex issues and find practical solutions quickly.'
    },
    {
        questionId: 'guest-q4',
        questionText: 'Where do you see yourself in 5 years?',
        answerText: 'I see myself in a senior technical leadership role, mentoring junior developers and driving architectural decisions.'
    }
];

async function testGuestRateLimiting() {
    console.log('='.repeat(80));
    console.log('GUEST RATE LIMITING TEST - Production Verification');
    console.log('='.repeat(80));
    console.log(`Production URL: ${PRODUCTION_URL}`);
    console.log(`Guest Key (STABLE): ${GUEST_KEY}`);
    console.log(`Session ID: ${SESSION_ID}`);
    console.log('');
    console.log('Expected Behavior:');
    console.log('  - If guest tracking works: 200/200/200/429');
    console.log('  - If bug exists (guests not tracked): 200/200/200/200');
    console.log('');

    const results = [];

    for (let i = 0; i < 4; i++) {
        const attemptNum = i + 1;
        const testCase = testCases[i];

        console.log('='.repeat(80));
        console.log(`ATTEMPT ${attemptNum}/4`);
        console.log('='.repeat(80));

        // Generate curl command for reproducibility
        const curlCmd = `curl -X POST "${PRODUCTION_URL}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "userKey": "${GUEST_KEY}",
    "sessionId": "${SESSION_ID}",
    "questionId": "${testCase.questionId}",
    "questionText": "${testCase.questionText.replace(/"/g, '\\"')}",
    "answerText": "${testCase.answerText.replace(/"/g, '\\"')}"
  }'`;

        console.log('\n📋 CURL COMMAND:');
        console.log(curlCmd);
        console.log('');

        try {
            const startTime = Date.now();

            const res = await fetch(PRODUCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userKey: GUEST_KEY,
                    sessionId: SESSION_ID,
                    questionId: testCase.questionId,
                    questionText: testCase.questionText,
                    answerText: testCase.answerText
                })
            });

            const responseTime = Date.now() - startTime;
            const data = await res.json();
            const status = res.status;

            console.log(`📊 RESPONSE:`);
            console.log(`   Status: ${status} ${res.statusText}`);
            console.log(`   Time: ${responseTime}ms`);
            console.log(`   Guest Key: ${GUEST_KEY}`);
            console.log('');

            // Extract key fields
            if (status === 200) {
                console.log('✅ SUCCESS (200 OK)');
                console.log(`   Score: ${data.score || 'N/A'}`);
                console.log(`   Has clearerRewrite: ${!!data.clearerRewrite}`);

                if (data.usage) {
                    console.log(`   Usage Tracking:`);
                    console.log(`     - used: ${data.usage.used}`);
                    console.log(`     - limit: ${data.usage.limit}`);
                    console.log(`     - remaining: ${data.usage.remaining}`);
                    console.log(`     - blocked: ${data.usage.blocked}`);

                    if (attemptNum === 3 && data.usage.used === 3 && data.usage.remaining === 0) {
                        console.log('   ✅ Attempt 3: At limit (used=3, remaining=0)');
                    }
                } else {
                    console.log(`   ⚠️  NO USAGE TRACKING - Guest not being tracked!`);
                }
            } else if (status === 429) {
                console.log('🚫 BLOCKED (429 Too Many Requests)');
                console.log(`   blocked: ${data.blocked}`);
                console.log(`   reason: ${data.reason}`);
                console.log(`   message: ${data.message}`);
                console.log(`   nextAllowedAt: ${data.nextAllowedAt}`);

                if (data.usage) {
                    console.log(`   Usage: ${data.usage.used}/${data.usage.limit}`);
                }
            } else {
                console.log(`⚠️  UNEXPECTED STATUS: ${status}`);
            }

            console.log('');
            console.log('📄 Full Response (truncated):');
            const truncatedData = { ...data };
            if (truncatedData.clearerRewrite && truncatedData.clearerRewrite.length > 100) {
                truncatedData.clearerRewrite = truncatedData.clearerRewrite.substring(0, 100) + '...';
            }
            console.log(JSON.stringify(truncatedData, null, 2));
            console.log('');

            results.push({
                attempt: attemptNum,
                status: status,
                guestKey: GUEST_KEY,
                hasUsageTracking: !!data.usage,
                usage: data.usage || null,
                blocked: data.blocked || false,
                curl: curlCmd
            });

            // Wait 1 second between attempts
            if (i < 3) {
                console.log('⏳ Waiting 1 second before next attempt...\n');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

        } catch (error) {
            console.error(`❌ ERROR: ${error.message}`);
            results.push({
                attempt: attemptNum,
                error: error.message,
                guestKey: GUEST_KEY,
                curl: curlCmd
            });
        }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Endpoint: ${PRODUCTION_URL}`);
    console.log(`Guest Key (STABLE): ${GUEST_KEY}`);
    console.log('');

    const statusProgression = results.map(r => r.error ? 'ERROR' : r.status).join(' → ');
    console.log(`Status Progression: ${statusProgression}`);
    console.log('');

    results.forEach(r => {
        if (r.error) {
            console.log(`Attempt ${r.attempt}: ERROR - ${r.error}`);
        } else {
            const tracking = r.hasUsageTracking ? `tracked (${r.usage.used}/${r.usage.limit})` : 'NOT TRACKED';
            console.log(`Attempt ${r.attempt}: ${r.status} - ${tracking}`);
        }
    });

    console.log('');
    console.log('🔍 ANALYSIS:');

    const allSuccess = results.every(r => !r.error && r.status === 200);
    const hasTracking = results.some(r => r.hasUsageTracking);
    const fourthBlocked = results[3] && results[3].status === 429;

    if (fourthBlocked) {
        console.log('✅ Guest rate limiting is WORKING - 4th attempt blocked with 429');
    } else if (allSuccess && !hasTracking) {
        console.log('❌ BUG CONFIRMED - Guests are NOT being tracked (all 200, no usage field)');
        console.log('   Root cause: practice.js lines 176 & 369 exclude guests from tracking');
        console.log('   Guests can make unlimited attempts');
    } else if (allSuccess && hasTracking) {
        console.log('⚠️  PARTIAL TRACKING - Guests tracked but 4th attempt not blocked');
        console.log('   Check if guest key is changing or usage store is resetting');
    } else {
        console.log('⚠️  UNEXPECTED RESULT - Review individual attempt details above');
    }

    console.log('');
    console.log('📋 REFERRAL DATA STORAGE:');
    console.log('   Guests: localStorage only (frontend-managed)');
    console.log('   Logged-in: user_metadata.heard_about_us (Supabase Auth)');
    console.log('   Sync: On login, POST to /api/profile/heard-about if DB is NULL');
    console.log('');

    return results;
}

// Run the test
testGuestRateLimiting().catch(console.error);
