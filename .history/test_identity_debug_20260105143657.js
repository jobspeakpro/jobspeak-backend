// Test production identity debug logging
// Make 2 requests: one that succeeds (200) and one that blocks (429)

const PRODUCTION_URL = 'https://jobspeakpro.com/api/practice/answer';
const GUEST_KEY = `guest-debug-${Date.now()}`;
const SESSION_ID = `debug-session-${Date.now()}`;

async function testIdentityDebug() {
    console.log('='.repeat(80));
    console.log('PRODUCTION IDENTITY DEBUG TEST');
    console.log('='.repeat(80));
    console.log(`URL: ${PRODUCTION_URL}`);
    console.log(`Guest Key: ${GUEST_KEY}`);
    console.log('');

    // Test 1: First attempt (should succeed with 200)
    console.log('TEST 1: First attempt (expect 200 with debug.used=1/3)');
    console.log('='.repeat(80));

    try {
        const res1 = await fetch(PRODUCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-key': GUEST_KEY  // Send guest key via header
            },
            body: JSON.stringify({
                sessionId: SESSION_ID,
                questionId: 'debug-q1',
                questionText: 'Tell me about yourself.',
                answerText: 'I am a software engineer with 5 years of experience building scalable web applications.'
            })
        });

        const data1 = await res1.json();

        console.log(`Status: ${res1.status}`);
        console.log('');
        console.log('Debug Field:');
        console.log(JSON.stringify(data1.debug, null, 2));
        console.log('');
        console.log('Usage Field:');
        console.log(JSON.stringify(data1.usage, null, 2));
        console.log('');

        if (data1.debug) {
            console.log('✅ Debug field present');
            console.log(`   identityType: ${data1.debug.identityType}`);
            console.log(`   identityKey: ${data1.debug.identityKey}`);
            console.log(`   identitySource: ${data1.debug.identitySource}`);
            console.log(`   used: ${data1.debug.used}`);
            console.log(`   limit: ${data1.debug.limit}`);
        } else {
            console.log('❌ No debug field in response');
        }

    } catch (error) {
        console.error('ERROR:', error.message);
    }

    console.log('');
    console.log('Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('');

    // Make 2 more requests to reach the limit
    for (let i = 2; i <= 3; i++) {
        console.log(`Making attempt ${i}/3...`);
        await fetch(PRODUCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-key': GUEST_KEY
            },
            body: JSON.stringify({
                sessionId: SESSION_ID,
                questionId: `debug-q${i}`,
                questionText: 'What is your greatest strength?',
                answerText: 'My greatest strength is problem-solving and attention to detail.'
            })
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('');
    console.log('TEST 2: Fourth attempt (expect 429 with debug.used=3/3)');
    console.log('='.repeat(80));

    try {
        const res2 = await fetch(PRODUCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-key': GUEST_KEY  // Same guest key
            },
            body: JSON.stringify({
                sessionId: SESSION_ID,
                questionId: 'debug-q4',
                questionText: 'Where do you see yourself in 5 years?',
                answerText: 'I see myself in a senior leadership role, mentoring others and driving technical strategy.'
            })
        });

        const data2 = await res2.json();

        console.log(`Status: ${res2.status}`);
        console.log('');
        console.log('Debug Field:');
        console.log(JSON.stringify(data2.debug, null, 2));
        console.log('');
        console.log('Usage Field:');
        console.log(JSON.stringify(data2.usage, null, 2));
        console.log('');

        if (data2.debug) {
            console.log('✅ Debug field present');
            console.log(`   identityType: ${data2.debug.identityType}`);
            console.log(`   identityKey: ${data2.debug.identityKey}`);
            console.log(`   identitySource: ${data2.debug.identitySource}`);
            console.log(`   used: ${data2.debug.used}`);
            console.log(`   limit: ${data2.debug.limit}`);
        } else {
            console.log('❌ No debug field in response');
        }

        if (res2.status === 429 && data2.blocked) {
            console.log('');
            console.log('✅ Correctly blocked on 4th attempt');
        } else {
            console.log('');
            console.log('❌ Expected 429 but got', res2.status);
        }

    } catch (error) {
        console.error('ERROR:', error.message);
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('TEST COMPLETE');
    console.log('');
    console.log('Next: Check Railway logs for server-side logging output');
    console.log('Expected log format:');
    console.log('  [PRACTICE ANSWER] IDENTITY RESOLVED:');
    console.log('    - identityType: guest');
    console.log(`    - identityKey: ${GUEST_KEY}`);
    console.log('    - identitySource: x-user-key');
    console.log('  [PRACTICE ANSWER] USAGE CHECK:');
    console.log('    - isPro: false');
    console.log('    - used: 1 (or 3 for blocked)');
    console.log('    - limit: 3');
    console.log('    - decision: ALLOWED (or BLOCKED)');
    console.log('='.repeat(80));
}

testIdentityDebug().catch(console.error);
