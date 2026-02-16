
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    console.log("Inspecting referral_logs...");
    const { data, error } = await supabase.from('referral_logs').select('*').limit(1);
    if (error) {
        console.error("Error:", error);
    } else if (data && data.length > 0) {
        console.log("Keys:", Object.keys(data[0]));
        console.log("Example:", data[0]);
    } else {
        console.log("No referral_logs found to inspect. Creating one to check keys...");
        // Insert dummy if empty
        const { data: inserted, error: insErr } = await supabase.from('referral_logs').insert({
            status: 'pending'
        }).select().maybeSingle();

        if (inserted) {
            console.log("Keys:", Object.keys(inserted));
        } else {
            console.error("Insert failed:", insErr);
        }
    }
}

inspect();
