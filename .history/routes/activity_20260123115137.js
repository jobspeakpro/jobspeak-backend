// jobspeak-backend/routes/activity.js
// Activity tracking endpoints for practice and mock interview starts

import express from "express";
import { supabase } from "../services/supabase.js";

const router = express.Router();

/**
 * Identity resolution helper
 * Priority:
 * 1. Authorization Bearer token (JWT) -> extract user_id
 * 2. x-guest-key header -> use as identity_key
 * 3. body.userKey -> use as identity_key
 * Returns: { user_id, identity_key, source }
 */
function resolveIdentity(req) {
    let user_id = null;
    let identity_key = null;
    let source = null;

    // Priority 1: Authorization header (JWT)
    const authHeader = req.header('authorization') || req.header('Authorization');
    if (authHeader && typeof authHeader === 'string') {
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
            const token = parts[1];
            try {
                // Simple base64 decode of JWT payload (middle part)
                const payload = token.split('.')[1];
                if (payload) {
                    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
                    if (decoded.sub || decoded.user_id || decoded.id) {
                        user_id = decoded.sub || decoded.user_id || decoded.id;
                        source = 'authorization-jwt';
                    }
                }
            } catch (err) {
                console.log(`[ACTIVITY] JWT decode failed: ${err.message}`);
            }
        }
    }

    // Priority 2: x-guest-key header
    if (!user_id) {
        const xGuestKey = req.header('x-guest-key');
        if (xGuestKey && typeof xGuestKey === 'string' && xGuestKey.trim().length > 0) {
            identity_key = xGuestKey.trim();
            source = 'x-guest-key';
        }
    }

    // Priority 3: body.userKey (fallback for backward compatibility)
    if (!user_id && !identity_key && req.body.userKey) {
        const userKey = req.body.userKey;
        // Determine if it's a UUID (authenticated) or guest key
        if (userKey && !userKey.startsWith('guest-') && !userKey.startsWith('session-')) {
            user_id = userKey;
            source = 'body.userKey-authed';
        } else {
            identity_key = userKey;
            source = 'body.userKey-guest';
        }
    }

    return { user_id, identity_key, source };
}

/**
 * POST /api/activity/start
 * Track when user starts a practice or mock interview activity
 *
 * Body:
 * - activityType: "practice" | "mock_interview"
 * - context: { tabId?, sessionId?, interviewType?, ... }
 *
 * Headers:
 * - Authorization: Bearer <token> (for authenticated users)
 * - x-guest-key: <guest-key> (for guest users)
 *
 * Returns:
 * - 200 always with { ok: true, stored: true/false, disabled?: true }
 * - stored: false if Supabase write fails or feature is disabled
 */
router.post("/activity/start", async (req, res) => {
    try {
        // Feature flag: check if activity tracking is disabled
        if (process.env.ACTIVITY_TRACKING_ENABLED === 'false') {
            console.log('[ACTIVITY] Feature disabled via ACTIVITY_TRACKING_ENABLED=false');
            return res.json({
                ok: true,
                stored: false,
                disabled: true
            });
        }

        const { activityType, context = {} } = req.body;

        // Validate activityType
        if (!activityType || !['practice', 'mock_interview'].includes(activityType)) {
            console.log('[ACTIVITY] Invalid activityType:', activityType);
            return res.json({
                ok: true,
                stored: false,
                error: 'Invalid activityType (must be "practice" or "mock_interview")'
            });
        }

        // Resolve identity
        const { user_id, identity_key, source } = resolveIdentity(req);

        // If no identity, return success but not stored
        if (!user_id && !identity_key) {
            console.log('[ACTIVITY] No identity resolved');
            return res.json({
                ok: true,
                stored: false,
                error: 'No identity provided'
            });
        }

        console.log(`[ACTIVITY] Recording activity: type=${activityType}, source=${source}, user_id=${user_id || 'null'}, identity_key=${identity_key || 'null'}`);

        // Prepare insert data
        const insertData = {
            user_id,
            identity_key,
            activity_type: activityType,
            context: context || {},
            day: new Date().toISOString().split('T')[0] // YYYY-MM-DD
        };

        // Insert with conflict handling (dedupe)
        // If dedupe constraint is hit, just return success (already tracked)
        const { data, error } = await supabase
            .from('activity_events')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            // Check if it's a dedupe error (unique constraint violation)
            if (error.code === '23505') {
                // Dedupe - already tracked today
                console.log(`[ACTIVITY] Dedupe: activity already tracked for ${activityType} today`);
                return res.json({
                    ok: true,
                    stored: true,
                    dedupe: true
                });
            }

            // Other error - log but return success
            console.error('[ACTIVITY] Insert error (non-fatal):', error.message);
            return res.json({
                ok: true,
                stored: false,
                error: error.message
            });
        }

        console.log(`[ACTIVITY] Successfully tracked: id=${data.id}`);

        return res.json({
            ok: true,
            stored: true,
            id: data.id
        });

    } catch (error) {
        console.error('[ACTIVITY] Unexpected error:', error);
        // Always return 200 - resilient design
        return res.json({
            ok: true,
            stored: false,
            error: 'Internal error'
        });
    }
});

