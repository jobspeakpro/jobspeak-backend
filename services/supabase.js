
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
// Use Service Role Key for backend admin privileges (bypassing RLS if needed, or ensuring we can write)
// OR use Anon key if we are just passing through (but backend usually needs admin to act on behalf of user if we don't have their session)
// Given we typically receive 'userKey' (which might be a UUID from Supabase auth on frontend), we might need admin rights to write profiles table directly by user ID.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase;

if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY. Profile features will fail.");
    // Create a dummy client or just null. 
    // Better to create a proxy that logs error on use to prevent runtime crash on acccess?
    // For now, let's leave it undefined and handle checks in helper functions OR create a dummy object that throws specific errors.
    supabase = {
        from: () => ({
            select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: "Supabase not configured" } }) }) }),
            upsert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: "Supabase not configured" } }) }) })
        })
    };
} else {
    supabase = createClient(supabaseUrl, supabaseKey);
}

export { supabase };

// Export function to get Supabase client
export function getSupabase() {
    return supabase;
}



export async function getProfile(userKey) {
    // Assuming userKey is the UUID from profiles table (id)
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userKey) // Supabase profiles usually use 'id' as primary key matching auth.users
        .single();

    if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 is "JSON object requested, multiple (or no) rows returned" - essentially 404
            console.error("Supabase getProfile error:", error);
        }
        return null;
    }
    return data;
}

export async function upsertProfile(userKey, profileData) {
    const { data, error } = await supabase
        .from('profiles')
        .upsert({
            id: userKey,
            ...profileData,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error("Supabase upsertProfile error:", error);
        throw error;
    }
    return data;
}

/**
 * Create a user via Supabase Admin API (Service Role)
 * Bypasses public signup rate limits and captcha
 */
export async function adminCreateUser({ email, password, user_metadata }) {
    if (!supabase || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const error = new Error("Supabase Service Role Key not configured");
        error.code = 'CONFIG_ERROR';
        throw error;
    }

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata,
        email_confirm: false
    });

    if (error) throw error;
    return data;
}

/**
 * Generate a signup/verification link via Supabase Admin REST API
 * Using direct REST instead of SDK for deterministic behavior
 */
export async function adminGenerateLink({ email, password, redirectTo }) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const error = new Error("Supabase Service Role Key not configured");
        error.code = 'CONFIG_ERROR';
        throw error;
    }

    const url = `${process.env.SUPABASE_URL}/auth/v1/admin/generate_link`;

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
            type: "signup",
            email,
            password,
            options: { redirectTo },
        }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.action_link) {
        console.log("[AUTH-SIGNUP] generate_link REST failed", {
            status: res.status,
            data,
        });
        throw new Error(`GENERATE_LINK_REST_FAILED:${res.status}`);
    }

    return data.action_link;
}

/**
 * Verify invite code helper
 * Now async: also accepts user referral codes (REF-XXXXXXXX) by checking the DB
 * Returns { valid: boolean, referrerId: string|null }
 */
export async function verifyInviteCode(code) {
    if (!code) return { valid: false, referrerId: null };
    const cleanCode = code.trim();

    // 1. Always accept the master key
    if (cleanCode === 'JSP2026!') return { valid: true, referrerId: null };

    // 2. Check env var list (comma separated)
    const envCodes = (process.env.SIGNUP_INVITE_CODES || process.env.SIGNUP_INVITE_CODE || '').split(',').map(c => c.trim()).filter(Boolean);
    if (envCodes.includes(cleanCode)) return { valid: true, referrerId: null };

    // 3. Check if it's a valid referral code (REF-XXXXXXXX) in the DB
    if (cleanCode.startsWith('REF-') && supabase && supabase.from) {
        try {
            const { data: referrer } = await supabase
                .from('profiles')
                .select('id')
                .eq('referral_code', cleanCode)
                .single();

            if (referrer) {
                console.log(`[INVITE] Referral code ${cleanCode} belongs to user ${referrer.id}`);
                return { valid: true, referrerId: referrer.id };
            }
        } catch (err) {
            console.warn('[INVITE] Referral code DB lookup failed:', err.message);
        }
    }

    return { valid: false, referrerId: null };
}

/**
 * Real login via Supabase
 */
export async function signInUser({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) throw error;
    return data;
}

/**
 * Log invite usage (Fire and forget)
 */
export async function logInviteUsage({ email, inviteCode, userId }) {
    // Only proceed if we have a robust client
    if (!supabase || !supabase.from) return;

    // Fire and forget - don't await or crash
    supabase.from('signup_invites').insert({
        email,
        invite_code: inviteCode,
        user_id: userId,
        created_at: new Date().toISOString()
    }).then(({ error }) => {
        if (error) console.warn('[INVITE-LOG] Failed to log usage:', error.message);
        else console.log('[INVITE-LOG] Logged usage for:', email);
    }).catch(err => {
        console.warn('[INVITE-LOG] Exception:', err.message);
    });
}

