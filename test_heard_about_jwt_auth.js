// jobspeak-backend/test_heard_about_jwt_auth.js
// Comprehensive test for /api/profile/heard-about with JWT authentication
// Verifies write-once behavior and provides proof

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const PRODUCTION_URL = 'https://jobspeakpro.com';
const LOCAL_URL = 'http://localhost:3000';
// Default to production for testing deployed endpoint
const BASE_URL = process.env.TEST_URL || PRODUCTION_URL;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

if (!supabaseAnonKey) {
    console.error('❌ Missing SUPABASE_ANON_KEY or SUPABASE_KEY (needed for user login)');
    console.error('   Note: Service role key cannot be used for user authentication');
    process.exit(1);
}

// Test user credentials
const TEST_EMAIL = 'jsp.qa.001@jobspeakpro-test.local';
const TEST_PASSWORD = 'jsp.qa.001@jobspeakpro-test.local';

// Create Supabase clients
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

/**
 * Get current heard_about_us value from user_metadata
 */
async function getCurrentHeardAbout(userId) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) {
        console.error('   ❌ Error fetching user:', error.message);
        return null;
    }
    return data.user.user_metadata?.heard_about_us || null;
}

/**
 * Reset heard_about_us to null (for testing)
 */
async function resetHeardAbout(userId) {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!userData) return false;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
            ...userData.user.user_metadata,
            heard_about_us: null
        }
    });

    if (error) {
        console.error('   ❌ Error resetting:', error.message);
        return false;
    }
    return true;
}

/**
 * Test the heard-about endpoint with JWT token
 */
async function testHeardAboutWithJWT(jwtToken, value, testName) {
    const url = `${BASE_URL}/api/profile/heard-about`;
    
    console.log(`\n${testName}`);
    console.log('─'.repeat(60));
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value })
    });

    const responseData = await response.json();
    const status = response.status;

    console.log(`   Status: ${status}`);
    console.log(`   Response: ${JSON.stringify(responseData, null, 2)}`);

    // Generate curl command
    console.log(`\n   📋 CURL Command:`);
    console.log(`   curl -X POST ${url} \\`);
    console.log(`     -H "Authorization: Bearer ${jwtToken.substring(0, 20)}..." \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"value":"${value}"}'`);

    return { status, data: responseData };
}

