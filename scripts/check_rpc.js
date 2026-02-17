
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking for 'exec_sql' function...");
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });

    if (error) {
        console.error("RPC Error:", error.message);
        if (error.code === '42883') {
            console.log("Verdict: exec_sql does NOT exist.");
        }
    } else {
        console.log("RPC Success:", data);
        console.log("Verdict: exec_sql EXISTS!");
    }
}

check();
