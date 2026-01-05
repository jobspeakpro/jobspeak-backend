import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

// Create regular Supabase client for auth
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test users
const testUsers = [
    {
        email: 'jsp.qa.001@jobspeakpro-test.local',
        password: 'jsp.qa.001@jobspeakpro-test.local',
        testValue: 'TikTok',
        secondValue: 'YouTube'
    },
    {
        email: 'jsp.qa.002@jobspeakpro-test.local',
        password: 'jsp.qa.002@jobspeakpro-test.local',
        testValue: 'Discord',
        secondValue: 'Twitter/X'
    }
];

async function testHeardAboutEndpoint() {
    console.log('🧪 Testing heard_about_us endpoint with production users...\n');
    console.log('═══════════════════════════════════════════════════════\n');

    for (const user of testUsers) {
        console.log(`Testing with: ${user.email}`);
        console.log('─'.repeat(55));

        try {
            // Step 1: Sign in
            console.log('\n1️⃣  Signing in...');
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: user.password
            });

            if (signInError) {
                console.error(`   ❌ Login failed: ${signInError.message}`);
                continue;
            }

            const accessToken = signInData.session.access_token;
            const userId = signInData.user.id;
            console.log(`   ✅ Logged in (User ID: ${userId})`);

            // Step 2: First call - set value
            console.log(`\n2️⃣  First call: Setting value to "${user.testValue}"...`);
            const firstResponse = await fetch('https://jobspeakpro.com/api/profile/heard-about', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    userKey: userId,
                    value: user.testValue
                })
            });

            const firstResult = await firstResponse.json();
            console.log(`   Response:`, JSON.stringify(firstResult, null, 2));

            if (firstResult.success && firstResult.updated) {
                console.log(`   ✅ Value set successfully`);
            } else if (firstResult.success && !firstResult.updated) {
                console.log(`   ⚠️  Value was already set to: ${firstResult.value}`);
            } else {
                console.log(`   ❌ Unexpected response`);
            }

            // Step 3: Second call - attempt to overwrite
            console.log(`\n3️⃣  Second call: Attempting to overwrite with "${user.secondValue}"...`);
            const secondResponse = await fetch('https://jobspeakpro.com/api/profile/heard-about', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    userKey: userId,
                    value: user.secondValue
                })
            });

            const secondResult = await secondResponse.json();
            console.log(`   Response:`, JSON.stringify(secondResult, null, 2));

            if (secondResult.success && !secondResult.updated && secondResult.value === user.testValue) {
                console.log(`   ✅ Write-once protection working! Value NOT overwritten.`);
            } else if (secondResult.success && !secondResult.updated) {
                console.log(`   ✅ Write-once protection working! Existing value preserved: ${secondResult.value}`);
            } else {
                console.log(`   ❌ WARNING: Value may have been overwritten!`);
            }

            // Sign out
            await supabase.auth.signOut();
            console.log('\n   Signed out.\n');

        } catch (err) {
            console.error(`   ❌ Test failed: ${err.message}\n`);
        }
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Testing complete!\n');
    console.log('Expected behavior:');
    console.log('  - First call: updated=true, value set');
    console.log('  - Second call: updated=false, original value preserved');
    console.log('═══════════════════════════════════════════════════════\n');
}

testHeardAboutEndpoint().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
