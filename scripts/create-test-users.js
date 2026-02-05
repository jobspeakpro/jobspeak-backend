/**
 * ONE-TIME ADMIN SCRIPT - Create Pre-Confirmed Test Users
 * 
 * DO NOT DEPLOY THIS AS A PUBLIC ENDPOINT
 * Run locally only for QA setup
 * 
 * Usage: node scripts/create-test-users.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

// Create admin client with service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const TEST_USERS = [
    {
        email: 'qa1@jobspeakpro.test',
        password: 'TestPassword123!',
        metadata: { role: 'qa_test_user' }
    },
    {
        email: 'qa2@jobspeakpro.test',
        password: 'TestPassword123!',
        metadata: { role: 'qa_test_user' }
    }
];

async function createTestUsers() {
    console.log('🔧 Creating pre-confirmed test users...\n');

    for (const user of TEST_USERS) {
        try {
            // Create user with email_confirm = true
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true, // CRITICAL: Pre-confirm email
                user_metadata: user.metadata
            });

            if (error) {
                console.error(`❌ Failed to create ${user.email}:`, error.message);
                continue;
            }

            console.log(`✅ Created: ${user.email}`);
            console.log(`   User ID: ${data.user.id}`);
            console.log(`   Email Confirmed: ${data.user.email_confirmed_at ? 'YES' : 'NO'}`);
            console.log(`   Password: ${user.password}`);
            console.log('');
        } catch (err) {
            console.error(`❌ Error creating ${user.email}:`, err.message);
        }
    }

    console.log('✅ Test user creation complete!');
    console.log('\nYou can now login with:');
    TEST_USERS.forEach(u => {
        console.log(`  Email: ${u.email}`);
        console.log(`  Password: ${u.password}`);
        console.log('');
    });
}

createTestUsers()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
