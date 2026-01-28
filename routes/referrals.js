import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../services/supabase.js';
import { getAuthenticatedUser } from '../middleware/auth.js';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Static flag for one-time use constraint
let seedUsed = false;

function generateReferralCode() {
    return 'REF-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// TEMP: Admin only seed endpoint
router.post('/referrals/seed-test', async (req, res) => {
    try {
        const seedKey = req.headers['x-seed-key'];
        // SECURITY: Only read from Environment Variable. No fallback.
        const envSeedKey = process.env.SEED_KEY;

        if (!envSeedKey || seedKey !== envSeedKey) {
            console.warn('[SEED] Unauthorized attempt - Missing or Invalid Key');
            return res.status(403).json({ error: 'Forbidden' });
        }

        if (seedUsed) {
            return res.status(410).json({ error: 'Seed already used' });
        }

        // Disable immediately
        seedUsed = true;

        const ts = Date.now();
        const referrerEmail = `seed_owner_${ts}@test.com`;
        const password = 'Password123!';

        // 1. Create Referrer (Confirmed)
        const { data: referrerUser, error: refError } = await supabase.auth.admin.createUser({
            email: referrerEmail,
            password: password,
            email_confirm: true,
            user_metadata: { display_name: 'Seed Referrer' }
        });

        if (refError || !referrerUser.user) {
            seedUsed = false; // Re-enable on failure
            return res.status(500).json({ error: 'Failed to create referrer', details: refError });
        }

        const referrerId = referrerUser.user.id;

        // Generate Code for Referrer
        const referralCode = generateReferralCode();
        await supabase.from('profiles').update({ referral_code: referralCode }).eq('id', referrerId);

        // 2. Create 3 Referees and Logs
        const referees = [];
        const logs = [];

        for (let i = 1; i <= 3; i++) {
            const refereeEmail = `seed_referee_${i}_${ts}@test.com`;
            const { data: refereeUser, error: refereeError } = await supabase.auth.admin.createUser({
                email: refereeEmail,
                password: password,
                email_confirm: true,
                user_metadata: { display_name: `Seed Referee ${i}` }
            });

            if (refereeError || !refereeUser.user) continue;

            referees.push({ email: refereeEmail, password });

            // Create Log
            const { data: log, error: logError } = await supabase.from('referral_logs').insert({
                referrer_id: referrerId,
                referrer_user_id: referrerId,
                referred_user_id: refereeUser.user.id,
                referral_code: referralCode,
                status: 'converted', // Completed/Qualified
                created_at: new Date().toISOString()
            }).select().single();

            if (log) logs.push(log);

            // Link Profile
            await supabase.from('profiles').update({ referred_by: referrerId }).eq('id', refereeUser.user.id);
        }

        // Update Credits
        await supabase.from('profiles').update({ credits: logs.length }).eq('id', referrerId);

        return res.json({
            success: true,
            referrer: { email: referrerEmail, password, referral_code: referralCode },
            referees: referees,
            logs_created: logs.length
        });

    } catch (err) {
        console.error('[SEED] Error:', err);
        seedUsed = false; // Re-enable on crash
        res.status(500).json({ error: 'Internal server error' });
    }
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

        const { data: referrer, error: referrerError } = await supabase.from('profiles').select('id, referral_code').eq('referral_code', referralCode).single();

        if (referrerError || !referrer) {
            console.warn(`[REFERRAL] Invalid code: ${referralCode}`);
            return res.status(404).json({ error: 'Invalid referral code' });
        }

        if (referrer.id === userId) {
            return res.status(400).json({ error: 'Cannot refer yourself' });
        }

        const { data: newLog, error: logError } = await supabase.from('referral_logs').insert({
            referrer_id: referrer.id,
            referrer_user_id: referrer.id,
            referred_user_id: userId,
            referral_code: referralCode,
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

        let supabaseClient = supabase;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

            if (supabaseUrl && supabaseAnonKey) {
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
