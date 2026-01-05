// Test frontend support endpoints
// 1. Check health/version endpoint
// 2. Test heard_about_us endpoint with fresh user

const PRODUCTION_URL = 'https://jobspeakpro.com';

async function testFrontendSupport() {
  console.log('='.repeat(70));
  console.log('FRONTEND SUPPORT VERIFICATION');
  console.log('='.repeat(70));
  console.log(`Production URL: ${PRODUCTION_URL}`);
  console.log('');

  // Test 1: Health/Version endpoint
  console.log('📋 TEST 1: Health/Version Endpoint');
  console.log('-'.repeat(70));
  try {
    const healthRes = await fetch(`${PRODUCTION_URL}/api/health`);
    const healthData = await healthRes.json();
    
    console.log(`Status: ${healthRes.status} ${healthRes.statusText}`);
    console.log('Response:');
    console.log(JSON.stringify(healthData, null, 2));
    console.log('');
    
    const hasCommit = !!healthData.commit;
    const hasVersion = !!healthData.version;
    
    if (hasCommit && hasVersion) {
      console.log(`✅ SUCCESS: Health endpoint includes commit and version`);
      console.log(`   - commit: ${healthData.commit}`);
      console.log(`   - version: ${healthData.version}`);
    } else {
      console.log(`❌ FAIL: Health endpoint missing commit/version`);
      console.log(`   - commit: ${hasCommit ? '✅' : '❌'}`);
      console.log(`   - version: ${hasVersion ? '✅' : '❌'}`);
    }
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
  }
  console.log('');

  // Test 2: Heard About endpoint - check fresh user
  console.log('📋 TEST 2: Heard About Endpoint - Fresh User');
  console.log('-'.repeat(70));
  
  // Note: This test requires a real user ID from Supabase
  // For now, we'll just test the endpoint structure
  const testUserKey = 'test-user-fresh'; // Replace with actual fresh user ID
  
  try {
    // First, try to get current value (should be null for fresh user)
    console.log(`Testing with userKey: ${testUserKey}`);
    console.log('Note: Replace with actual fresh user ID from Supabase');
    console.log('');
    
    const heardRes = await fetch(`${PRODUCTION_URL}/api/profile/heard-about`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userKey: testUserKey,
        value: 'TikTok'
      })
    });
    
    const heardData = await heardRes.json();
    
    console.log(`Status: ${heardRes.status} ${heardRes.statusText}`);
    console.log('Response:');
    console.log(JSON.stringify(heardData, null, 2));
    console.log('');
    
    const hasSuccess = heardData.success === true;
    const hasValue = !!heardData.value;
    const hasUpdated = typeof heardData.updated === 'boolean';
    
    if (hasSuccess && hasValue && hasUpdated !== undefined) {
      console.log(`✅ SUCCESS: Heard about endpoint structure correct`);
      console.log(`   - success: ${heardData.success}`);
      console.log(`   - value: ${heardData.value}`);
      console.log(`   - updated: ${heardData.updated}`);
    } else {
      console.log(`⚠️  WARNING: Response structure may be incomplete`);
      console.log(`   - success: ${hasSuccess ? '✅' : '❌'}`);
      console.log(`   - value: ${hasValue ? '✅' : '❌'}`);
      console.log(`   - updated: ${hasUpdated ? '✅' : '❌'}`);
    }
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
  }
  console.log('');

  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log('1. Health endpoint should return commit hash and version');
  console.log('2. Heard about endpoint should work with write-once logic');
  console.log('3. Fresh users should have heard_about_us = NULL initially');
  console.log('');
}

testFrontendSupport().catch(console.error);

