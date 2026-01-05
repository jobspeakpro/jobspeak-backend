import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

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

async function createVerifiedTestUsers() {
    console.log('🚀 Starting creation of 30 verified test users...\n');

    const credentials = [];
    const errors = [];
    const domain = 'jobspeakpro-test.local';

    for (let i = 1; i <= 30; i++) {
        const num = String(i).padStart(3, '0');
        const email = `jsp.qa.${num}@${domain}`;
        const password = email; // Password equals email as specified

        try {
            console.log(`Creating user ${i}/30: ${email}`);

            // Create user with email_confirm: true to bypass email verification
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true, // This marks the email as verified
                user_metadata: {
                    display_name: email
                }
            });

            if (error) {
                // Check if user already exists
                if (error.message.includes('already registered') || error.message.includes('User already registered')) {
                    console.log(`  ⚠️  User already exists, skipping...`);
                    credentials.push(email); // Still add to credentials list
                } else {
                    console.error(`  ❌ Error: ${error.message}`);
                    errors.push({ email, error: error.message });
                }
            } else {
                console.log(`  ✅ Created successfully (ID: ${data.user.id})`);
                credentials.push(email);
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (err) {
            console.error(`  ❌ Exception: ${err.message}`);
            errors.push({ email, error: err.message });
        }
    }

    // Generate credentials file
    console.log('\n📝 Generating credentials file...');
    const credentialsContent = credentials.join('\n');
    fs.writeFileSync('test_users_credentials.txt', credentialsContent);
    console.log('✅ Credentials saved to test_users_credentials.txt\n');

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Successfully created/verified: ${credentials.length}/30 users`);
    if (errors.length > 0) {
        console.log(`❌ Errors encountered: ${errors.length}`);
        console.log('\nErrors:');
        errors.forEach(({ email, error }) => {
            console.log(`  - ${email}: ${error}`);
        });
    }
    console.log('\n📋 All credentials (email = password):');
    console.log('═══════════════════════════════════════════════════════');
    credentials.forEach((email, idx) => {
        console.log(`${idx + 1}. ${email}`);
    });
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n✨ Done! Users are ready to login at https://jobspeakpro.com');
    console.log('📄 Credentials list saved to: test_users_credentials.txt\n');
}

// Run the script
createVerifiedTestUsers().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
