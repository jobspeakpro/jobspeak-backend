// Test guest rate limiting with x-guest-key HEADER (not body.userKey)
// Verify that debug.identityKey is stable across all 4 attempts

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

async function testGuestRateLimitingHeaders() {
    console.log('='.repeat(80));
    console.log('GUEST RATE LIMITING TEST - Header-Based Identity');
    console.log('='.repeat(80));
    console.log(`Production URL: ${PRODUCTION_URL}`);
    console.log(`Guest Key (STABLE): ${GUEST_KEY}`);
    console.log(`Session ID: ${SESSION_ID}`);
    console.log('');
    console.log('Expected Behavior:');
    console.log('  - Attempt 1-3: 200 OK with debug.identityKey stable');
    console.log('  - Attempt 4: 429 with same debug.identityKey');
    console.log('  - debug.identitySource should be "x-guest-key"');
    console.log('');

    const results = [];
    let firstIdentityKey = null;

    for (let i = 0; i < 4; i++) {
        const attemptNum = i + 1;
        const testCase = testCases[i];

        console.log('='.repeat(80));
        console.log(`ATTEMPT ${attemptNum}/4`);
        console.log('='.repeat(80));

        // Generate curl command for reproducibility
        const curlCmd = `curl -X POST "${PRODUCTION_URL}" \\
  -H "Content-Type: application/json" \\
  -H "x-guest-key: ${GUEST_KEY}" \\
  -d '{
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
                headers: {
                    'Content-Type': 'application/json',
                    'x-guest-key': GUEST_KEY  // ← USING HEADER, NOT BODY
                },
                body: JSON.stringify({
                    sessionId: SESSION_ID,
                    questionId: testCase.questionId,
                    questionText: testCase.questionText,
                    answerText: testCase.answerText
                    // NO userKey in body
                })
            });

            const responseTime = Date.now() - startTime;
            const data = await res.json();
            const status = res.status;

            console.log(`📊 RESPONSE:`);
            console.log(`   Status: ${status} ${res.statusText}`);
            console.log(`   Time: ${responseTime}ms`);
            console.log('');

            // Extract debug fields
            if (data.debug) {
                console.log('🔍 DEBUG FIELDS:');
                console.log(`   identityKey: ${data.debug.identityKey}`);
                console.log(`   identitySource: ${data.debug.identitySource}`);
                console.log(`   identityType: ${data.debug.identityType}`);
                console.log(`   used: ${data.debug.used}`);
                console.log(`   limit: ${data.debug.limit}`);
                console.log('');

                // Verify identity key is stable
                if (attemptNum === 1) {
                    firstIdentityKey = data.debug.identityKey;
                    console.log(`✅ First attempt - identityKey set to: ${firstIdentityKey}`);
                } else {
                    if (data.debug.identityKey === firstIdentityKey) {
                        console.log(`✅ identityKey is STABLE (matches attempt 1)`);
                    } else {
                        console.log(`❌ identityKey CHANGED! Expected: ${firstIdentityKey}, Got: ${data.debug.identityKey}`);
                    }
                }

                // Verify identity source
                if (data.debug.identitySource === 'x-guest-key') {
                    console.log(`✅ identitySource is "x-guest-key" (correct)`);
                } else {
                    console.log(`⚠️  identitySource is "${data.debug.identitySource}" (expected "x-guest-key")`);
                }

                console.log('');
            } else {
                console.log('❌ NO DEBUG FIELD IN RESPONSE!');
                console.log('');
            }

            // Extract key fields
            if (status === 200) {
                console.log('✅ SUCCESS (200 OK)');
                console.log(`   Score: ${data.score || 'N/A'}`);

                if (data.usage) {
                    console.log(`   Usage: ${data.usage.used}/${data.usage.limit} (remaining: ${data.usage.remaining})`);
                } else {
                    console.log(`   ⚠️  NO USAGE TRACKING`);
                }
            } else if (status === 429) {
                console.log('🚫 BLOCKED (429 Too Many Requests)');
                console.log(`   blocked: ${data.blocked}`);
                console.log(`   reason: ${data.reason}`);
                console.log(`   message: ${data.message}`);

                if (data.usage) {
                    console.log(`   Usage: ${data.usage.used}/${data.usage.limit}`);
                }
            } else {
                console.log(`⚠️  UNEXPECTED STATUS: ${status}`);
            }

            console.log('');

            results.push({
                attempt: attemptNum,
                status: status,
                debug: data.debug || null,
                usage: data.usage || null,
                blocked: data.blocked || false
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
                error: error.message
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

    // Verify identity key stability
    const identityKeys = results.filter(r => r.debug).map(r => r.debug.identityKey);
    const uniqueKeys = [...new Set(identityKeys)];

    console.log('🔍 IDENTITY KEY STABILITY:');
    if (uniqueKeys.length === 1) {
        console.log(`✅ STABLE - All attempts used the same identityKey: ${uniqueKeys[0]}`);
    } else {
        console.log(`❌ UNSTABLE - Found ${uniqueKeys.length} different identityKeys:`);
        uniqueKeys.forEach((key, i) => console.log(`   ${i + 1}. ${key}`));
    }
    console.log('');

    // Verify identity source
    const identitySources = results.filter(r => r.debug).map(r => r.debug.identitySource);
    const uniqueSources = [...new Set(identitySources)];

    console.log('🔍 IDENTITY SOURCE:');
    if (uniqueSources.length === 1 && uniqueSources[0] === 'x-guest-key') {
        console.log(`✅ CORRECT - All attempts used identitySource: "x-guest-key"`);
    } else {
        console.log(`⚠️  Sources found: ${uniqueSources.join(', ')}`);
    }
    console.log('');

    // Verify rate limiting
    const fourthBlocked = results[3] && results[3].status === 429;

    console.log('🔍 RATE LIMITING:');
    if (fourthBlocked) {
        console.log('✅ WORKING - 4th attempt blocked with 429');
    } else {
        console.log('❌ NOT WORKING - 4th attempt was not blocked');
    }
    console.log('');

    // Detailed results
    console.log('📊 DETAILED RESULTS:');
    results.forEach(r => {
        if (r.error) {
            console.log(`Attempt ${r.attempt}: ERROR - ${r.error}`);
        } else {
            const debugInfo = r.debug ? `identityKey=${r.debug.identityKey.substring(0, 20)}..., used=${r.debug.used}, limit=${r.debug.limit}` : 'NO DEBUG';
            console.log(`Attempt ${r.attempt}: ${r.status} - ${debugInfo}`);
        }
    });

    return results;
}

// Run the test
testGuestRateLimitingHeaders().catch(console.error);
