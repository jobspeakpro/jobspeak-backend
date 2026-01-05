
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
