
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ADMIN_EMAIL = 'antigravity_admin@test.com';
const ADMIN_PASSWORD = 'password123';

async function createAdmin() {
    console.log(`Creating Admin User: ${ADMIN_EMAIL}...`);

    // Check if exists
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existing = users.find(u => u.email === ADMIN_EMAIL);

    if (existing) {
        console.log("Admin user already exists. Updating password...");
        const { error } = await supabase.auth.admin.updateUserById(existing.id, { password: ADMIN_PASSWORD });
        if (error) console.error("Update failed:", error);
        else console.log("Password updated.");
    } else {
        console.log("Creating new admin user...");
        const { data, error } = await supabase.auth.admin.createUser({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: "Antigravity Admin" }
        });
        if (error) console.error("Creation failed:", error);
        else console.log("Admin user created:", data.user.id);
    }
}

createAdmin();
