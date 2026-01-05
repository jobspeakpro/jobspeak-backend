import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const API_BASE = 'https://jobspeak-backend-production.up.railway.app';
const PROD_URL = 'https://jobspeakpro.com';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const QA_USER_EMAIL = 'jsp.qa.001@jobspeakpro-test.local';
const QA_USER_PASS = 'jsp.qa.001@jobspeakpro-test.local';
const QA_USER_2_EMAIL = 'jsp.qa.002@jobspeakpro-test.local';

async function runProof() {
    console.log('🔍 STARTING FINAL PROOF (Debug Mode)...\n');

    // 1. Health Check
    console.log('1️⃣  Checking /api/health...');
    try {
        const healthRes = await fetch(`${PROD_URL}/api/health`);
        const healthJson = await healthRes.json();
        console.log(`   CURL GET ${PROD_URL}/api/health`);
        if (healthRes.ok) console.log(`   ✅ Health Check Passed (200 OK)`);
        else console.log(`   ❌ Health Check Failed: ${healthRes.status}`);
    } catch (e) {
        console.log(`   ❌ Health Check Error: ${e.message}`);
    }

    // 2. Reset jsp.qa.001 to NULL
    console.log('\n🔄 Pre-test: Resetting jsp.qa.001 to NULL...');
    await setHeardAboutToNull(QA_USER_EMAIL);

    // Verify it is NULL before proceeding
    const isNull = await verifyNull(QA_USER_EMAIL, true);
    if (!isNull) {
        console.log('   🛑 STOPPING: Could not reset user to NULL. Check DB permissions or User ID.');
        return;
    }

    // 3. Login as jsp.qa.001
    console.log('\n🔐 Logging in as jsp.qa.001...');
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
        email: QA_USER_EMAIL,
        password: QA_USER_PASS
    });
    if (authError) {
        console.error(`   ❌ Login failed: ${authError.message}`);
        return;
    }
    const token = authData.session.access_token;
    const userId = authData.user.id;
    console.log(`   ✅ Logged in. User ID: ${userId}`);

    // 4. Set heard_about_us (Success)
    console.log('\n2️⃣  Testing WRITE (First Time)...');
    const firstPayload = { userKey: userId, value: 'ProofWaitList' };
    console.log(`   CURL POST ${PROD_URL}/api/profile/heard-about`);

    const res1 = await fetch(`${PROD_URL}/api/profile/heard-about`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(firstPayload)
    });
    const json1 = await res1.json();
    console.log(`   RESPONSE: ${JSON.stringify(json1)}`);
    if (json1.success && json1.updated) console.log('   ✅ First Write Success');
    else console.log('   ❌ First Write Failed');

    // 5. Overwrite Attempt (Fail)
    console.log('\n3️⃣  Testing OVERWRITE (Should Fail)...');
    const secondPayload = { userKey: userId, value: 'OverwriteAttempt' };
    console.log(`   CURL POST ${PROD_URL}/api/profile/heard-about`);

    const res2 = await fetch(`${PROD_URL}/api/profile/heard-about`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(secondPayload)
    });
    const json2 = await res2.json();
    console.log(`   RESPONSE: ${JSON.stringify(json2)}`);
    if (json2.success && !json2.updated && json2.value === 'ProofWaitList') console.log('   ✅ Overwrite Rejected (Correct)');
    else console.log('   ❌ Overwrite Check Failed');

    // 6. Final Reset and Prove NULL
    console.log('\n4️⃣  Final Reset & Proof...');
    await setHeardAboutToNull(QA_USER_EMAIL);
    await setHeardAboutToNull(QA_USER_2_EMAIL);

    console.log('\n✅ FINAL STATUS CHECK:');
    await verifyNull(QA_USER_EMAIL, false);
    await verifyNull(QA_USER_2_EMAIL, false);
}

async function setHeardAboutToNull(email) {
    const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
    const user = userData.users.find(u => u.email === email);
    if (!user) {
        console.log(`   ⚠ User ${email} not found`);
        return;
    }

    // Update user_metadata in auth.users
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { user_metadata: { ...user.user_metadata, heard_about_us: null } }
    );

    if (error) console.log(`   ❌ Reset Error for ${email}: ${error.message}`);
    else console.log(`   ✅ Reset ${email} metadata to NULL`);
}

async function verifyNull(email, quiet) {
    const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
    const user = userData.users.find(u => u.email === email);
    if (!user) return false;

    // Check user_metadata
    const val = user.user_metadata?.heard_about_us;

    if (!quiet) console.log(`   🔍 Meta Check for ${email}: ${val === null ? 'NULL' : val}`);
    return val === null || val === undefined;
}

runProof();
