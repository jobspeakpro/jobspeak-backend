import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './services/supabase.js';
import crypto from 'crypto';

async function seedReferrals() {
    console.log("Seeding 3 Referrals for Screenshot...");

    const password = 'Password123!';
    const timestamp = Date.now();
    const referrerEmail = `screenshot_referrer_${timestamp}@example.com`;

    // 1. Create Referrer
    console.log(`Creating Referrer: ${referrerEmail}`);
    const { data: userA, error: errA } = await supabase.auth.signUp({
        email: referrerEmail,
        password,
        options: { data: { display_name: 'Screenshot User' } }
    });

    if (errA) {
        console.error("Error creating referrer:", errA.message);
        // Fallback: try signing in if user exists (unlikely with timestamp)
        return;
    }
    const referrerId = userA.user.id;
    console.log(`Referrer ID: ${referrerId}`);

    // Generate Referral Code
    const referralCode = 'REF-SCREEN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    await supabase.from('profiles').update({ referral_code: referralCode, credits: 0 }).eq('id', referrerId);
    console.log(`Referrer Code: ${referralCode}`);

    // 2. Create 3 Referees
    for (let i = 1; i <= 3; i++) {
        const referredEmail = `referee_${i}_${timestamp}@example.com`;
        console.log(`Creating Referee ${i}: ${referredEmail}`);

        const { data: userB, error: errB } = await supabase.auth.signUp({
            email: referredEmail,
            password,
            options: { data: { display_name: `Referee ${i}` } }
        });

        if (errB) {
            console.error(`Error creating referee ${i}:`, errB.message);
            continue;
        }
        const referredId = userB.user.id;

        // 3. Create Referral Log (Converted)
        console.log(`Linking Referee ${i} -> Referrer`);
        const { error: trackError } = await supabase.from('referral_logs').insert({
            referrer_id: referrerId,
            referred_user_id: referredId,
            status: 'converted', // Directly converted for the screenshot
            created_at: new Date(Date.now() - i * 86400000).toISOString() // Different dates
        });

        if (trackError) console.error("Track Error:", trackError);

        // 4. Update Referrer Credits
        await supabase.rpc('increment_credits', { user_id: referrerId });
    }

    // 5. Output Creds
    console.log("\n--- SEED COMPLETE ---");
    console.log(`EMAIL: ${referrerEmail}`);
    console.log(`PASSWORD: ${password}`);
    console.log("---------------------");

    // Force exit
    process.exit(0);
}

seedReferrals().catch(e => {
    console.error(e);
    process.exit(1);
});
