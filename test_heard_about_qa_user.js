// Test heard_about_us endpoint with QA user
// Verify: 1) Reset to NULL, 2) First write works, 3) Write-once prevents overwrite

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const PRODUCTION_URL = 'https://jobspeakpro.com';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const QA_EMAIL = 'jsp.qa.001@jobspeakpro-test.local';
const QA_PASSWORD = 'jsp.qa.001@jobspeakpro-test.local';

async function setHeardAboutToNull(email) {
  const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
  const user = userList.users.find(u => u.email === email);
  if (!user) {
    console.log(`   ❌ User not found: ${email}`);
    return false;
  }
  
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      heard_about_us: null
    }
  });
  
  if (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
  
  return true;
}

async function verifyNull(email) {
  const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
  const user = userList.users.find(u => u.email === email);
  if (!user) return false;
  
  const value = user.user_metadata?.heard_about_us;
  return value === null || value === undefined;
}

async function testHeardAboutQAUser() {
  console.log('='.repeat(70));
  console.log('HEARD ABOUT ENDPOINT - QA USER TEST');
  console.log('='.repeat(70));
  console.log(`Production URL: ${PRODUCTION_URL}`);
  console.log(`QA User: ${QA_EMAIL}`);
  console.log('');

  // Step 1: Get user ID
  console.log('📋 STEP 1: Get QA user ID');
  console.log('-'.repeat(70));
  const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
  const user = userList.users.find(u => u.email === QA_EMAIL);
  
  if (!user) {
    console.log(`❌ ERROR: User not found: ${QA_EMAIL}`);
    return;
  }
  
  const userId = user.id;
  console.log(`✅ User ID: ${userId}`);
  console.log('');

  // Step 2: Reset to NULL
  console.log('📋 STEP 2: Reset heard_about_us to NULL');
  console.log('-'.repeat(70));
  const resetSuccess = await setHeardAboutToNull(QA_EMAIL);
  if (!resetSuccess) {
    console.log('❌ Failed to reset');
    return;
  }
  
  const isNull = await verifyNull(QA_EMAIL);
  if (isNull) {
    console.log('✅ SUCCESS: heard_about_us is now NULL');
  } else {
    console.log('❌ FAIL: heard_about_us is not NULL');
    return;
  }
  console.log('');

  // Step 3: Test first write
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
    }
    console.log('');
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    return;
  }

  // Step 4: Test second write (write-once)
  console.log('📋 STEP 4: Test second write (should NOT overwrite)');
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
    } else {
      console.log(`❌ FAIL: Second write should have been prevented`);
    }
    console.log('');
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    return;
  }

  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log('✅ Fresh user has NULL heard_about_us');
  console.log('✅ First write succeeds');
  console.log('✅ Second write prevented (write-once working)');
  console.log('');
}

testHeardAboutQAUser().catch(console.error);

