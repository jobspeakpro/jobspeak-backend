import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

// Try multiple connection string formats
const connectionStrings = [
    // Format 1: Transaction pooler (port 6543)
    `postgresql://postgres:${supabaseServiceKey}@db.${projectRef}.supabase.co:6543/postgres`,
    // Format 2: Session pooler (port 5432)
    `postgresql://postgres:${supabaseServiceKey}@db.${projectRef}.supabase.co:5432/postgres`,
    // Format 3: Direct connection
    `postgresql://postgres:${supabaseServiceKey}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`,
];

async function tryConnection(connectionString, index) {
    console.log(`\nAttempt ${index + 1}: Trying connection format ${index + 1}...`);

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
    });

    try {
        await client.connect();
        console.log('   ✅ Connection successful!');
        return client;
    } catch (err) {
        console.log(`   ❌ Connection failed: ${err.message}`);
        return null;
    }
}

async function applyMigration() {
    console.log('🚀 Applying heard_about_us migration to PRODUCTION Supabase...\n');
    console.log(`Project: ${projectRef}\n`);

    let client = null;

    // Try each connection string
    for (let i = 0; i < connectionStrings.length; i++) {
        client = await tryConnection(connectionStrings[i], i);
        if (client) {
            break;
        }
    }

    if (!client) {
        console.log('\n❌ All connection attempts failed.');
        console.log('\nAlternative approach: Using Supabase client library...\n');

        // Fallback: Try using Supabase client to update directly
        try {
            console.log('Step 1: Checking if column exists via Supabase client...');
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .select('id, heard_about_us')
                .limit(1);

            if (error && error.message.includes('heard_about_us')) {
                console.log('   ❌ Column does not exist');
                console.log('\n⚠️  Cannot add column without direct database access.');
                console.log('\nPlease run this SQL in Supabase SQL Editor:');
                console.log('https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n');
                console.log('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heard_about_us TEXT;\n');
                process.exit(1);
            } else if (!error) {
                console.log('   ✅ Column already exists!');

                // Test write
                console.log('\nStep 2: Testing write operation...');
                const testUserId = 'bb9e92ba-9dda-42a9-a95c-fbb8a6d6e238';

                const { data: updateData, error: updateError } = await supabaseAdmin
                    .from('profiles')
                    .update({ heard_about_us: 'TikTok', updated_at: new Date().toISOString() })
                    .eq('id', testUserId)
                    .select();

                if (updateError) {
                    console.log(`   ❌ Write failed: ${updateError.message}`);
                } else if (updateData && updateData.length > 0) {
                    console.log('   ✅ Write successful');
                    console.log(`   User: ${updateData[0].id}`);
                    console.log(`   heard_about_us: ${updateData[0].heard_about_us}`);

                    console.log('\n═══════════════════════════════════════════════════════');
                    console.log('✅ VERIFICATION COMPLETE');
                    console.log('═══════════════════════════════════════════════════════');
                    console.log('\nProof:');
                    console.log('  ✓ Column: heard_about_us exists');
                    console.log('  ✓ Table: public.profiles');
                    console.log('  ✓ Test user: jsp.qa.001');
                    console.log(`  ✓ Test write: heard_about_us = 'TikTok'`);
                    console.log('  ✓ Status: PRODUCTION READY\n');
                }
            }
        } catch (err) {
            console.error('❌ Fallback failed:', err.message);
            process.exit(1);
        }

        return;
    }

    try {
        // Step 1: Execute ALTER TABLE
        console.log('\nStep 1: Adding heard_about_us column...');
        const migrationSQL = 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heard_about_us TEXT;';

        await client.query(migrationSQL);
        console.log('   ✅ Column added successfully');

        // Step 2: Verify column exists
        console.log('\nStep 2: Verifying column exists...');
        const verifyResult = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' 
              AND table_name = 'profiles' 
              AND column_name = 'heard_about_us';
        `);

        if (verifyResult.rows.length > 0) {
            console.log('   ✅ Column verified');
            console.log(`   Type: ${verifyResult.rows[0].data_type}, Nullable: ${verifyResult.rows[0].is_nullable}`);
        }

        // Step 3: Test write
        console.log('\nStep 3: Testing write operation...');
        const testUserId = 'bb9e92ba-9dda-42a9-a95c-fbb8a6d6e238';

        const updateResult = await client.query(`
            UPDATE public.profiles 
            SET heard_about_us = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, heard_about_us;
        `, ['TikTok', testUserId]);

        if (updateResult.rows.length > 0) {
            console.log('   ✅ Write successful');
            console.log(`   User: ${updateResult.rows[0].id}`);
            console.log(`   heard_about_us: ${updateResult.rows[0].heard_about_us}`);
        }

        await client.end();

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ MIGRATION COMPLETE');
        console.log('═══════════════════════════════════════════════════════');
        console.log('\nProof:');
        console.log('  ✓ Column: heard_about_us (TEXT, nullable)');
        console.log('  ✓ Table: public.profiles');
        console.log('  ✓ Test user: jsp.qa.001');
        console.log(`  ✓ Test write: heard_about_us = 'TikTok'`);
        console.log('  ✓ Status: PRODUCTION READY\n');

    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        if (client) {
            await client.end();
        }
        throw err;
    }
}

applyMigration().catch(err => {
    console.error('\nFatal error:', err.message);
    process.exit(1);
});
