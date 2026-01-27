import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing keys');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function tryRpc() {
    console.log('🚀 Trying RPC migration...');
    const sqlPath = path.join(process.cwd(), 'supabase-migrations', 'referral_affiliate_system.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Try common names for SQL execution functions
    const functions = ['exec_sql', 'execute_sql', 'exec', 'run_sql'];

    for (const fn of functions) {
        console.log(`\nTesting RPC: ${fn}...`);
        const { data, error } = await supabase.rpc(fn, { sql: sqlContent });

        if (error) {
            console.log(`   ❌ ${fn} failed: ${error.message}`);
        } else {
            console.log(`   ✅ ${fn} SUCCESS!`);
            process.exit(0);
        }
    }

    console.log('\n❌ All RPC attempts failed.');
    process.exit(1);
}

tryRpc();
