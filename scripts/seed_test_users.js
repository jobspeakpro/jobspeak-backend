import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const users = [
    { email: 'jobspeakpro+u1_ref@gmail.com', name: 'User 1 (Referrer)', role: 'free' },
    { email: 'jobspeakpro+u2_referee@gmail.com', name: 'User 2 (Referee)', role: 'free', referrerEmail: 'jobspeakpro+u1_ref@gmail.com' },
    { email: 'jobspeakpro+u3_affiliate@gmail.com', name: 'User 3 (Affiliate)', role: 'free', affiliate: true },
    { email: 'jobspeakpro+u4_pro@gmail.com', name: 'User 4 (Pro)', role: 'pro' },
    { email: 'jobspeakpro+u5_mobile@gmail.com', name: 'User 5 (Mobile)', role: 'free' },
    { email: 'jobspeakpro+u6_standard@gmail.com', name: 'User 6 (Std)', role: 'free' },
    { email: 'jobspeakpro+u7_direct@gmail.com', name: 'User 7 (Dir)', role: 'free' },
    { email: 'jobspeakpro+u8_persist@gmail.com', name: 'User 8 (Pers)', role: 'free' },
    { email: 'jobspeakpro+u9_edge@gmail.com', name: 'User 9 (Edge)', role: 'free' },
    { email: 'jobspeakpro+u10_admin@gmail.com', name: 'User 10 (Admin)', role: 'free' }
];

async function seed() {
    console.log('Seeding 10 users...');
    const emailToId = {};

    for (const u of users) {
        // 1. Create Auth User
        // Check existence first to avoid error log spam
        const { data: { users: existingList } } = await supabase.auth.admin.listUsers();
        let user = existingList.find(e => e.email === u.email);

        if (!user) {
            const { data, error } = await supabase.auth.admin.createUser({
                email: u.email,
                password: 'Password123!',
                email_confirm: true,
                user_metadata: { full_name: u.name }
            });
            if (error) {
                console.error(`Error creating ${u.email}:`, error.message);
                continue;
            }
            user = data.user;
            console.log(`Created ${u.email}`);
        } else {
            console.log(`Existing ${u.email}`);
        }
        emailToId[u.email] = user.id;

        // 2. Profile Upsert
        const referralCode = 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        await supabase.from('profiles').upsert({
            id: user.id,
            display_name: u.name,
            referral_code: referralCode, // Ensure code
            subscription_tier: u.role,
            credits: u.role === 'pro' ? 100 : 3,
            updated_at: new Date().toISOString()
        }, { onConflict: 'id', ignoreDuplicates: false }); // Update existing

        // 3. Affiliate App
        if (u.affiliate) {
            await supabase.from('affiliate_applications').upsert({
                user_id: user.id,
                name: u.name,
                email: u.email,
                primary_platform: 'TestScript',
                status: 'pending',
                created_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        }
    }

    // 4. Link Referrals
    for (const u of users) {
        if (u.referrerEmail && emailToId[u.referrerEmail] && emailToId[u.email]) {
            const referrerId = emailToId[u.referrerEmail];
            const refereeId = emailToId[u.email];

            // Check if log exists
            const { data: logs } = await supabase.from('referral_logs').select('id').eq('referred_user_id', refereeId);
            if (!logs || logs.length === 0) {
                await supabase.from('referral_logs').insert({
                    referrer_user_id: referrerId,
                    referred_user_id: refereeId,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
                console.log(`Linked ${u.email} -> ${u.referrerEmail}`);
            }
        }
    }
    console.log('Seeding complete.');
}

seed();
