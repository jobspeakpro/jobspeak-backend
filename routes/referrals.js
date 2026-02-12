
import express from 'express';
import { supabase } from '../services/supabase.js';
import { getAuthenticatedUser } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

function generateReferralCode() {
    return 'REF-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// RESTORED: Exported function for use in other modules (mockInterview.js)
export async function processReferralAction(userId) {
    try {
        console.log(`[REFERRAL] Processing action for ${userId}`);
        // Logic to convert pending referral to completed
        // 1. Check for pending log
        const { data: log } = await supabase.from('referral_logs')
            .select('*')
            .eq('referred_user_id', userId)
            .eq('status', 'pending')
            .single();

        if (log) {
            // 2. Award credit to referrer
            const { data: referrer } = await supabase.from('profiles').select('credits').eq('id', log.referrer_id).single();
            if (referrer) {
                await supabase.from('profiles').update({ credits: (referrer.credits || 0) + 1 }).eq('id', log.referrer_id);
            }
            // 3. Mark log converted
            await supabase.from('referral_logs').update({ status: 'converted' }).eq('id', log.id);
            console.log(`[REFERRAL] Converted referral ${log.id}`);
        }
    } catch (err) {
        console.error('[REFERRAL] Process error:', err);
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

        const { data: referrer, error: referrerError } = await supabase.from('profiles').select('id').eq('referral_code', referralCode).single();

        if (referrerError || !referrer) {
            console.warn(`[REFERRAL] Invalid code: ${referralCode}`);
            return res.status(404).json({ error: 'Invalid referral code' });
        }

        if (referrer.id === userId) {
            return res.status(400).json({ error: 'Cannot refer yourself' });
        }

        const { data: newLog, error: logError } = await supabase.from('referral_logs').insert({
            referrer_id: referrer.id, // Primary referrer link
            referrer_user_id: referrer.id, // Required legacy column
            referred_user_id: userId,
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

        // Use admin client (bypasses RLS) — we already authenticated the user above
        const { data: logs, error } = await supabase
            .from('referral_logs')
            .select('id, referred_user_id, status, created_at')
            .eq('referrer_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[REFERRAL] History error:', error);
            return res.status(500).json({ error: 'History fetch failed', details: error.message });
        }

        const history = (logs || []).map(log => ({
            ...log,
            referred_email: 'User ' + (log.referred_user_id || '').substring(0, 6)
        }));

        return res.json({ history });
    } catch (err) {
        console.error('[REFERRAL] History crash:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/referrals/stats', async (req, res) => {
    try {
        const { userId } = await getAuthenticatedUser(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Get credits from profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single();

        // Count total referrals
        const { count } = await supabase
            .from('referral_logs')
            .select('id', { count: 'exact', head: true })
            .eq('referrer_id', userId);

        return res.json({
            credits: profile?.credits || 0,
            total_referred: count || 0
        });
    } catch (err) {
        console.error('[REFERRAL] Stats error:', err);
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

// ============================================
// ADMIN DASHBOARD ENDPOINTS
// ============================================

// Helper: check if user is admin
async function isAdmin(req) {
    const { userId } = await getAuthenticatedUser(req);
    if (!userId) return false;

    // Look up user email
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

    if (!profile) return false;

    // Check against admin emails (from env var or Supabase auth)
    const adminEmails = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase());

    // Also check Supabase auth for the user's email
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
    );
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (!user) return false;
    return adminEmails.includes(user.email.toLowerCase());
}

router.get('/admin/dashboard', async (req, res) => {
    try {
        if (!await isAdmin(req)) {
            return res.status(403).json({ error: 'Unauthorized — admin only' });
        }

        // 1. All referral logs with referrer info
        const { data: referralLogs } = await supabase
            .from('referral_logs')
            .select('*')
            .order('created_at', { ascending: false });

        // 2. All affiliate applications
        const { data: affiliateApps } = await supabase
            .from('affiliate_applications')
            .select('*')
            .order('created_at', { ascending: false });

        // 3. Get profiles for referrer names/emails
        const referrerIds = [...new Set((referralLogs || []).map(l => l.referrer_id).filter(Boolean))];
        const referredIds = [...new Set((referralLogs || []).map(l => l.referred_user_id).filter(Boolean))];
        const allUserIds = [...new Set([...referrerIds, ...referredIds])];

        let profilesMap = {};
        if (allUserIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, display_name, referral_code, credits')
                .in('id', allUserIds);

            (profiles || []).forEach(p => { profilesMap[p.id] = p; });
        }

        // 4. Get auth emails for all users
        let emailsMap = {};
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseAdmin = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
            );

            for (const uid of allUserIds) {
                try {
                    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(uid);
                    if (user) emailsMap[uid] = user.email;
                } catch (e) { /* skip */ }
            }
        } catch (e) {
            console.warn('[ADMIN] Could not fetch user emails:', e.message);
        }

        // 5. Build enriched referral logs
        const enrichedLogs = (referralLogs || []).map(log => ({
            ...log,
            referrer_name: profilesMap[log.referrer_id]?.display_name || null,
            referrer_email: emailsMap[log.referrer_id] || null,
            referrer_code: profilesMap[log.referrer_id]?.referral_code || null,
            referred_name: profilesMap[log.referred_user_id]?.display_name || null,
            referred_email: emailsMap[log.referred_user_id] || null
        }));

        // 6. Build payout summary per referrer
        const payoutSummary = {};
        (referralLogs || []).forEach(log => {
            const rid = log.referrer_id;
            if (!rid) return;
            if (!payoutSummary[rid]) {
                payoutSummary[rid] = {
                    referrer_id: rid,
                    referrer_name: profilesMap[rid]?.display_name || null,
                    referrer_email: emailsMap[rid] || null,
                    referral_code: profilesMap[rid]?.referral_code || null,
                    credits: profilesMap[rid]?.credits || 0,
                    total_referrals: 0,
                    converted: 0,
                    pending: 0
                };
            }
            payoutSummary[rid].total_referrals++;
            if (log.status === 'converted') payoutSummary[rid].converted++;
            else payoutSummary[rid].pending++;
        });

        return res.json({
            referralLogs: enrichedLogs,
            affiliateApplications: affiliateApps || [],
            payoutSummary: Object.values(payoutSummary),
            totals: {
                totalReferrals: (referralLogs || []).length,
                totalAffiliateApps: (affiliateApps || []).length,
                totalConverted: (referralLogs || []).filter(l => l.status === 'converted').length,
                totalPending: (referralLogs || []).filter(l => l.status === 'pending').length
            }
        });

    } catch (err) {
        console.error('[ADMIN] Dashboard error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
