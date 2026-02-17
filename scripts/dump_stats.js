
import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function dumpStats() {
    console.log("--- DB STATS ---");

    // Auth Users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) console.error("Auth Error:", authError);
    console.log(`Auth Users Count: ${users.length}`);
    users.forEach(u => console.log(` - ${u.email} (${u.id})`));

    // Profiles
    const { data: profiles, error: profError } = await supabase.from('profiles').select('id, email, display_name');
    if (profError) console.error("Profile Error:", profError);
    console.log(`Public Profiles Count: ${profiles ? profiles.length : 0}`);
    if (profiles) profiles.forEach(p => console.log(` - ${p.email} (${p.id})`));

    // Validating alignment
    const authIds = new Set(users.map(u => u.id));
    const profileIds = new Set(profiles ? profiles.map(p => p.id) : []);

    console.log("\n--- Integrity Check ---");
    console.log(`Profiles without Auth: ${[...profileIds].filter(x => !authIds.has(x)).length}`);
    console.log(`Auth without Profiles: ${[...authIds].filter(x => !profileIds.has(x)).length}`);
}

dumpStats();
