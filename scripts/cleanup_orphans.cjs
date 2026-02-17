
const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ADMIN_EMAIL = 'jobspeakpro@gmail.com';

async function cleanupOrphans() {
    console.log("--- CLEANING ORPHANED AFFILIATE APPS ---");

    // 1. Get all apps
    const { data: apps, error } = await supabase.from('affiliate_applications').select('*');
    if (error) {
        console.error("Error fetching apps:", error);
        return;
    }

    // 2. Filter
    const toDelete = apps.filter(a => a.email !== ADMIN_EMAIL);

    console.log(`Found ${apps.length} total apps.`);
    console.log(`Targeting ${toDelete.length} apps for DELETION (excluding ${ADMIN_EMAIL}).`);

    if (toDelete.length === 0) {
        console.log("Nothing to delete.");
        return;
    }

    // 3. Delete
    for (const app of toDelete) {
        const { error: delErr } = await supabase.from('affiliate_applications').delete().eq('id', app.id);
        if (delErr) console.error(`Failed to delete ${app.id}:`, delErr.message);
        else console.log(`Deleted app ${app.id} (${app.email})`);
    }

    console.log("Orphan cleanup complete.");
}

cleanupOrphans();
