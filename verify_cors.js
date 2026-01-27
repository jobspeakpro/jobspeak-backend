import fs from 'fs';

const BACKEND_URL = 'https://jobspeak-backend-production.up.railway.app';

async function verifyCORS() {
    console.log('--- CORS Verification ---\n');

    // Test 1: OPTIONS preflight
    console.log('1. Testing OPTIONS preflight...');
    const optionsRes = await fetch(`${BACKEND_URL}/api/affiliate/apply`, {
        method: 'OPTIONS',
        headers: {
            'Origin': 'https://jobspeakpro.com',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
    });

    console.log(`Status: ${optionsRes.status} ${optionsRes.statusText}`);
    console.log('Headers:');
    optionsRes.headers.forEach((value, key) => {
        if (key.toLowerCase().startsWith('access-control')) {
            console.log(`  ${key}: ${value}`);
        }
    });

    // Test 2: POST request
    console.log('\n2. Testing POST request...');
    const postRes = await fetch(`${BACKEND_URL}/api/affiliate/apply`, {
        method: 'POST',
        headers: {
            'Origin': 'https://jobspeakpro.com',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });

    console.log(`Status: ${postRes.status} ${postRes.statusText}`);
    console.log('CORS Headers:');
    postRes.headers.forEach((value, key) => {
        if (key.toLowerCase().startsWith('access-control')) {
            console.log(`  ${key}: ${value}`);
        }
    });

    const body = await postRes.text();
    console.log(`Body: ${body.substring(0, 200)}`);

    // Verify requirements
    console.log('\n--- Verification Results ---');
    const allowOrigin = optionsRes.headers.get('access-control-allow-origin');
    const allowMethods = optionsRes.headers.get('access-control-allow-methods');
    const allowHeaders = optionsRes.headers.get('access-control-allow-headers');

    console.log(`✓ Allow-Origin: ${allowOrigin === 'https://jobspeakpro.com' ? '✅ PASS' : '❌ FAIL'} (${allowOrigin})`);
    console.log(`✓ Allow-Methods: ${allowMethods?.includes('PUT') && allowMethods?.includes('PATCH') && allowMethods?.includes('DELETE') ? '✅ PASS' : '❌ FAIL'} (${allowMethods})`);
    console.log(`✓ Allow-Headers: ${allowHeaders?.includes('Content-Type') && allowHeaders?.includes('Authorization') ? '✅ PASS' : '❌ FAIL'} (${allowHeaders})`);
    console.log(`✓ OPTIONS Status: ${optionsRes.status === 204 || optionsRes.status === 200 ? '✅ PASS' : '❌ FAIL'} (${optionsRes.status})`);
    console.log(`✓ POST Status: ${postRes.status === 400 ? '✅ PASS (validation error as expected)' : `⚠️  ${postRes.status}`}`);
}

verifyCORS();
