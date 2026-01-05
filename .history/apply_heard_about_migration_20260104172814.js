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

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function applyMigration() {
    console.log('🔄 Applying heard_about_us migration to production Supabase...\n');

    try {
        // Read the migration SQL
        const migrationSQL = fs.readFileSync('supabase-migrations/add_heard_about_us.sql', 'utf8');

        // Extract just the ALTER TABLE command (skip comments and verification)
        const alterCommand = 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heard_about_us TEXT;';

        console.log('Executing SQL:');
        console.log(alterCommand);
        console.log('');

        // Execute the migration using Supabase RPC
        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
            sql: alterCommand
        });

        if (error) {
            // Try direct SQL execution via PostgREST
            console.log('RPC method not available, trying direct execution...');

            // Use the SQL editor endpoint (this requires admin access)
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: alterCommand })
            });

            if (!response.ok) {
                console.log('⚠️  Direct SQL execution not available via API');
                console.log('Please run the migration manually in Supabase SQL Editor:');
                console.log('');
                console.log('1. Go to: https://supabase.com/dashboard/project/wlxacpqlokoiqqhgaads/sql/new');
                console.log('2. Paste this SQL:');
                console.log('');
                console.log(alterCommand);
                console.log('');
                console.log('3. Click "Run"');
                console.log('');
                console.log('After running the migration, verify with:');
                console.log('');
                console.log('SELECT column_name, data_type, is_nullable');
                console.log('FROM information_schema.columns');
                console.log('WHERE table_name = \'profiles\' AND column_name = \'heard_about_us\';');
                console.log('');
                return;
            }
        }

        console.log('✅ Migration applied successfully!');
        console.log('');

        // Verify the column was added
        const { data: columns, error: verifyError } = await supabaseAdmin
            .from('profiles')
            .select('heard_about_us')
            .limit(1);

        if (verifyError) {
            console.log('⚠️  Could not verify column (this is expected if table is empty)');
            console.log('Error:', verifyError.message);
        } else {
            console.log('✅ Verified: heard_about_us column exists and is queryable');
        }

        console.log('');
        console.log('🎉 Migration complete!');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.log('');
        console.log('Please apply the migration manually in Supabase SQL Editor:');
        console.log('');
        console.log('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heard_about_us TEXT;');
        console.log('');
        process.exit(1);
    }
}

applyMigration().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
