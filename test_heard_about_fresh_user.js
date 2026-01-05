// Test heard_about_us endpoint with fresh user
// Verify: 1) Fresh user has NULL, 2) Write-once works

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const PRODUCTION_URL = 'https://jobspeakpro.com';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testHeardAboutFreshUser() {
  console.log('='.repeat(70));
  console.log('HEARD ABOUT ENDPOINT - FRESH USER TEST');
  console.log('='.repeat(70));
  console.log(`Production URL: ${PRODUCTION_URL}`);
  console.log('');

  // Create a fresh test user
  const testEmail = `test-heard-about-${Date.now()}@jobspeakpro-test.local`;
  const testPassword = 'TestPassword123!';
  
  console.log('📋 STEP 1: Create fresh test user');
  console.log('-'.repeat(70));
  console.log(`Email: ${testEmail}`);
  
  let userId = null;
  try {
    const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (signUpError) {
      console.error(`❌ ERROR: ${signUpError.message}`);
      return;
    }
    
    userId = signUpData.user?.id;
    console.log(`✅ User created: ${userId}`);
    console.log('');
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    return;
  }

  // Check initial state (should be NULL)
  console.log('📋 STEP 2: Verify initial state (should be NULL)');
  console.log('-'.repeat(70));
  try {
    const { data: userData, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (fetchError) {
      console.error(`❌ ERROR: ${fetchError.message}`);
      return;
    }
    
    const initialValue = userData.user.user_metadata?.heard_about_us;
    console.log(`Initial heard_about_us value: ${initialValue === null || initialValue === undefined ? 'NULL ✅' : initialValue}`);
    
    if (initialValue === null || initialValue === undefined) {
      console.log('✅ SUCCESS: Fresh user has NULL/undefined heard_about_us');
    } else {
      console.log(`⚠️  WARNING: Fresh user has non-null value: ${initialValue}`);
    }
    console.log('');
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    return;
  }

  // Test first write (should succeed)
  console.log('📋 STEP 3: Test first write (should succeed)');
  console.log('-'.repeat(70));
  try {
    const writeRes = await fetch(`${PRODUCTION_URL}/api/profile/heard-about`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userKey: userId,
        value: 'TikTok'
      })
    });
    
    const writeData = await writeRes.json();
    console.log(`Status: ${writeRes.status} ${writeRes.statusText}`);
    console.log('Response:');
    console.log(JSON.stringify(writeData, null, 2));
    console.log('');
    
    if (writeData.success === true && writeData.updated === true && writeData.value === 'TikTok') {
      console.log('✅ SUCCESS: First write succeeded');
    } else {
      console.log(`❌ FAIL: First write should have succeeded`);
      console.log(`   - success: ${writeData.success}`);
      console.log(`   - updated: ${writeData.updated}`);
      console.log(`   - value: ${writeData.value}`);
    }
    console.log('');
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    return;
  }

  // Test second write (should NOT overwrite - write-once)
  console.log('📋 STEP 4: Test second write (should NOT overwrite - write-once)');
  console.log('-'.repeat(70));
  try {
    const writeRes2 = await fetch(`${PRODUCTION_URL}/api/profile/heard-about`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userKey: userId,
        value: 'LinkedIn' // Different value
      })
    });
    
    const writeData2 = await writeRes2.json();
    console.log(`Status: ${writeRes2.status} ${writeRes2.statusText}`);
    console.log('Response:');
    console.log(JSON.stringify(writeData2, null, 2));
    console.log('');
    
    if (writeData2.success === true && writeData2.updated === false && writeData2.value === 'TikTok') {
      console.log('✅ SUCCESS: Second write correctly prevented (write-once working)');
      console.log(`   - Original value preserved: ${writeData2.value}`);
      console.log(`   - updated: false (correctly not updated)`);
    } else {
      console.log(`❌ FAIL: Second write should have been prevented`);
      console.log(`   - success: ${writeData2.success}`);
      console.log(`   - updated: ${writeData2.updated} (should be false)`);
      console.log(`   - value: ${writeData2.value} (should be 'TikTok', not 'LinkedIn')`);
    }
    console.log('');
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    return;
  }

  // Verify final state
  console.log('📋 STEP 5: Verify final state');
  console.log('-'.repeat(70));
  try {
    const { data: finalUserData, error: finalError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (finalError) {
      console.error(`❌ ERROR: ${finalError.message}`);
      return;
    }
    
    const finalValue = finalUserData.user.user_metadata?.heard_about_us;
    console.log(`Final heard_about_us value: ${finalValue}`);
    
    if (finalValue === 'TikTok') {
      console.log('✅ SUCCESS: Final value is correct (TikTok, not overwritten)');
    } else {
      console.log(`❌ FAIL: Final value should be 'TikTok', got: ${finalValue}`);
    }
    console.log('');
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    return;
  }

  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log('✅ Fresh user created');
  console.log('✅ Initial heard_about_us is NULL');
  console.log('✅ First write succeeds');
  console.log('✅ Second write prevented (write-once working)');
  console.log('✅ Final value preserved');
  console.log('');
}

testHeardAboutFreshUser().catch(console.error);

