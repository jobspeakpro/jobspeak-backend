const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env file
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim();
    }
});

const supabase = createClient(
    envVars.SUPABASE_URL,
    envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function resetQAAccounts() {
    console.log('🔄 Resetting heard_about_us for QA accounts...\n');

    const qaEmails = [
        'jsp.qa.001@jobspeakpro-test.local',
        'jsp.qa.002@jobspeakpro-test.local'
    ];

    for (const email of qaEmails) {
        console.log(`Resetting: ${email}`);

        // Get user ID
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) {
            console.log(`   ❌ Error fetching users: ${authError.message}`);
            continue;
        }

        const user = authData.users.find(u => u.email === email);
        if (!user) {
            console.log(`   ❌ User not found`);
            continue;
        }

        // Reset heard_about_us to NULL
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ heard_about_us: null })
            .eq('id', user.id);

        if (updateError) {
            console.log(`   ❌ Error: ${updateError.message}`);
        } else {
            console.log(`   ✅ Reset to NULL (User ID: ${user.id})`);
        }
    }

    console.log('\n✅ Reset complete!');
}

resetQAAccounts().catch(console.error);
