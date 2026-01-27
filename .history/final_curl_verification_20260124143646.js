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

// Admin client for reliable user creation
const adminSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Preparing users via Admin API...");
    const emailA = `curl_ref_${Date.now()}@example.com`;
    const emailB = `curl_usr_${Date.now()}@example.com`;
    const pwd = 'Password123!';

    // Create User A (Referrer)
    const { error: errA } = await adminSupabase.auth.admin.createUser({
        email: emailA,
        password: pwd,
        email_confirm: true
    });
    if (errA) console.warn("User A creation warning:", errA.message);

    // Create User B (Referee)
    const { error: errB } = await adminSupabase.auth.admin.createUser({
        email: emailB,
        password: pwd,
        email_confirm: true
    });
    if (errB) console.warn("User B creation warning:", errB.message);

    // Wait for propagation
    await new Promise(r => setTimeout(r, 1000));

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
    } else {
        console.log("⚠️ SKIPPING TRACK: No code generated.");
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
    // Note: Affiliate apply is public in route but stores user_id if authenticated. 
    // Let's test as authenticated user A to check storage.
    await testEndpoint(
        'Affiliate Apply',
        '/api/affiliate/apply',
        'POST',
        {
            name: 'Curl Authenticated',
            email: emailA,
            platform: 'CLI',
            audienceSize: '10k+',
            channelLink: 'http://example.com/channel',
            promoPlan: 'Big moves'
        },
        { email: emailA, password: pwd }
    );

    // 6. Test Support Contact
    await testEndpoint(
        'Support Contact',
        '/api/support/contact',
        'POST',
        {
            email: 'user@example.com',
            message: 'Hello from curl verification',
            subject: 'E2E Verification',
            name: 'Verification Access'
        }
    );

    // Output Report
    console.log("\n\n=== VERIFICATION REPORT ===");
    results.forEach(r => {
        const icon = r.success ? '✅ PASS' : '❌ FAIL';
        console.log(`\nEndpoint: ${r.method} ${r.url}`);
        console.log(`Status: ${icon} (${r.status})`);

        // Detailed Payload/Response for User Report
        if (r.method === 'POST') {
            // Parse body from curl string or reconstruct? 
            // The testEndpoint function adds body to curl.
        }
        console.log(`Response Shape: ${JSON.stringify(r.response, null, 2)}`);
    });
}

run();
