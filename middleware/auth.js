// jobspeak-backend/middleware/auth.js
// Extract authenticated user from Supabase JWT token

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Create a Supabase client with anon key for user token verification
// Service role key can also verify tokens, but anon key is more appropriate for user auth
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

// Create client for token verification (use anon key if available, fallback to service role)
const supabaseAuth = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
    : null;

/**
 * Extract user from Supabase auth token in Authorization header
 * Returns { userId, isGuest } or { userId: null, isGuest: true } for unauthenticated
 * 
 * @param {Object} req - Express request object
 * @returns {Promise<{userId: string|null, isGuest: boolean}>}
 */
export async function getAuthenticatedUser(req) {
    // Check for Authorization header with Bearer token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No auth token - treat as guest
        return { userId: null, isGuest: true };
    }

    if (!supabaseAuth) {
        console.warn('[AUTH] Supabase auth client not configured, treating as guest');
        return { userId: null, isGuest: true };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
        // Verify the JWT token with Supabase
        const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

        if (error || !user) {
            console.log('[AUTH] Invalid or expired token, treating as guest');
            return { userId: null, isGuest: true };
        }

        // User is authenticated
        return { userId: user.id, email: user.email, isGuest: false };
    } catch (error) {
        console.error('[AUTH] Error verifying token:', error);
        return { userId: null, isGuest: true };
    }
}
