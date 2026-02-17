
const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');

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

    // Skip list check due to pagination limits
    // const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    // if (listError) console.error("List Error:", listError);

    // const user = users ? users.find(u => u.email === email) : null;

    // if (!user) {
    //     console.error("User not found!");
    //     return;
    // }

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