/**
 * GET /api/activity/events
 * Retrieve activity events for current user
 *
 * Query params:
 * - limit: number (default: 50, max: 100)
 *
 * Headers:
 * - Authorization: Bearer <token> (for authenticated users)
 * - x-guest-key: <guest-key> (for guest users)
 *
 * Returns:
 * - { events: [...], total: number }
 */
router.get("/activity/events", async (req, res) => {
    try {
        // Feature flag: check if activity tracking is disabled
        if (process.env.ACTIVITY_TRACKING_ENABLED === 'false') {
            return res.json({ events: [], total: 0, disabled: true });
        }

        const { limit = 50 } = req.query;
        const maxLimit = Math.min(parseInt(limit, 10) || 50, 100);

        // Resolve identity
        const { user_id, identity_key, source } = resolveIdentity(req);

        // If no identity, return empty
        if (!user_id && !identity_key) {
            return res.json({ events: [], total: 0 });
        }

        console.log(`[ACTIVITY] Fetching events: source=${source}, user_id=${user_id || 'null'}, identity_key=${identity_key || 'null'}`);

        // Build query
        let query = supabase
            .from('activity_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(maxLimit);

        // Filter by identity
        if (user_id) {
            query = query.eq('user_id', user_id);
        } else {
            query = query.eq('identity_key', identity_key);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[ACTIVITY] Fetch error:', error.message);
            return res.status(500).json({ error: 'Failed to fetch activity events' });
        }

        console.log(`[ACTIVITY] Fetched ${data?.length || 0} events`);

        return res.json({
            events: data || [],
            total: data?.length || 0
        });

    } catch (error) {
        console.error('[ACTIVITY] Unexpected error:', error);
        return res.status(500).json({ error: 'Failed to fetch activity events' });
    }
});

/**
 * POST /api/activity/sync
 * Migrate guest activity to authenticated user
 * 
 * Headers:
 * - Authorization: Bearer <token> (REQUIRED)
 * - x-guest-key: <guest-key> (REQUIRED)
 * 
 * Returns:
 * - 200 with { ok: true, synced: number }
 */
router.post("/activity/sync", async (req, res) => {
    try {
        // Feature flag
        if (process.env.ACTIVITY_TRACKING_ENABLED === 'false') {
            return res.json({ ok: true, synced: 0, disabled: true });
        }

        // 1. Get authenticated User ID
        // Reuse resolveIdentity logic but specifically look for JWT source
        const ident = resolveIdentity(req);

        // We strictly require an authenticated user for sync target
        // Check if resolution found a user_id from JWT
        if (!ident.user_id || ident.source !== 'authorization-jwt') {
            console.log('[ACTIVITY] Sync failed: No authenticated user found');
            return res.status(401).json({ error: 'Authentication required for sync' });
        }

        const userId = ident.user_id;

        // 2. Get Guest Key from header
        const guestKey = req.header('x-guest-key');
        if (!guestKey || typeof guestKey !== 'string' || !guestKey.trim()) {
            console.log('[ACTIVITY] Sync failed: No x-guest-key header');
            return res.status(400).json({ error: 'x-guest-key header required' });
        }

        const identityKey = guestKey.trim();

        console.log(`[ACTIVITY] Syncing guest=${identityKey} to user=${userId}`);

        // 3. Perform Update
        // Update all events with this identity_key to have this user_id
        // We only update if user_id is NULL (beltsers/braces, though technically they belong to guest)
        // Actually, just overwrite ownership to the user
        const { data, error, count } = await supabase
            .from('activity_events')
            .update({ user_id: userId })
            .eq('identity_key', identityKey)
            .select();

        if (error) {
            console.error('[ACTIVITY] Sync update error:', error.message);
            return res.json({ ok: false, error: error.message });
        }

        console.log(`[ACTIVITY] Synced ${data?.length || 0} events`);

        return res.json({
            ok: true,
            synced: data?.length || 0
        });

    } catch (error) {
        console.error('[ACTIVITY] Sync unexpected error:', error);
        return res.status(500).json({ error: 'Internal sync error' });
    }
});

export { resolveIdentity }; // Export for other routes
export default router;
