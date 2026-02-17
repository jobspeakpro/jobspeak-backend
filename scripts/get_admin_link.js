
import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateLink() {
    const email = 'jobspeakpro@gmail.com';
    console.log(`Generating magic link for ${email}...`);

    // Check if user exists first
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        console.error("User not found!");
        return;
    }

    const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
            redirectTo: 'https://jobspeakpro.com/admin'
        }
    });

    if (error) {
        console.error("Error generating link:", error);
    } else {
        console.log("LOGIN_LINK:", data.properties.action_link);
    }
}

generateLink();
