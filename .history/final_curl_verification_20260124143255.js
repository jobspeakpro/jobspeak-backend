import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const BASE_URL = 'http://localhost:3000';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const results = [];

async function testEndpoint(name, url, method, body, authUser) {
    console.log(`\nTesting ${name} (${method} ${url})...`);

    const headers = { 'Content-Type': 'application/json' };
    if (authUser) {
        // Mocking auth by passing userKey? No, new system uses standard auth.
        // We need an actual JWT or we trust the middleware accepts x-user-key for testing?
        // Let's assume we can pass a test user ID if we hack the middleware or use a real JWT.
        // Given we don't have a frontend to login, we'll try to use a valid JWT if we have one, 
        // OR rely on the backend accepting x-user-key/x-guest-key if that mode is enabled.
        // But referals.js uses `getAuthenticatedUser(req)` which looks for `req.user` or `authorization`.
        // We might need to sign a dummy JWT if we have the secret, OR create a real session.
        // Let's try signing in via Supabase REST to get a token!
    }

    try {
        let token = null;
        if (authUser) {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: authUser.email,
                password: authUser.password
            });
            if (error) throw new Error(`Auth failed for ${authUser.email}: ${error.message}`);
            token = data.session.access_token;
            headers['Authorization'] = `Bearer ${token}`;
        }

        const opts = { method, headers };
        if (body) opts.body = JSON.stringify(body);

        const res = await fetch(`${BASE_URL}${url}`, opts);
        const data = await res.json();

        const success = res.ok;
        const result = { name, url, method, status: res.status, success, response: data, curl: `curl -X ${method} ${BASE_URL}${url} ${authTokenToCurl(token)} ${body ? `-d '${JSON.stringify(body)}'` : ''}` };
        results.push(result);

        if (success) console.log(`   ✅ PASS: ${res.status}`);
        else console.log(`   ❌ FAIL: ${res.status} - ${JSON.stringify(data)}`);

        return data;
    } catch (e) {
        console.error(`   ❌ FAIL: Exception - ${e.message}`);
        results.push({ name, url, method, success: false, error: e.message });
        return null;
    }
}

function authTokenToCurl(token) {
    return token ? `-H "Authorization: Bearer ${token.substring(0, 10)}..."` : '';
}

async function run() {
    // 1. Create Users
    console.log("Preparing users...");
    const emailA = `curl_ref_${Date.now()}@example.com`;
    const emailB = `curl_usr_${Date.now()}@example.com`;
    const pwd = 'Password123!';

    await supabase.auth.signUp({ email: emailA, password: pwd });
    await supabase.auth.signUp({ email: emailB, password: pwd });

    // Wait for triggers
    await new Promise(r => setTimeout(r, 2000));

    // 2. Test Get Code (User A)
    const codeData = await testEndpoint(
        'Get Referral Code',
        '/api/referrals/code',
        'GET',
        null,
        { email: emailA, password: pwd }
    );
    const referralCode = codeData?.referralCode;

    // 3. Test Track (User B)
    if (referralCode) {
        await testEndpoint(
            'Track Referral',
            '/api/referrals/track',
            'POST',
            { referralCode },
            { email: emailB, password: pwd }
        );
    }

    // 4. Test History (User A)
    await testEndpoint(
        'Get History',
        '/api/referrals/history',
        'GET',
        null,
        { email: emailA, password: pwd }
    );

    // 5. Test Affiliate Apply (Public/Auth)
    await testEndpoint(
        'Affiliate Apply',
        '/api/affiliate/apply',
        'POST',
        {
            name: 'Curl Test',
            email: 'curl@example.com',
            platform: 'CLI',
            audienceSize: '100',
            channelLink: 'http://example.com',
            promoPlan: 'Testing'
        }
    );

    // 6. Test Support Contact
    await testEndpoint(
        'Support Contact',
        '/api/support/contact',
        'POST',
        {
            email: 'user@example.com',
            message: 'Hello from curl',
            subject: 'Test',
            name: 'Curl User'
        }
    );

    // Output Report
    console.log("\n\n=== VERIFICATION REPORT ===");
    results.forEach(r => {
        console.log(`\nEndpoint: ${r.method} ${r.url}`);
        console.log(`Status: ${r.success ? 'PASS' : 'FAIL'} (${r.status || 'Error'})`);
        console.log(`Curl: ${r.curl}`);
        console.log(`Response: ${JSON.stringify(r.response)}`);
    });
}

run();
