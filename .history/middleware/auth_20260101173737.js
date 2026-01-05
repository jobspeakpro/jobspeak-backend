// jobspeak-backend/middleware/auth.js
// Extract authenticated user from Supabase JWT token

import { supabase } from '../services/supabase.js';

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

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
        // Verify the JWT token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.log('[AUTH] Invalid or expired token, treating as guest');
            return { userId: null, isGuest: true };
        }

        // User is authenticated
        return { userId: user.id, isGuest: false };
    } catch (error) {
        console.error('[AUTH] Error verifying token:', error);
        return { userId: null, isGuest: true };
    }
}
