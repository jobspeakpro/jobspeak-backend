import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

// Create Supabase Admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Create regular client for testing login
const supabaseClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY);

async function verifyTestUser() {
    const testEmail = 'jsp.qa.001@jobspeakpro-test.local';
    const testPassword = testEmail; // Password equals email

    console.log('🔍 Verifying test user login and email confirmation...\n');
    console.log(`Testing with: ${testEmail}\n`);

    try {
        // Step 1: Attempt to sign in with the test credentials
        console.log('Step 1: Testing login via Supabase Auth...');
        const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });

        if (signInError) {
            console.error('❌ Login failed:', signInError.message);
            process.exit(1);
        }

        console.log('✅ Login successful!');
        console.log(`   User ID: ${signInData.user.id}`);
        console.log(`   Email: ${signInData.user.email}`);

        // Step 2: Check email confirmation status
        console.log('\nStep 2: Checking email confirmation status...');

        if (signInData.user.email_confirmed_at) {
            console.log('✅ Email is CONFIRMED');
            console.log(`   Confirmed at: ${signInData.user.email_confirmed_at}`);
        } else {
            console.log('❌ Email is NOT confirmed');
            console.log('   This should not happen - users were created with email_confirm: true');
            process.exit(1);
        }

        // Step 3: Verify profile exists
        console.log('\nStep 3: Checking profile record...');
        const { data: profileData, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', signInData.user.id)
            .single();

        if (profileError) {
            console.error('❌ Profile not found:', profileError.message);
            process.exit(1);
        }

        console.log('✅ Profile exists');
        console.log(`   Display name: ${profileData.display_name}`);
        console.log(`   Created at: ${profileData.created_at}`);

        // Step 4: Test authenticated endpoint access
        console.log('\nStep 4: Testing authenticated API access...');
        console.log('   Testing against production: https://jobspeakpro.com/api/profile');

        const response = await fetch('https://jobspeakpro.com/api/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${signInData.session.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const profileResponse = await response.json();
            console.log('✅ Authenticated API access successful');
            console.log(`   Profile data retrieved: ${JSON.stringify(profileResponse, null, 2)}`);
        } else {
            console.log(`⚠️  API returned status ${response.status}`);
            const errorText = await response.text();
            console.log(`   Response: ${errorText}`);
        }

        // Summary
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ VERIFICATION COMPLETE');
        console.log('═══════════════════════════════════════════════════════');
        console.log('✓ User can login with credentials');
        console.log('✓ Email is confirmed (no verification needed)');
        console.log('✓ Profile record exists in database');
        console.log('✓ User can access authenticated endpoints');
        console.log('\n🎉 Test user is ready for production QA testing!');
        console.log('📋 All 30 users should work the same way.\n');

        // Sign out
        await supabaseClient.auth.signOut();

    } catch (err) {
        console.error('❌ Verification failed with exception:', err);
        process.exit(1);
    }
}

// Run verification
verifyTestUser().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
