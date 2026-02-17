
const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function dumpStats() {
    console.log("--- DB STATS ---");

    // Auth Users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) console.error("Auth Error:", authError);
    console.log(`Auth Users Count: ${users ? users.length : 0}`);
    if (users) users.forEach(u => console.log(` - ${u.email} (${u.id})`));

    // Profiles
    const { data: profiles, error: profError } = await supabase.from('profiles').select('id, email, display_name');
    if (profError) {
        // Try selecting just ID if email is not in profiles (it usually isn't in profiles table for some setups, but schema said otherwise?)
        // Schema: public.profiles (id, display_name...) - no email column in schema.sql!
        // Wait, schema.sql:
        // create table if not exists public.profiles (
        //   id uuid references auth.users not null primary key,
        //   display_name text,
        // ...
        // No email column. It's in auth.users.
        console.log("Retrying profile fetch without email column...");
        const { data: profilesRetry, error: profErrorRetry } = await supabase.from('profiles').select('id, display_name');
        if (profErrorRetry) console.error("Profile Error Retry:", profErrorRetry);
        else {
            console.log(`Public Profiles Count: ${profilesRetry.length}`);
            profilesRetry.forEach(p => console.log(` - [ID: ${p.id}] ${p.display_name}`));
        }
    } else {
        console.log(`Public Profiles Count: ${profiles.length}`);
        profiles.forEach(p => console.log(` - ${p.email} (${p.id})`));
    }
}

dumpStats();
