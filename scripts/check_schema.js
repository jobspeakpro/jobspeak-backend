
import { supabase } from '../services/supabase.js';

async function checkSchema() {
    console.log("Checking affiliate_applications columns...");
    const { data, error } = await supabase
        .from('affiliate_applications')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else {
        if (data.length > 0) {
            console.log("Columns:", Object.keys(data[0]));
        } else {
            console.log("Table is empty, trying to insert dummy to see error or success...");
        }
    }
}

checkSchema();
