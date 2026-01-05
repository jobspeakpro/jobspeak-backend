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
    },
    db: {
        schema: 'public'
    }
});

async function verifyAndApplyMigration() {
    console.log('🔍 Checking if heard_about_us column exists...\n');

    try {
        // Try to query the column - if it doesn't exist, we'll get an error
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('id, heard_about_us')
            .limit(1);

        if (error) {
            // Check if error is about column not existing
            if (error.message && error.message.includes('heard_about_us')) {
                console.log('❌ Column does not exist yet');
                console.log('');
                console.log('⚠️  Manual migration required:');
                console.log('');
                console.log('1. Open Supabase SQL Editor:');
                console.log('   https://supabase.com/dashboard/project/wlxacpqlokoiqqhgaads/sql/new');
                console.log('');
                console.log('2. Paste and run this SQL:');
                console.log('   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heard_about_us TEXT;');
                console.log('');
                console.log('3. After running, re-run this script to verify');
                console.log('');
                process.exit(1);
            } else {
                console.error('Unexpected error:', error);
                process.exit(1);
            }
        }

        console.log('✅ Column already exists!');
        console.log('');
        console.log('Migration verification successful. The heard_about_us column is ready.');
        console.log('');

        // Show sample data
        if (data && data.length > 0) {
            console.log('Sample row:');
            console.log(`  ID: ${data[0].id}`);
            console.log(`  heard_about_us: ${data[0].heard_about_us || '(null)'}`);
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

verifyAndApplyMigration().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