async function runTest() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  JWT AUTHENTICATION TEST: /api/profile/heard-about');
    console.log('═══════════════════════════════════════════════════════════\n');

    let userId = null;
    let jwtToken = null;

    try {
        // Step 1: Login to get JWT token
        console.log('STEP 1: Logging in to get JWT token...');
        const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });

        if (signInError || !signInData.session) {
            console.error('❌ Login failed:', signInError?.message || 'No session');
            process.exit(1);
        }

        userId = signInData.user.id;
        jwtToken = signInData.session.access_token;

        console.log('✅ Login successful');
        console.log(`   User ID: ${userId}`);
        console.log(`   Email: ${signInData.user.email}`);
        console.log(`   JWT Token: ${jwtToken.substring(0, 30)}...`);

        // Step 2: Reset heard_about_us to null for clean test
        console.log('\nSTEP 2: Resetting heard_about_us to null for clean test...');
        const resetSuccess = await resetHeardAbout(userId);
        if (resetSuccess) {
            console.log('✅ Reset successful (value is now null)');
        } else {
            console.log('⚠️  Reset failed, continuing with current value');
        }

        // Verify initial state
        const initialValue = await getCurrentHeardAbout(userId);
        console.log(`   Current value in DB: ${initialValue === null ? 'null' : initialValue}`);

        // Step 3: First write (should succeed with updated:true)
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('TEST 1: First Write (should succeed)');
        console.log('═══════════════════════════════════════════════════════════');
        
        const firstWrite = await testHeardAboutWithJWT(jwtToken, 'TikTok', 'First Write Test');
        
        // Verify database state after first write
        const afterFirstWrite = await getCurrentHeardAbout(userId);
        console.log(`\n   📊 Database State After First Write:`);
        console.log(`   heard_about_us = ${afterFirstWrite === null ? 'null' : `'${afterFirstWrite}'`}`);

        // Validate first write
        if (firstWrite.status === 200 && firstWrite.data.success && firstWrite.data.updated === true) {
            console.log('\n   ✅ FIRST WRITE: SUCCESS');
            console.log('   ✓ Status: 200');
            console.log(' ✓ Response: success=true, updated=true');
            console.log(`   ✓ Value set: ${firstWrite.data.value}`);
        } else {
            console.log('\n   ❌ FIRST WRITE: FAILED');
            console.log(`   Expected: status=200, success=true, updated=true`);
            console.log(`   Got: status=${firstWrite.status}, success=${firstWrite.data.success}, updated=${firstWrite.data.updated}`);
        }

        if (afterFirstWrite === 'TikTok') {
            console.log('   ✓ Database updated correctly');
        } else {
            console.log(`   ❌ Database not updated correctly. Expected 'TikTok', got: ${afterFirstWrite}`);
        }

        // Step 4: Second write (should return updated:false)
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('TEST 2: Second Write (should ignore, return updated:false)');
        console.log('═══════════════════════════════════════════════════════════');
        
        const secondWrite = await testHeardAboutWithJWT(jwtToken, 'LinkedIn', 'Second Write Test (should be ignored)');
        
        // Verify database state after second write (should be unchanged)
        const afterSecondWrite = await getCurrentHeardAbout(userId);
        console.log(`\n   📊 Database State After Second Write:`);
        console.log(`   heard_about_us = ${afterSecondWrite === null ? 'null' : `'${afterSecondWrite}'`}`);

        // Validate second write
        if (secondWrite.status === 200 && secondWrite.data.success && secondWrite.data.updated === false) {
            console.log('\n   ✅ SECOND WRITE: SUCCESS (correctly ignored)');
            console.log('   ✓ Status: 200');
            console.log('   ✓ Response: success=true, updated=false');
            console.log(`   ✓ Original value preserved: ${secondWrite.data.value}`);
        } else {
            console.log('\n   ❌ SECOND WRITE: FAILED');
            console.log(`   Expected: status=200, success=true, updated=false`);
            console.log(`   Got: status=${secondWrite.status}, success=${secondWrite.data.success}, updated=${secondWrite.data.updated}`);
        }

        if (afterSecondWrite === 'TikTok' && afterSecondWrite !== 'LinkedIn') {
            console.log('   ✓ Database unchanged (write-once protection working)');
        } else {
            console.log(`   ❌ Database was changed! Expected 'TikTok', got: ${afterSecondWrite}`);
        }

        // Step 5: Third write with different value (should still be ignored)
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('TEST 3: Third Write with Different Value (should still be ignored)');
        console.log('═══════════════════════════════════════════════════════════');
        
        const thirdWrite = await testHeardAboutWithJWT(jwtToken, 'Facebook', 'Third Write Test (should be ignored)');
        
        // Verify database state after third write (should still be unchanged)
        const afterThirdWrite = await getCurrentHeardAbout(userId);
        console.log(`\n   📊 Database State After Third Write:`);
        console.log(`   heard_about_us = ${afterThirdWrite === null ? 'null' : `'${afterThirdWrite}'`}`);

        if (thirdWrite.status === 200 && thirdWrite.data.success && thirdWrite.data.updated === false && afterThirdWrite === 'TikTok') {
            console.log('\n   ✅ THIRD WRITE: SUCCESS (correctly ignored)');
            console.log('   ✓ Write-once protection confirmed');
        } else {
            console.log('\n   ❌ THIRD WRITE: FAILED');
        }

        // Final Summary
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  FINAL SUMMARY & PROOF');
        console.log('═══════════════════════════════════════════════════════════');
        
        const jwtWorking = firstWrite.status === 200 || secondWrite.status === 200;
        const firstWriteSuccess = firstWrite.status === 200 && firstWrite.data.success && firstWrite.data.updated === true;
        const writeOnceWorking = afterSecondWrite === 'TikTok' && afterThirdWrite === 'TikTok';
        const dbIntegrity = afterThirdWrite === 'TikTok';
        
        console.log(`✅ JWT Authentication: ${jwtWorking ? 'WORKING' : 'FAILED'}`);
        console.log(`   Status: ${firstWrite.status} (expected: 200)`);
        console.log(`✅ First Write: ${firstWriteSuccess ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   Response: success=${firstWrite.data.success}, updated=${firstWrite.data.updated}`);
        console.log(`✅ Write-Once Protection: ${writeOnceWorking ? 'WORKING' : 'FAILED'}`);
        console.log(`   After 2nd write: ${afterSecondWrite}`);
        console.log(`   After 3rd write: ${afterThirdWrite}`);
        console.log(`✅ Database Integrity: ${dbIntegrity ? 'PRESERVED' : 'COMPROMISED'}`);
        console.log(`\n📋 Final Database Value: ${afterThirdWrite === null ? 'null' : `'${afterThirdWrite}'`}`);
        console.log(`📋 User ID: ${userId}`);
        console.log('═══════════════════════════════════════════════════════════\n');
        
        // Generate proof output
        console.log('📸 PROOF OUTPUT (for screenshots/logs):\n');
        console.log('=== TEST 1: First Write ===');
        console.log(`Request: POST ${BASE_URL}/api/profile/heard-about`);
        console.log(`Headers: Authorization: Bearer <JWT_TOKEN>`);
        console.log(`Body: {"value":"TikTok"}`);
        console.log(`Response Status: ${firstWrite.status}`);
        console.log(`Response Body: ${JSON.stringify(firstWrite.data, null, 2)}`);
        console.log(`Database After: heard_about_us = '${afterFirstWrite}'`);
        console.log(`✅ Result: ${firstWriteSuccess ? 'PASS' : 'FAIL'}\n`);
        
        console.log('=== TEST 2: Second Write (Write-Once) ===');
        console.log(`Request: POST ${BASE_URL}/api/profile/heard-about`);
        console.log(`Headers: Authorization: Bearer <JWT_TOKEN>`);
        console.log(`Body: {"value":"LinkedIn"}`);
        console.log(`Response Status: ${secondWrite.status}`);
        console.log(`Response Body: ${JSON.stringify(secondWrite.data, null, 2)}`);
        console.log(`Database After: heard_about_us = '${afterSecondWrite}'`);
        console.log(`✅ Result: ${writeOnceWorking ? 'PASS (correctly ignored)' : 'FAIL'}\n`);
        
        console.log('=== TEST 3: Third Write (Write-Once) ===');
        console.log(`Request: POST ${BASE_URL}/api/profile/heard-about`);
        console.log(`Headers: Authorization: Bearer <JWT_TOKEN>`);
        console.log(`Body: {"value":"Facebook"}`);
        console.log(`Response Status: ${thirdWrite.status}`);
        console.log(`Response Body: ${JSON.stringify(thirdWrite.data, null, 2)}`);
        console.log(`Database After: heard_about_us = '${afterThirdWrite}'`);
        console.log(`✅ Result: ${dbIntegrity ? 'PASS (correctly ignored)' : 'FAIL'}\n`);

        // Provide curl examples
        console.log('📋 CURL EXAMPLES FOR FRONTEND:\n');
        console.log('First Write (should succeed):');
        console.log(`curl -X POST ${BASE_URL}/api/profile/heard-about \\`);
        console.log(`  -H "Authorization: Bearer <JWT_TOKEN> \\`);
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -d '{"value":"TikTok"}'`);
        console.log('\nExpected Response:');
        console.log(JSON.stringify({
            success: true,
            value: "TikTok",
            updated: true
        }, null, 2));

        console.log('\n\nSecond Write (should be ignored):');
        console.log(`curl -X POST ${BASE_URL}/api/profile/heard-about \\`);
        console.log(`  -H "Authorization: Bearer <JWT_TOKEN> \\`);
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -d '{"value":"LinkedIn"}'`);
        console.log('\nExpected Response:');
        console.log(JSON.stringify({
            success: true,
            value: "TikTok",
            updated: false,
            message: "Value already set"
        }, null, 2));

        // Sign out
        await supabaseClient.auth.signOut();

    } catch (error) {
        console.error('\n❌ Test failed with error:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the test
runTest().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

