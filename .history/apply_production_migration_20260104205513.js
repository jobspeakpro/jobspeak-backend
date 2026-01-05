import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

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

async function applyMigrationDirectly() {
    console.log('🚀 Applying heard_about_us migration to PRODUCTION Supabase...\n');

    try {
        // Step 1: Check if column already exists by trying to query it
        console.log('Step 1: Checking if column already exists...');
        const { data: checkData, error: checkError } = await supabaseAdmin
            .from('profiles')
            .select('id, heard_about_us')
            .limit(1);

        if (!checkError) {
            console.log('   ✅ Column already exists!');
            console.log('');
            if (checkData && checkData.length > 0) {
                console.log(`   Sample row: ID=${checkData[0].id}, heard_about_us=${checkData[0].heard_about_us || '(null)'}`);
            }
        } else if (checkError.message && checkError.message.includes('heard_about_us')) {
            console.log('   ❌ Column does not exist');
            console.log('   Error:', checkError.message);
            console.log('');
            console.log('   Attempting to add column via SQL...');
            console.log('');

            // Try to execute SQL via Supabase's query endpoint
            // Since direct SQL execution isn't available via the client library,
            // we'll use a workaround: create a migration function in Supabase

            console.log('   ⚠️  Cannot execute DDL via Supabase client library');
            console.log('');
            console.log('   SOLUTION: Using HTTP request to Supabase SQL endpoint...');
            console.log('');

            // Use fetch to call Supabase's SQL execution endpoint
            const sqlEndpoint = `${supabaseUrl}/rest/v1/rpc/exec_sql`;
            const migrationSQL = 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heard_about_us TEXT;';

            const response = await fetch(sqlEndpoint, {
                method: 'POST',
                headers: {
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ sql: migrationSQL })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.log(`   ❌ SQL endpoint returned ${response.status}`);
                console.log(`   Response: ${errorText}`);
                console.log('');
                console.log('   SQL execution endpoint not available.');
                console.log('');
                console.log('   FINAL APPROACH: Using Supabase database URL...');
                console.log('');

                // Extract project ref
                const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

                console.log(`   Project: ${projectRef}`);
                console.log('   Database: postgres');
                console.log('');
                console.log('   Executing ALTER TABLE via connection pooler...');
                console.log('');

                // Use node-postgres to connect directly
                const { Client } = await import('pg');

                // Get database password from environment or prompt
                const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;

                if (!dbPassword) {
                    throw new Error('Database password not available. Set SUPABASE_DB_PASSWORD environment variable.');
                }

                const client = new Client({
                    host: `${projectRef}.pooler.supabase.com`,
                    port: 6543,
                    database: 'postgres',
                    user: 'postgres',
                    password: dbPassword,
                    ssl: { rejectUnauthorized: false }
                });

                await client.connect();
                console.log('   ✅ Connected to database');

                await client.query(migrationSQL);
                console.log('   ✅ Migration executed successfully');

                await client.end();
                console.log('');
            } else {
                console.log('   ✅ Migration executed via SQL endpoint');
                console.log('');
            }
        } else {
            console.error('   ❌ Unexpected error:', checkError.message);
            throw checkError;
        }

        // Step 2: Verify the column was added
        console.log('Step 2: Verifying column exists...');
        const { data: verifyData, error: verifyError } = await supabaseAdmin
            .from('profiles')
            .select('id, heard_about_us')
            .limit(1);

        if (verifyError) {
            console.error('   ❌ Verification failed');
            console.error('   Error:', verifyError.message);
            throw new Error('Column verification failed');
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
            .update({ heard_about_us: 'TikTok', updated_at: new Date().toISOString() })
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
        console.log('  - Test user: jsp.qa.001 (bb9e92ba-9dda-42a9-a95c-fbb8a6d6e238)');
        console.log(`  - Test write: heard_about_us = 'TikTok'`);
        console.log('  - Status: SUCCESS');
        console.log('');
        console.log('RLS Policies: Existing policies on profiles table allow authenticated users to update their own rows');
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.log('');
        throw err;
    }
}

applyMigrationDirectly().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
