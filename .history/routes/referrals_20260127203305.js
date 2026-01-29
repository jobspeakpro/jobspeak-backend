import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../services/supabase.js';
import { getAuthenticatedUser } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

function generateReferralCode() {
    return 'REF-' + crypto.randomBytes(4).toString('hex').toUpperCase();
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
        console.error("GetReferralCode Error:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

router.get('/referrals/me', handleGetReferralCode);
router.get('/referrals/code', handleGetReferralCode);

async function handleTrackReferral(req, res) {
    try {
        const { userId } = await getAuthenticatedUser(req);
        const { referralCode } = req.body;
        console.log(`[REFERRAL] Track request by ${userId} for code ${referralCode}`);

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!referralCode) return res.status(400).json({ error: 'Referral code required' });

        // Select 'id' AND 'referral_code' to ensure we have data for insert
        const { data: referrer, error: referrerError } = await supabase.from('profiles').select('id, referral_code').eq('referral_code', referralCode).single();

        if (referrerError || !referrer) {
            console.warn(`[REFERRAL] Invalid code: ${referralCode}`);
            return res.status(404).json({ error: 'Invalid referral code' });
        }

        if (referrer.id === userId) {
            return res.status(400).json({ error: 'Cannot refer yourself' });
        }

        // Inserting ALL columns required by schema/user
        const { data: newLog, error: logError } = await supabase.from('referral_logs').insert({
            referrer_id: referrer.id,
            referrer_user_id: referrer.id, // Explicitly verified
            referred_user_id: userId,
            referral_code: referralCode, // USER REQUIREMENT
            status: 'pending'
        })
            .select('id, created_at, status')
            .single();

        if (logError) {
            if (logError.code === '23505') {
                return res.json({ message: 'Already referred', referrerId: referrer.id });
            }
            console.error('[REFERRAL] Insert error:', logError);
            return res.status(500).json({ error: 'Database insert failed', details: logError.message });
        }

        await supabase.from('profiles').update({ referred_by: referrer.id }).eq('id', userId);

        return res.json({
            success: true,
            referrerId: referrer.id,
            logId: newLog.id,
            created_at: newLog.created_at
        });

    } catch (err) {
        console.error('[REFERRAL] Crash:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

router.post('/referrals/track', handleTrackReferral);
router.post('/referrals/claim', handleTrackReferral);

router.get('/referrals/history', async (req, res) => {
    try {
        const { userId } = await getAuthenticatedUser(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // RLS-COMPLIANCE: Use user's token if available
        let supabaseClient = supabase;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

            if (supabaseUrl && supabaseAnonKey) {
                // Pass token in headers for RLS
                supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
                    global: { headers: { Authorization: `Bearer ${token}` } }
                });
            }
        }

        const { data: logs, error } = await supabaseClient
            .from('referral_logs')
            .select('id, referred_user_id, status, created_at, profiles:referred_user_id(display_name)')
            .eq('referrer_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[REFERRAL] History error:', error);
            // Return empty array on error to prevent 500 in frontend if RLS fails weirdly?
            // No, user wants debugging. Return 500.
            return res.status(500).json({ error: 'History fetch failed', details: error.message });
        }

        const history = logs?.map(log => ({
            ...log,
            referred_email: log.profiles?.display_name || 'User ' + log.referred_user_id.substring(0, 6)
        })) || [];

        return res.json({ history });
    } catch (err) {
        console.error('[REFERRAL] History crash:', err);
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
