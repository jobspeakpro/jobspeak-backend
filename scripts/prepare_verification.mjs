
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function prepare() {
    console.log("Seeding pending affiliate applications...");

    // 1. Get a valid user ID (verification@test.com)
    const { data: { users }, error: userErr } = await supabase.auth.admin.listUsers();

    if (userErr) {
        console.error("Error listing users:", userErr);
        return;
    }

    if (!users || !users.length) {
        console.error("No users found to attach application to.");
        return;
    }

    const validUser = users.find(u => u.email === 'verification@test.com') || users[0];
    const userId = validUser.id;
    console.log(`Using User ID 1: ${userId} (${validUser.email})`);

    // Cleanup existing apps for this user to avoid conflicts
    await supabase.from('affiliate_applications').delete().eq('user_id', userId);

    // 1. Create Pending Application for Approval Test
    const { data: app1, error: err1 } = await supabase.from('affiliate_applications').insert({
        user_id: userId,
        name: 'Auto Test Approve',
        email: 'approve_test@test.com',
        primary_platform: 'YouTube',
        audience_size: '50k',
        payout_preference: 'PayPal: test@test.com',
        status: 'pending',
        created_at: new Date().toISOString()
    }).select().single();

    if (err1) console.error("Error creating app1:", err1.message);
    else console.log("Created pending app for Approval:", app1.id);

    // 2. Create/Find User 2 for Rejection Test
    let userId2 = userId;
    // Try to find verification2 first
    const user2Obj = users.find(u => u.email === 'verification2@test.com');
    if (user2Obj) {
        userId2 = user2Obj.id;
        console.log(`Found User 2: ${userId2}`);
    } else {
        // Create verification2
        const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
            email: 'verification2@test.com',
            password: 'password123',
            email_confirm: true
        });
        if (!createErr && createdUser.user) {
            userId2 = createdUser.user.id;
            console.log(`Created User 2: ${userId2}`);
        } else {
            console.warn("Could not create user 2, falling back to user 1 for second app (might fail if unique constraint exists)");
        }
    }

    // Cleanup for user 2
    if (userId2 !== userId) {
        await supabase.from('affiliate_applications').delete().eq('user_id', userId2);
    }

    const { data: app2, error: err2 } = await supabase.from('affiliate_applications').insert({
        user_id: userId2,
        name: 'Auto Test Reject',
        email: 'reject_test@test.com',
        primary_platform: 'Instagram',
        audience_size: '10k',
        payout_preference: 'Venmo',
        status: 'pending',
        created_at: new Date(Date.now() - 10000).toISOString()
    }).select().single();

    if (err2) console.error("Error creating app2:", err2.message);
    else console.log("Created pending app for Rejection:", app2.id);

}

prepare();
