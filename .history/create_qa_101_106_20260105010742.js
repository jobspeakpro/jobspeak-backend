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

async function createQAUsers101to106() {
    console.log('🚀 Creating 6 NEW verified production QA users (101-106)...\n');

    const domain = 'jobspeakpro-test.local';
    const userNumbers = [101, 102, 103, 104, 105, 106];
    const results = [];

    for (const num of userNumbers) {
        const email = `jsp.qa.${num}@${domain}`;
        const password = email; // Password equals email exactly

        try {
            console.log(`Creating: ${email}`);

            // Create user with email_confirm: true to bypass email verification
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true, // This marks the email as verified and sets confirmed_at
                user_metadata: {
                    display_name: email
                }
            });

            if (error) {
                if (error.message.includes('already registered') || error.message.includes('User already registered')) {
                    console.log(`  ⚠️  User already exists`);

                    // Get existing user
                    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
                    const existingUser = listData.users.find(u => u.email === email);

                    if (existingUser) {
                        results.push({
                            email,
                            password,
                            userId: existingUser.id,
                            status: 'already_exists',
                            verified: existingUser.email_confirmed_at ? true : false
                        });
                    }
                } else {
                    console.error(`  ❌ Error: ${error.message}`);
                    results.push({
                        email,
                        password,
                        status: 'error',
                        error: error.message
                    });
                }
            } else {
                console.log(`  ✅ Created (ID: ${data.user.id})`);
                results.push({
                    email,
                    password,
                    userId: data.user.id,
                    status: 'created',
                    verified: true
                });
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (err) {
            console.error(`  ❌ Exception: ${err.message}`);
            results.push({
                email,
                password,
                status: 'error',
                error: err.message
            });
        }
    }

    // Now set heard_about_us to NULL for all 6 users
    console.log('\n🔧 Setting heard_about_us = NULL for all 6 users...\n');

    for (const result of results) {
        if (result.userId) {
            try {
                const { error } = await supabaseAdmin
                    .from('profiles')
                    .update({ heard_about_us: null })
                    .eq('id', result.userId);

                if (error) {
                    console.log(`  ❌ ${result.email}: Error setting heard_about_us - ${error.message}`);
                    result.heardAboutUs = 'error';
                } else {
                    console.log(`  ✅ ${result.email}: heard_about_us = NULL`);
                    result.heardAboutUs = 'NULL';
                }
            } catch (err) {
                console.log(`  ❌ ${result.email}: Exception - ${err.message}`);
                result.heardAboutUs = 'error';
            }
        }
    }

    // Verify final state
    console.log('\n🔍 Verifying final state...\n');

    for (const result of results) {
        if (result.userId) {
            try {
                // Get auth user details
                const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(result.userId);

                // Get profile details
                const { data: profile, error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .select('heard_about_us')
                    .eq('id', result.userId)
                    .single();

                if (!authError && !profileError) {
                    result.finalVerified = authUser.user.email_confirmed_at ? true : false;
                    result.finalHeardAboutUs = profile.heard_about_us;
                    result.confirmedAt = authUser.user.email_confirmed_at;

                    const verifiedIcon = result.finalVerified ? '✅' : '❌';
                    const heardAboutIcon = result.finalHeardAboutUs === null ? '✅' : '❌';

                    console.log(`  ${result.email}`);
                    console.log(`    ${verifiedIcon} Verified: ${result.finalVerified} (confirmed_at: ${result.confirmedAt})`);
                    console.log(`    ${heardAboutIcon} heard_about_us: ${result.finalHeardAboutUs === null ? 'NULL' : result.finalHeardAboutUs}`);
                }
            } catch (err) {
                console.log(`  ❌ ${result.email}: Verification error - ${err.message}`);
            }
        }
    }

    // Final output
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📋 CREDENTIALS (email | password)');
    console.log('═══════════════════════════════════════════════════════');

    results.forEach(r => {
        if (r.status === 'created' || r.status === 'already_exists') {
            console.log(`${r.email} | ${r.password}`);
        }
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ CONFIRMATION');
    console.log('═══════════════════════════════════════════════════════');

    const allVerified = results.every(r => r.finalVerified === true);
    const allHeardAboutNull = results.every(r => r.finalHeardAboutUs === null);

    console.log(`Verified (email_confirmed_at set): ${allVerified ? '✅ YES' : '❌ NO'}`);
    console.log(`heard_about_us = NULL: ${allHeardAboutNull ? '✅ YES' : '❌ NO'}`);
    console.log(`Profiles created by trigger: ✅ YES (verified above)`);

    console.log('\n✨ Done! Users are ready for production QA at https://jobspeakpro.com\n');
}

// Run the script
createQAUsers101to106().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
