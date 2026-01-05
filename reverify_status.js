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
    { email: 'jsp.qa.001@jobspeakpro-test.local', pass: 'jsp.qa.001@jobspeakpro-test.local', label: '001' },
    { email: 'jsp.qa.002@jobspeakpro-test.local', pass: 'jsp.qa.002@jobspeakpro-test.local', label: '002' },
    { email: 'jsp.qa.003@jobspeakpro-test.local', pass: 'jsp.qa.003@jobspeakpro-test.local', label: '003' }
];

async function checkAndReset() {
    console.log('🔍 RE-VERIFYING QA STATUS...\n');

    // 1. Check current status
    for (const u of QA_USERS) {
        await verifyNull(u.email);
    }

    // 2. Perform Quick Validation Test (LinkedIn)
    console.log('\n🧪 Quick LinkedIn Support Test (on 001)...');

    // Login 001
    const { data: authData } = await supabaseAnon.auth.signInWithPassword({
        email: QA_USERS[0].email,
        password: QA_USERS[0].pass
    });
    const token = authData.session.access_token;
    const userId = authData.user.id;

    // Set LinkedIn
    const res = await fetch(`${PROD_URL}/api/profile/heard-about`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userKey: userId, value: 'LinkedIn' })
    });
    const json = await res.json();
    console.log(`   SET 'LinkedIn' Response: ${JSON.stringify(json)}`);

    // Verify Overwrite Reject
    const res2 = await fetch(`${PROD_URL}/api/profile/heard-about`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userKey: userId, value: 'OverwriteTry' })
    });
    const json2 = await res2.json();
    console.log(`   OVERWRITE Response: ${JSON.stringify(json2)}`);

    // 3. FINAL RESET ALL
    console.log('\n🔄 Final Reset of ALL QA Accounts...');
    for (const u of QA_USERS) {
        await setHeardAboutToNull(u.email);
        await verifyNull(u.email); // Prove it
    }
}

async function verifyNull(email) {
    const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
    const user = userData.users.find(u => u.email === email);
    if (!user) return;
    const val = user.user_metadata?.heard_about_us;
    console.log(`   Status ${email}: ${val === undefined || val === null ? 'NULL' : val}`);
}

async function setHeardAboutToNull(email) {
    const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
    const user = userData.users.find(u => u.email === email);
    if (!user) return;
    await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { user_metadata: { ...user.user_metadata, heard_about_us: null } }
    );
}

checkAndReset();
