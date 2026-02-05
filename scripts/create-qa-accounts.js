/**
 * ONE-TIME ADMIN SCRIPT - Create 20 QA Accounts with Password Reset Links
 * 
 * DO NOT DEPLOY THIS AS A PUBLIC ENDPOINT
 * Run locally only for QA setup
 * 
 * Usage: node scripts/create-qa-accounts.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

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

const QA_ACCOUNTS = Array.from({ length: 20 }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    return {
        email: `qa${num}@jobspeakpro.test`,
        metadata: { role: 'qa_test_user', account_number: num }
    };
});

async function createQAAccounts() {
    console.log('🔧 Creating 20 QA accounts with password reset links...\n');

    const results = [];

    for (const account of QA_ACCOUNTS) {
        try {
            // Create user with email_confirm = true (no password needed initially)
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email: account.email,
                email_confirm: true, // Pre-confirm email
                user_metadata: account.metadata
            });

            if (error) {
                console.error(`❌ Failed to create ${account.email}:`, error.message);
                results.push({
                    email: account.email,
                    status: 'FAILED',
                    error: error.message
                });
                continue;
            }

            // Generate password reset link (allows user to set their own password)
            const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'recovery',
                email: account.email
            });

            if (resetError) {
                console.error(`❌ Failed to generate reset link for ${account.email}:`, resetError.message);
                results.push({
                    email: account.email,
                    userId: data.user.id,
                    status: 'CREATED_NO_LINK',
                    error: resetError.message
                });
                continue;
            }

            console.log(`✅ Created: ${account.email}`);
            console.log(`   User ID: ${data.user.id}`);
            console.log(`   Reset Link: ${resetData.properties.action_link}`);
            console.log('');

            results.push({
                email: account.email,
                userId: data.user.id,
                resetLink: resetData.properties.action_link,
                status: 'SUCCESS'
            });

        } catch (err) {
            console.error(`❌ Error creating ${account.email}:`, err.message);
            results.push({
                email: account.email,
                status: 'ERROR',
                error: err.message
            });
        }
    }

    // Generate CSV output
    const csvLines = ['Email,Reset Link,Status'];
    results.forEach(r => {
        if (r.status === 'SUCCESS') {
            csvLines.push(`${r.email},${r.resetLink},${r.status}`);
        } else {
            csvLines.push(`${r.email},N/A,${r.status}`);
        }
    });

    const csvContent = csvLines.join('\n');
    fs.writeFileSync('qa-accounts.csv', csvContent);

    console.log('\n✅ QA account creation complete!');
    console.log(`\n📄 CSV file saved: qa-accounts.csv`);
    console.log(`\nSuccessful accounts: ${results.filter(r => r.status === 'SUCCESS').length}/20`);
    console.log('\nQA can now:');
    console.log('1. Click their reset link');
    console.log('2. Set their own password');
    console.log('3. Login with email + password');
}

createQAAccounts()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
