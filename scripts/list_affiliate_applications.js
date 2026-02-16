
import { supabase } from '../services/supabase.js';

async function listApps() {
    const { data, error } = await supabase
        .from('affiliate_applications')
        .select('id, name, email, status, affiliate_code')
        .order('created_at', { ascending: false }) // Get newest
        .limit(5);

    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

listApps();
