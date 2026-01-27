
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    console.log("Checking affiliate_applications schema via insert...");

    // Try to insert with new fields to see if it errs
    const { error } = await supabase
        .from('affiliate_applications')
        .insert({
            name: 'Schema Check',
            email: 'schema_check@example.com',
            payout_preference: 'paypal', // Potential new field
            primary_platform: 'youtube'  // Potential new field
        });

    if (error) {
        console.log("Insert Error (likely missing columns):", error.message);
    } else {
        console.log("Insert Success! Columns likely exist.");
    }
}

checkSchema();
