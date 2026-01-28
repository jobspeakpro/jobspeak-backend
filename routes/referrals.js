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
 */
export async function processReferralAction(userId) {
    console.log(`[REFERRAL] Processing action for user: ${userId}`);
    try {
        const { data: referralLog, error: logError } = await supabase
            .from('referral_logs')
            .select('*')
            .eq('referred_user_id', userId)
            .eq('status', 'pending')
            .single();

        if (logError || !referralLog) {
            return;
        }

        const referrerId = referralLog.referrer_id;

        await supabase
            .from('referral_logs')
            .update({ status: 'converted' })
            .eq('id', referralLog.id);

        const { data: profile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', referrerId)
            .single();

        const newCredits = (profile?.credits || 0) + 1;

        await supabase
            .from('profiles')
            .update({ credits: newCredits })
            .eq('id', referrerId);

    } catch (err) {
        console.error('[REFERRAL] Unexpected error processing action:', err);
    }
}

// GET /api/referrals/me
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

        let { data: profile } = await supabase
            .from('profiles')
            .select('referral_code')
            .eq('id', userId)
            .single();

        if (profile && profile.referral_code) {
            return res.json({
                code: profile.referral_code,
                referralCode: profile.referral_code,
                inviteUrl: `https://jobspeakpro.com/?ref=${profile.referral_code}`
            });
        }

        const newCode = generateReferralCode();

        const { data: updated, error: updateError } = await supabase
            .from('profiles')
            .update({ referral_code: newCode })
            .eq('id', userId)
            .select('referral_code')
            .single();

        if (updateError && updateError.code === '23505') {
            const retryCode = generateReferralCode();
            const { data: retryData } = await supabase
                .from('profiles')
                .update({ referral_code: retryCode })
                .eq('id', userId)
                .select('referral_code')
                .single();
            if (retryData) {
                return res.json({
                    code: retryData.referral_code,
                    referralCode: retryData.referral_code,
                    inviteUrl: `https://jobspeakpro.com/?ref=${retryData.referral_code}`
                });
            }
        }

        return res.json({
            code: updated?.referral_code || newCode,
            referralCode: updated?.referral_code || newCode,
            inviteUrl: `https://jobspeakpro.com/?ref=${updated?.referral_code || newCode}`
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function handleTrackReferral(req, res) {
    try {
        const { userId } = await getAuthenticatedUser(req);
        const { referralCode } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!referralCode) return res.status(400).json({ error: 'Referral code required' });

        const { data: referrer } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', referralCode)
            .single();

        if (!referrer) return res.status(404).json({ error: 'Invalid referral code' });
        if (referrer.id === userId) return res.status(400).json({ error: 'Cannot refer yourself' });

        const { error: logError } = await supabase
            .from('referral_logs')
            .insert({
                referrer_id: referrer.id,
                referrer_user_id: referrer.id,
                referred_user_id: userId,
                status: 'pending'
            });

        if (logError && logError.code === '23505') {
            return res.json({ message: 'Already referred', referrerId: referrer.id });
        }

        await supabase
            .from('profiles')
            .update({ referred_by: referrer.id })
            .eq('id', userId);

        return res.json({ success: true, referrerId: referrer.id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// POST /api/referrals/track & /claim
router.post('/referrals/track', handleTrackReferral);
router.post('/referrals/claim', handleTrackReferral);

// GET /api/referrals/history
router.get('/referrals/history', async (req, res) => {
    try {
        const { userId } = await getAuthenticatedUser(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { data: logs } = await supabase
            .from('referral_logs')
            .select('id, referred_user_id, status, created_at, profiles:referred_user_id(display_name)')
            .eq('referrer_id', userId)
            .order('created_at', { ascending: false });

        const history = logs?.map(log => ({
            ...log,
            referred_email: log.profiles?.display_name || 'User ' + log.referred_user_id.substring(0, 6)
        })) || [];

        return res.json({ history });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/referrals/redeem
router.post('/referrals/redeem', async (req, res) => {
    try {
        const { userId } = await getAuthenticatedUser(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { data: profile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single();

        const currentCredits = profile?.credits || 0;

        if (currentCredits <= 0) {
            return res.status(400).json({
                error: 'Not eligible',
                message: 'You have 0 credits. Refer more friends to earn credits!'
            });
        }

        const newCredits = currentCredits - 1;
        await supabase
            .from('profiles')
            .update({ credits: newCredits })
            .eq('id', userId);

        return res.json({
            success: true,
            credits: newCredits,
            message: 'Credit redeemed successfully!'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/referrals/stats
router.get('/referrals/stats', async (req, res) => {
    try {
        const { userId } = await getAuthenticatedUser(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { data: profile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single();

        const { count } = await supabase
            .from('referral_logs')
            .select('*', { count: 'exact', head: true })
            .eq('referrer_id', userId);

        return res.json({
            credits: profile?.credits || 0,
            total_referred: count || 0
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
