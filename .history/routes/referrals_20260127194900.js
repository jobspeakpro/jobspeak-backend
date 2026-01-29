import express from 'express';
import { supabase } from '../services/supabase.js';
import { getAuthenticatedUser } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

function generateReferralCode() {
    return 'REF-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function processReferralAction(userId) {
    try {
        const { data: referralLog } = await supabase
            .from('referral_logs')
            .select('*')
            .eq('referred_user_id', userId)
            .eq('status', 'pending')
            .single();

        if (!referralLog) return;

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
        console.error('[REFERRAL] Error:', err);
    }
}

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
            return res.json({ code: profile.referral_code, referralCode: profile.referral_code, inviteUrl: `https://jobspeakpro.com/?ref=${profile.referral_code}` });
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
            const { data: retryData } = await supabase.from('profiles').update({ referral_code: retryCode }).eq('id', userId).select().single();
            if (retryData) return res.json({ code: retryData.referral_code, referralCode: retryData.referral_code, inviteUrl: `https://jobspeakpro.com/?ref=${retryData.referral_code}` });
        }

        return res.json({ code: updated?.referral_code || newCode, referralCode: updated?.referral_code || newCode, inviteUrl: `https://jobspeakpro.com/?ref=${updated?.referral_code || newCode}` });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

router.get('/referrals/me', handleGetReferralCode);
router.get('/referrals/code', handleGetReferralCode);

async function handleTrackReferral(req, res) {
    try {
        const { userId } = await getAuthenticatedUser(req);
        const { referralCode } = req.body;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!referralCode) return res.status(400).json({ error: 'Referral code required' });

        const { data: referrer } = await supabase.from('profiles').select('id').eq('referral_code', referralCode).single();
        if (!referrer) return res.status(404).json({ error: 'Invalid referral code' });
        if (referrer.id === userId) return res.status(400).json({ error: 'Cannot refer yourself' });

        const { error: logError } = await supabase.from('referral_logs').insert({
            referrer_id: referrer.id,
            referrer_user_id: referrer.id,
            referred_user_id: userId,
            status: 'pending'
        });

        if (logError && logError.code === '23505') return res.json({ message: 'Already referred', referrerId: referrer.id });

        await supabase.from('profiles').update({ referred_by: referrer.id }).eq('id', userId);
        return res.json({ success: true, referrerId: referrer.id });

    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

router.post('/referrals/track', handleTrackReferral);
router.post('/referrals/claim', handleTrackReferral);

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
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/referrals/redeem', async (req, res) => {
    try {
        const { userId } = await getAuthenticatedUser(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
        if ((profile?.credits || 0) <= 0) return res.status(400).json({ error: 'Not eligible', message: '0 credits' });

        await supabase.from('profiles').update({ credits: (profile.credits - 1) }).eq('id', userId);
        return res.json({ success: true, credits: profile.credits - 1 });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
