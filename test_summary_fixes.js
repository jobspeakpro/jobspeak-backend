// Test script to verify summary fixes
// Run with: node test_summary_fixes.js

const BASE_URL = 'http://localhost:3000';

async function testSummaryVersion() {
    console.log('\n=== TEST 1: Verify version stamp ===');

    // Use a test sessionId (or create one first if needed)
    const sessionId = 'test-session-' + Date.now();

    try {
        const res = await fetch(`${BASE_URL}/api/mock-interview/summary?sessionId=${sessionId}`);
        const data = await res.json();

        console.log('Response status:', res.status);
        console.log('Version field:', data.version);
        console.log('AttemptCount:', data.attemptCount);
        console.log('TotalQuestions:', data.totalQuestions);

        if (data.version === 'summary_fix_v3') {
            console.log('✅ PASS: Version stamp is correct');
        } else {
            console.log('❌ FAIL: Version stamp is', data.version, 'expected summary_fix_v3');
        }

        if (data.attemptCount <= data.totalQuestions) {
            console.log('✅ PASS: attemptCount <= totalQuestions');
        } else {
            console.log('❌ FAIL: attemptCount > totalQuestions');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function testTTSEndpoint() {
    console.log('\n=== TEST 2: Verify TTS returns audio ===');

    try {
        const res = await fetch(`${BASE_URL}/api/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: 'Test audio generation',
                voiceId: 'us_female_emma'
            })
        });

        console.log('Response status:', res.status);
        console.log('Content-Type:', res.headers.get('content-type'));

        if (res.headers.get('content-type') === 'audio/mpeg') {
            console.log('✅ PASS: TTS returns audio/mpeg');
        } else {
            console.log('❌ FAIL: TTS returns', res.headers.get('content-type'));
        }

        // Check server logs for the logging output
        console.log('Check server logs for: [TTS] Returning status=200 content-type=audio/mpeg');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function runTests() {
    console.log('Starting verification tests...');
    await testSummaryVersion();
    await testTTSEndpoint();
    console.log('\n=== Tests complete ===');
}

runTests();
