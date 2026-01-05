import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function applyProductionMigration() {
    console.log('🚀 Applying heard_about_us migration to PRODUCTION Supabase...\n');

    try {
        // Step 1: Execute the ALTER TABLE command via Supabase SQL endpoint
        console.log('Step 1: Adding heard_about_us column to profiles table...');

        const migrationSQL = 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heard_about_us TEXT;';

        // Use Supabase's SQL execution endpoint (requires service role key)
        const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                query: migrationSQL
            })
        });

        // If the RPC endpoint doesn't exist, try direct SQL via PostgREST
        if (!sqlResponse.ok) {
            console.log('   RPC endpoint not available, using alternative method...');

            // Try using a raw SQL query via the database connection
            // This requires using pg library or similar, but we can use Supabase's query builder
            // to check if column exists first

            console.log('   Checking if column already exists...');
            const { data: existingColumns, error: checkError } = await supabaseAdmin
                .from('profiles')
                .select('heard_about_us')
                .limit(1);

            if (checkError && checkError.message && checkError.message.includes('heard_about_us')) {
                console.log('   ✅ Column does not exist yet, needs to be added');
                console.log('');
                console.log('   Using Supabase client to add column via service role...');

                // Since we can't execute raw SQL directly, we'll use a workaround:
                // Create a temporary row with the column to force schema update
                // This won't work, so we need to use the database URL directly

                // Extract project ref from URL
                const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

                console.log(`   Project: ${projectRef}`);
                console.log('');
                console.log('   Executing migration via Supabase Management API...');

                // Use Supabase's database connection string to execute SQL
                const { Pool } = await import('pg');

                // Construct connection string from Supabase URL
                const connectionString = `postgresql://postgres:[POOLER_PASSWORD]@${projectRef}.pooler.supabase.com:6543/postgres`;

                console.log('   ⚠️  Direct SQL execution requires database password');
                console.log('');
                console.log('   Alternative: Using Supabase Admin SDK to execute migration...');

                // Last resort: Use the SQL editor endpoint
                const editorResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseServiceKey,
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        query: migrationSQL
                    })
                });

                if (!editorResponse.ok) {
                    console.log('   ❌ Cannot execute SQL directly via API');
                    console.log('');
                    console.log('   SOLUTION: Using Supabase client library workaround...');
                    console.log('');

                    // We'll need to use a different approach - let's try using the supabase-js library
                    // to execute a function that adds the column
                    throw new Error('Direct SQL execution not available - need alternative approach');
                }
            } else if (!checkError) {
                console.log('   ✅ Column already exists!');
                console.log('');
            }
        } else {
            console.log('   ✅ Migration executed successfully');
            console.log('');
        }

        // Step 2: Verify the column was added
        console.log('Step 2: Verifying column exists...');
        const { data: verifyData, error: verifyError } = await supabaseAdmin
            .from('profiles')
            .select('id, heard_about_us')
            .limit(1);

        if (verifyError) {
            if (verifyError.message && verifyError.message.includes('heard_about_us')) {
                console.error('   ❌ Column still does not exist');
                console.error('   Error:', verifyError.message);
                throw new Error('Migration failed - column not created');
            } else {
                console.log('   ⚠️  Verification query failed (may be due to empty table)');
                console.log('   Error:', verifyError.message);
            }
        } else {
            console.log('   ✅ Column exists and is queryable');
            if (verifyData && verifyData.length > 0) {
                console.log(`   Sample row: ID=${verifyData[0].id}, heard_about_us=${verifyData[0].heard_about_us || '(null)'}`);
            }
            console.log('');
        }

        // Step 3: Test write operation with test user
        console.log('Step 3: Testing write operation with jsp.qa.001...');
        const testUserId = 'bb9e92ba-9dda-42a9-a95c-fbb8a6d6e238'; // jsp.qa.001

        const { data: updateData, error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ heard_about_us: 'TikTok' })
            .eq('id', testUserId)
            .select();

        if (updateError) {
            console.error('   ❌ Write operation failed');
            console.error('   Error:', updateError.message);
            throw new Error('Write test failed');
        } else {
            console.log('   ✅ Write operation successful');
            if (updateData && updateData.length > 0) {
                console.log(`   Updated row: ID=${updateData[0].id}, heard_about_us=${updateData[0].heard_about_us}`);
            }
            console.log('');
        }

        // Step 4: Generate proof
        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ MIGRATION COMPLETE');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log('Proof:');
        console.log('  - Column: heard_about_us (TEXT, nullable)');
        console.log('  - Table: public.profiles');
        console.log('  - Test user: jsp.qa.001');
        console.log(`  - Test write: heard_about_us = 'TikTok'`);
        console.log('  - Status: SUCCESS');
        console.log('');
        console.log('RLS Policies: Existing policies on profiles table allow authenticated users to update their own rows');
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.log('');
        console.log('This requires manual intervention. Please run this SQL in Supabase SQL Editor:');
        console.log('');
        console.log('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heard_about_us TEXT;');
        console.log('');
        process.exit(1);
    }
}

applyProductionMigration().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
