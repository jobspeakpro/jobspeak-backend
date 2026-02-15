
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function confirmUser() {
    console.log("Searching for verification@test.com...");
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error("List users failed:", error);
        return;
    }

    const user = users.find(u => u.email === 'verification@test.com');
    if (!user) {
        console.error("User verification@test.com not found!");
        return;
    }

    console.log(`Found user ${user.id}. Confirming email...`);

    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
    );

    if (updateError) {
        console.error("Update failed:", updateError);
    } else {
        console.log("User confirmed successfully:", updated.user.email_confirmed_at);
    }
}

confirmUser();
