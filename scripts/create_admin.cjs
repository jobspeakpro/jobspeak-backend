
const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
    const email = 'jobspeakpro@gmail.com';
    const password = 'JobSpeakProAdmin2026!'; // Strong temporary password

    console.log(`Creating admin user ${email}...`);

    const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { display_name: 'JobSpeakPro Admin' }
    });

    if (error) {
        console.error("Error creating user:", error);
    } else {
        console.log("User created successfully:", data.user.id);
    }
}

createAdmin();
