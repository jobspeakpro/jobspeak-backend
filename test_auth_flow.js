
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const INVITE_CODE = process.env.SIGNUP_INVITE_CODE;
const TEST_EMAIL_BASE = `qa.signup.${Date.now()}@example.com`;

async function testSignup(email, inviteCode, expectSuccess = true) {
    console.log(`\n🧪 Testing Signup: ${email} (Code: ${inviteCode})`);
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password: 'TestPassword123!',
            firstName: 'QA Tester',
            inviteCode
        })
    });

    const data = await res.json();

    if (expectSuccess) {
        if (res.ok && data.ok && data.actionLink) {
            console.log(`✅ Success! Action Link: ${data.actionLink.substring(0, 50)}...`);
            return { success: true, actionLink: data.actionLink };
        } else {
            console.error(`❌ Failed (Expected Success):`, data);
            return { success: false };
        }
    } else {
        if (!res.ok && !data.ok) {
            console.log(`✅ Correctly Failed: ${data.code}`);
            return { success: true, code: data.code };
        } else {
            console.error(`❌ Unexpected Success:`, data);
            return { success: false };
        }
    }
}

async function testLogin(email, password) {
    console.log(`\n🧪 Testing Login: ${email}`);
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok && data.ok && data.session) {
        console.log(`✅ Login Success! User ID: ${data.user.id}`);
        return true;
    } else {
        console.error(`❌ Login Failed:`, data);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Starting Auth Verification Tests...');

    // 1. Invalid Invite Code
    await testSignup(`invalid.${Date.now()}@example.com`, 'WRONG_CODE', false);

    // 2. Valid Signup
    const email = TEST_EMAIL_BASE;
    const signupResult = await testSignup(email, INVITE_CODE, true);

    // 3. Rate Limit Test (Attempt 5 more times to hit limit)
    if (signupResult.success) {
        console.log('\n🧪 Testing Rate Limit (Spamming requests)...');
        for (let i = 0; i < 6; i++) {
            const spamEmail = `spam.${i}.${Date.now()}@example.com`;
            const res = await testSignup(spamEmail, INVITE_CODE, i < 5); // 5th adds to count, 6th should fail (if limit is 5)
            // Note: First request was earlier.
            // Limit is 5 per hour.
            // Request 1: Valid Signup (Count 1)
            // Loop i=0 to 3: (Count 2, 3, 4, 5) -> Should succeed
            // Loop i=4: (Count 6) -> Should fail
        }
    }

    // 4. Real Login (using the account created in step 2)
    // Note: Email is not confirmed, so login *might* fail depending on Supabase settings "Enable email confirmations".
    // If "Enable email confirmations" is ON, users cannot sign in until they click the link.
    // We can try to sign in. If it fails with "Email not confirmed", that verifies we hit Supabase.

    console.log('\n🧪 Testing Login with unconfirmed credential...');
    await testLogin(email, 'TestPassword123!');

    console.log('\n🏁 Tests Completed.');
}

runTests();
