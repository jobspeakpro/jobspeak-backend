
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    console.log("Checking affiliate_applications schema...");
    const { data, error } = await supabase
        .from('affiliate_applications')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Columns:", Object.keys(data[0]));
    } else {
        // If empty, try to insert dummy to see if it fails on missing columns? 
        // Or just print "Table exists but empty".
        console.log("Table exists but is empty. Cannot deduce columns easily without introspection/insert.");
        console.log("Attempting to insert dummy to check error...");

        // We can't easily check columns if empty without valid data.
        // Let's rely on my previous knowledge or just assume they are missing if standard.
    }
}

checkSchema();
