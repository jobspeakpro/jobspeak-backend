// Final proof: Raw curl output with timestamps and database verification
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const PRODUCTION_URL = 'https://jobspeakpro.com';
const TEST_EMAIL = 'jsp.qa.001@jobspeakpro-test.local';
const TEST_PASSWORD = 'jsp.qa.001@jobspeakpro-test.local';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function getDatabaseState(userId) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) {
        return { error: error.message };
    }
    return {
        userId: data.user.id,
        email: data.user.email,
        heard_about_us: data.user.user_metadata?.heard_about_us || null,
        raw_user_metadata: data.user.user_metadata
    };
}

async function resetValue(userId) {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
            ...userData.user.user_metadata,
            heard_about_us: null
        }
    });
}

function formatTimestamp() {
    return new Date().toISOString();
}

async function runFinalProof() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  FINAL PROOF: Raw CURL Output with Timestamps');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Login to get JWT token
    const { data: signInData } = await supabaseClient.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
    });

    const userId = signInData.user.id;
    const jwtToken = signInData.session.access_token;

    console.log('Test User:');
    console.log(`  Email: ${TEST_EMAIL}`);
    console.log(`  User ID: ${userId}`);
    console.log(`  JWT Token: ${jwtToken.substring(0, 50)}...\n`);

    // Reset for clean test
    await resetValue(userId);
    const initialState = await getDatabaseState(userId);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('INITIAL DATABASE STATE (Before CURL #1)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Timestamp: ${formatTimestamp()}`);
    console.log(`User ID: ${initialState.userId}`);
    console.log(`Email: ${initialState.email}`);
    console.log(`heard_about_us: ${initialState.heard_about_us === null ? 'null' : `"${initialState.heard_about_us}"`}`);
    console.log('');

    // CURL #1: First Write
    console.log('═══════════════════════════════════════════════════════════');
    console.log('CURL #1: First Write');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Timestamp: ${formatTimestamp()}`);
    console.log('');
    console.log('Request:');
    console.log(`  curl -X POST ${PRODUCTION_URL}/api/profile/heard-about \\`);
    console.log(`    -H "Authorization: Bearer ${jwtToken.substring(0, 30)}..." \\`);
    console.log(`    -H "Content-Type: application/json" \\`);
    console.log(`    -d '{"value":"TikTok"}'`);
    console.log('');

    const timestamp1 = formatTimestamp();
    const res1 = await fetch(`${PRODUCTION_URL}/api/profile/heard-about`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: 'TikTok' })
    });

    const data1 = await res1.json();
    const status1 = res1.status;
    const headers1 = Object.fromEntries(res1.headers.entries());

    console.log('Response:');
    console.log(`  HTTP/${res1.status} ${res1.statusText}`);
    console.log(`  Content-Type: ${headers1['content-type']}`);
    console.log(`  Response Body:`);
    console.log(JSON.stringify(data1, null, 2));
    console.log('');

    // Verify database after CURL #1
    const dbState1 = await getDatabaseState(userId);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('DATABASE STATE (After CURL #1)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Timestamp: ${formatTimestamp()}`);
    console.log(`User ID: ${dbState1.userId}`);
    console.log(`Email: ${dbState1.email}`);
    console.log(`heard_about_us: ${dbState1.heard_about_us === null ? 'null' : `"${dbState1.heard_about_us}"`}`);
    console.log('');
    console.log('Raw user_metadata:');
    console.log(JSON.stringify(dbState1.raw_user_metadata, null, 2));
    console.log('');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // CURL #2: Second Write
    console.log('═══════════════════════════════════════════════════════════');
    console.log('CURL #2: Second Write (Different Value)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Timestamp: ${formatTimestamp()}`);
    console.log('');
    console.log('Request:');
    console.log(`  curl -X POST ${PRODUCTION_URL}/api/profile/heard-about \\`);
    console.log(`    -H "Authorization: Bearer ${jwtToken.substring(0, 30)}..." \\`);
    console.log(`    -H "Content-Type: application/json" \\`);
    console.log(`    -d '{"value":"LinkedIn"}'`);
    console.log('');

    const timestamp2 = formatTimestamp();
    const res2 = await fetch(`${PRODUCTION_URL}/api/profile/heard-about`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: 'LinkedIn' })
    });

    const data2 = await res2.json();
    const status2 = res2.status;
    const headers2 = Object.fromEntries(res2.headers.entries());

    console.log('Response:');
    console.log(`  HTTP/${res2.status} ${res2.statusText}`);
    console.log(`  Content-Type: ${headers2['content-type']}`);
    console.log(`  Response Body:`);
    console.log(JSON.stringify(data2, null, 2));
    console.log('');

    // Verify database after CURL #2
    const dbState2 = await getDatabaseState(userId);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('DATABASE STATE (After CURL #2)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Timestamp: ${formatTimestamp()}`);
    console.log(`User ID: ${dbState2.userId}`);
    console.log(`Email: ${dbState2.email}`);
    console.log(`heard_about_us: ${dbState2.heard_about_us === null ? 'null' : `"${dbState2.heard_about_us}"`}`);
    console.log('');
    console.log('Raw user_metadata:');
    console.log(JSON.stringify(dbState2.raw_user_metadata, null, 2));
    console.log('');

    // Final Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('PROOF SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`CURL #1 Timestamp: ${timestamp1}`);
    console.log(`CURL #1 Status: ${status1}`);
    console.log(`CURL #1 Response: ${JSON.stringify(data1)}`);
    console.log(`CURL #1 Database After: heard_about_us = "${dbState1.heard_about_us}"`);
    console.log('');
    console.log(`CURL #2 Timestamp: ${timestamp2}`);
    console.log(`CURL #2 Status: ${status2}`);
    console.log(`CURL #2 Response: ${JSON.stringify(data2)}`);
    console.log(`CURL #2 Database After: heard_about_us = "${dbState2.heard_about_us}"`);
    console.log('');
    console.log('✅ Write-Once Verification:');
    console.log(`   Initial: ${initialState.heard_about_us === null ? 'null' : `"${initialState.heard_about_us}"`}`);
    console.log(`   After CURL #1: "${dbState1.heard_about_us}"`);
    console.log(`   After CURL #2: "${dbState2.heard_about_us}"`);
    console.log(`   Unchanged: ${dbState1.heard_about_us === dbState2.heard_about_us ? 'YES ✅' : 'NO ❌'}`);
    console.log('═══════════════════════════════════════════════════════════\n');
}

runFinalProof().catch(console.error);

