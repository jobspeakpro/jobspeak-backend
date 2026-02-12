
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import { supabase } from '../services/supabase.js';

async function syncProfiles() {
    console.log('Starting profile sync...');

    if (!supabase) {
        console.error('Supabase client not initialized. Check env vars.');
        process.exit(1);
    }

    // 1. Get all auth users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Failed to list users:', authError);
        process.exit(1);
    }

    console.log(`Found ${users.length} auth users.`);

    for (const user of users) {
        // 2. Check if profile exists
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

        if (profile) {
            console.log(`[OK] Profile exists for ${user.email}`);
        } else {
            console.log(`[MISSING] Creating profile for ${user.email}...`);
            // 3. Create profile
            const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                    id: user.id,
                    // email: user.email, // Removed potential invalid column
                    display_name: user.user_metadata?.full_name || user.email.split('@')[0],
                    credits: 3,
                    subscription_tier: 'free',
                    referral_code: 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
                    created_at: user.created_at,
                    updated_at: new Date().toISOString()
                });

            if (insertError) {
                console.error(`Failed to create profile for ${user.email}:`, insertError.message);
            } else {
                console.log(`[CREATED] Profile created for ${user.email}`);
            }
        }
    }

    console.log('Sync complete.');
}

syncProfiles();
