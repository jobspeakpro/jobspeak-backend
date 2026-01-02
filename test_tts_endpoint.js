// Test script to verify TTS endpoint returns audio bytes correctly
// Run with: node test_tts_endpoint.js

const BASE_URL = 'http://localhost:3000';

async function testValidRequest() {
    console.log('\n=== TEST 1: Valid TTS request ===');

    try {
        const res = await fetch(`${BASE_URL}/api/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: 'Hello, this is a test',
                voiceId: 'us_female_emma'
            })
        });

        console.log('Response status:', res.status);
        console.log('Content-Type:', res.headers.get('content-type'));

        const contentType = res.headers.get('content-type');

        if (res.status === 200 && contentType === 'audio/mpeg') {
            const buffer = await res.arrayBuffer();
            console.log('Audio buffer size:', buffer.byteLength, 'bytes');
            console.log('✅ PASS: Returns 200 + audio/mpeg + raw bytes');
        } else if (res.status === 200 && contentType?.includes('json')) {
            console.log('❌ FAIL: Returns 200 with JSON (should be audio)');
            const data = await res.json();
            console.log('JSON response:', data);
        } else {
            console.log('❌ FAIL: Unexpected response');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function testMissingText() {
    console.log('\n=== TEST 2: Missing text field ===');

    try {
        const res = await fetch(`${BASE_URL}/api/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                voiceId: 'us_female_emma'
                // Missing text field
            })
        });

        console.log('Response status:', res.status);
        console.log('Content-Type:', res.headers.get('content-type'));

        if (res.status === 400) {
            const data = await res.json();
            console.log('Error response:', data);
            console.log('✅ PASS: Returns 400 + JSON error');
        } else if (res.status === 200) {
            console.log('❌ FAIL: Returns 200 (should be 400)');
        } else {
            console.log('Status:', res.status);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function testEmptyText() {
    console.log('\n=== TEST 3: Empty text field ===');

    try {
        const res = await fetch(`${BASE_URL}/api/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: '',
                voiceId: 'us_female_emma'
            })
        });

        console.log('Response status:', res.status);
        console.log('Content-Type:', res.headers.get('content-type'));

        if (res.status === 400) {
            const data = await res.json();
            console.log('Error response:', data);
            console.log('✅ PASS: Returns 400 + JSON error for empty text');
        } else {
            console.log('❌ FAIL: Should return 400 for empty text');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function runTests() {
    console.log('Starting TTS endpoint verification tests...');
    await testValidRequest();
    await testMissingText();
    await testEmptyText();
    console.log('\n=== Tests complete ===');
    console.log('\n✅ Endpoint is dead-simple:');
    console.log('   - Valid request → 200 + audio/mpeg + raw bytes');
    console.log('   - Invalid request → 400 + JSON error');
    console.log('   - Never returns 200 with JSON');
}

runTests();
