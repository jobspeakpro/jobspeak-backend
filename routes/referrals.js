import express from 'express';
import { supabase } from '../services/supabase.js';
import { getAuthenticatedUser } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * Generate a unique referral code
 */
function generateReferralCode() {
    return 'REF-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Process a "Qualifying Action" by a user (e.g. completing a session).
 * Checks if the user was referred and grants credit to the referrer if so.
 * This should be called when the user completes their first mock interview.
 * @param {string} userId - The ID of the user performing the action.
 */
export async function processReferralAction(userId) {
    console.log(`[REFERRAL] Processing action for user: ${userId}`);
    try {
        // 1. Check for a pending referral log for this user
        const { data: referralLog, error: logError } = await supabase
            .from('referral_logs')
            .select('*')
            .eq('referred_user_id', userId)
            .eq('status', 'pending')
            .single();

        if (logError || !referralLog) {
            if (logError && logError.code !== 'PGRST116') {
                console.error('[REFERRAL] Error checking logs:', logError);
            } else {
                console.log(`[REFERRAL] No pending referral found for user ${userId}`);
            }
            return; // No credit to grant
        }

        const referrerId = referralLog.referrer_id;
        console.log(`[REFERRAL] Found referrer ${referrerId}, granting credit...`);

        // 2. Mark referral as converted
        const { error: updateError } = await supabase
            .from('referral_logs')
            .update({ status: 'converted' })
            .eq('id', referralLog.id);

        if (updateError) {
            console.error('[REFERRAL] Failed to update referral log status:', updateError);
            return;
        }

        // 3. Grant credit to referrer (increment credits count)
        // We catch the error but don't rollback the log status (at worst they miss 1 credit, better than duplicate)
        // Ideally handled via RPC for atomicity, but direct query is acceptable for MVP.

        // Fetch current credits to increment (safer than blind update if concurrent, though rare for this)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', referrerId)
            .single();

        if (profileError) {
            console.error('[REFERRAL] Failed to fetch referrer profile:', profileError);
            return;
        }

        const newCredits = (profile.credits || 0) + 1;

        const { error: creditError } = await supabase
            .from('profiles')
            .update({ credits: newCredits })
            .eq('id', referrerId);

        if (creditError) {
            console.error('[REFERRAL] Failed to update referrer credits:', creditError);
        } else {
            console.log(`[REFERRAL] Successfully granted credit to ${referrerId}. New balance: ${newCredits}`);
        }

    } catch (err) {
        console.error('[REFERRAL] Unexpected error processing action:', err);
    }
}

// GET /api/referrals/me (Idempotent get-or-create)
router.get('/referrals/me', async (req, res) => {
    return handleGetReferralCode(req, res);
});

router.get('/referrals/code', async (req, res) => {
    return handleGetReferralCode(req, res);
});

async function handleGetReferralCode(req, res) {
    try {
        const { userId } = await getAuthenticatedUser(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // 1. Fetch existing code
        let { data: profile, error } = await supabase
            .from('profiles')
            .select('referral_code')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[REFERRAL] DB Error fetch:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        // 2. If code exists, return it
        if (profile && profile.referral_code) {
            const code = profile.referral_code;
            return res.json({
                code,
                referralCode: code, // Backwards compat
                inviteUrl: `https://jobspeakpro.com/?ref=${code}`
            });
        }

        // 3. Generate and Save (Robust Upsert)
        const newCode = generateReferralCode();

        // We use UPDATE because profile should exist for auth user.
        // If not, we might need INSERT, but triggers usually handle profile creation.
        const { data: updated, error: updateError } = await supabase
            .from('profiles')
            .update({ referral_code: newCode })
            .eq('id', userId)
            .select('referral_code')
            .single();

        if (updateError) {
            console.error('[REFERRAL] Failed to generate code:', updateError);
            // Retry once in case of collision (very rare with 4 bytes hex but possible)
            if (updateError.code === '23505') { // Unique violation
                const retryCode = generateReferralCode();
                const { data: retryData, error: retryError } = await supabase
                    .from('profiles')
                    .update({ referral_code: retryCode })
                    .eq('id', userId)
                    .select('referral_code')
                    .single();

                if (!retryError && retryData) {
                    return res.json({
                        code: retryData.referral_code,
                        referralCode: retryData.referral_code,
                        inviteUrl: `https://jobspeakpro.com/?ref=${retryData.referral_code}`
                    });
                }
            }
            return res.status(500).json({ error: 'Failed to generate code', details: updateError.message });
        }

        return res.json({
            code: updated.referral_code,
            referralCode: updated.referral_code,
            inviteUrl: `https://jobspeakpro.com/?ref=${updated.referral_code}`
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
}


// POST /api/referrals/track
router.post('/referrals/track', async (req, res) => {
    try {
        const { userId } = await getAuthenticatedUser(req);
        const { referralCode } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!referralCode) return res.status(400).json({ error: 'Referral code required' });

        // 1. Find referrer
        const { data: referrer, error: findError } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', referralCode)
            .single();

        if (findError || !referrer) {
            return res.status(404).json({ error: 'Invalid referral code' });
        }

        if (referrer.id === userId) {
            return res.status(400).json({ error: 'Cannot refer yourself' });
        }

        // 2. Link users
        // Use upsert or insert with ignore on conflict to prevent errors if already referred
        const { error: logError } = await supabase
            .from('referral_logs')
            .insert({
                referrer_id: referrer.id,
                referrer_user_id: referrer.id, // Redundant column handling
                referred_user_id: userId,
                status: 'pending'
            });

        if (logError) {
            if (logError.code === '23505') { // Unique violation
                return res.json({ message: 'Already referred', referrerId: referrer.id });
            }
            return res.status(500).json({ error: 'Failed to track referral', details: logError.message });
        }

        // 3. Update profile 'referred_by' for quick lookup
        await supabase
            .from('profiles')
            .update({ referred_by: referrer.id })
            .eq('id', userId);

        return res.json({ success: true, referrerId: referrer.id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/referrals/history
router.get('/referrals/history', async (req, res) => {
    try {
        const { userId } = await getAuthenticatedUser(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { data: logs, error } = await supabase
            .from('referral_logs')
            .select('id, referred_user_id, status, created_at') // Privacy: maybe don't show user details? User implementation plan didn't specify.
            // Requirement: "View referral history". Usually show "User XXX" or similar.
            // Joining to profiles to get display names of referred users would be nice.
            .eq('referrer_id', userId)
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ error: 'Database error' });

        return res.json({ history: logs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
