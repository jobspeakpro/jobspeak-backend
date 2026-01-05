import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const PROD_URL = 'https://jobspeakpro.com';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const QA_USERS = [
    { email: 'jsp.qa.001@jobspeakpro-test.local', pass: 'jsp.qa.001@jobspeakpro-test.local', testVal: 'LinkedIn' },
    { email: 'jsp.qa.002@jobspeakpro-test.local', pass: 'jsp.qa.002@jobspeakpro-test.local', testVal: 'skipped' },
    { email: 'jsp.qa.003@jobspeakpro-test.local', pass: 'jsp.qa.003@jobspeakpro-test.local', testVal: 'Other' }
];

async function runProof() {
    console.log('🔍 STARTING LINKEDIN SUPPORT PROOF...\n');

    // 1. Initial Reset
    console.log('1️⃣  Resetting QA Accounts (001-003) to NULL...');
    for (const u of QA_USERS) {
        await setHeardAboutToNull(u.email);
    }

    // 2. Set Values
    console.log('\n2️⃣  Setting Values (Testing Support)...');

    // Test 001: LinkedIn
    await testSet(QA_USERS[0], QA_USERS[0].testVal);

    // Test 002: skipped
    await testSet(QA_USERS[1], QA_USERS[1].testVal);

    // Test 003: Other
    await testSet(QA_USERS[2], QA_USERS[2].testVal);

    // 3. Overwrite Test (001)
    console.log('\n3️⃣  Testing Overwrite Protection (001)...');
    await testOverwrite(QA_USERS[0], 'MaliciousOverwrite');

    // 4. Final Reset
    console.log('\n4️⃣  Final Reset (Cleaning Up)...');
    for (const u of QA_USERS) {
        await setHeardAboutToNull(u.email);
    }

    console.log('\n✅ PROOF COMPLETE');
}

async function testSet(userObj, val) {
    console.log(`\n   Logging in as ${userObj.email}...`);
    const { data: authData, error } = await supabaseAnon.auth.signInWithPassword({
        email: userObj.email,
        password: userObj.pass
    });
    if (error) {
        console.log(`   ❌ Login Failed: ${error.message}`);
        return;
    }
    const token = authData.session.access_token;
    const userId = authData.user.id;

    console.log(`   Setting value: "${val}"`);
    const res = await fetch(`${PROD_URL}/api/profile/heard-about`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userKey: userId, value: val })
    });
    const json = await res.json();
    console.log(`   Response: ${JSON.stringify(json)}`);

    if (json.success && json.updated && json.value === val) console.log(`   ✅ Success: Value saved correctly.`);
    else console.log(`   ❌ FAILED: Expected ${val}, got ${json.value}`);
}

async function testOverwrite(userObj, newVal) {
    console.log(`   Logging in as ${userObj.email}...`);
    const { data: authData } = await supabaseAnon.auth.signInWithPassword({
        email: userObj.email,
        password: userObj.pass
    });
    const token = authData.session.access_token;
    const userId = authData.user.id;

    console.log(`   Attempting overwrite with: "${newVal}"`);
    const res = await fetch(`${PROD_URL}/api/profile/heard-about`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userKey: userId, value: newVal })
    });
    const json = await res.json();
    console.log(`   Response: ${JSON.stringify(json)}`);

    if (json.success && !json.updated && json.value === userObj.testVal) console.log(`   ✅ Success: Overwrite rejected, original value preserved.`);
    else console.log(`   ❌ FAILED: Protection failed.`);
}

async function setHeardAboutToNull(email) {
    const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
    const user = userData.users.find(u => u.email === email);
    if (!user) { console.log(`   ⚠ User ${email} not found`); return; }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { user_metadata: { ...user.user_metadata, heard_about_us: null } }
    );
    if (!error) console.log(`   ✅ Reset ${email} to NULL`);
    else console.log(`   ❌ Reset Error: ${error.message}`);
}

runProof();
