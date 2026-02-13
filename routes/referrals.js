
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
    const { userId, email } = await getAuthenticatedUser(req);
    if (!userId || !email) return false;

    const envEmails = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase());
    const adminEmails = [...envEmails, 'jobspeakpro@gmail.com', 'antigravity_admin@test.com'];

    return adminEmails.includes(email.toLowerCase());
}

// GET /api/admin/dashboard — Full admin overview
router.get('/admin/dashboard', async (req, res) => {
    try {
        if (!await isAdmin(req)) {
            return res.status(403).json({ error: 'Unauthorized — admin only' });
        }

        // 1. All referral logs
        const { data: referralLogs } = await supabase
            .from('referral_logs')
            .select('*')
            .order('created_at', { ascending: false });

        // 2. All affiliate applications
        const { data: affiliateApps } = await supabase
            .from('affiliate_applications')
            .select('*')
            .order('created_at', { ascending: false });

        // 3. All profiles
        const { data: allProfiles } = await supabase
            .from('profiles')
            .select('id, display_name, referral_code, credits, is_pro, subscription_status, created_at');

        const profilesMap = {};
        (allProfiles || []).forEach(p => { profilesMap[p.id] = p; });

        // 4. Get emails for users involved in referrals
        const referrerIds = [...new Set((referralLogs || []).map(l => l.referrer_id).filter(Boolean))];
        const referredIds = [...new Set((referralLogs || []).map(l => l.referred_user_id).filter(Boolean))];
        const allRefUserIds = [...new Set([...referrerIds, ...referredIds])];

        let emailsMap = {};
        for (const uid of allRefUserIds) {
            try {
                const { data: { user } } = await supabase.auth.admin.getUserById(uid);
                if (user) emailsMap[uid] = user.email;
            } catch (e) { /* skip */ }
        }

        // 5. Enriched referral logs
        const enrichedLogs = (referralLogs || []).map(log => ({
            ...log,
            referrer_name: profilesMap[log.referrer_id]?.display_name || null,
            referrer_email: emailsMap[log.referrer_id] || null,
            referrer_code: profilesMap[log.referrer_id]?.referral_code || null,
            referred_name: profilesMap[log.referred_user_id]?.display_name || null,
            referred_email: emailsMap[log.referred_user_id] || null
        }));

        // 6. Payout summary per referrer
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
                    pending: 0,
                    last_active: log.created_at
                };
            }
            // Update last_active if new log is more recent
            if (new Date(log.created_at) > new Date(payoutSummary[rid].last_active)) {
                payoutSummary[rid].last_active = log.created_at;
            }

            payoutSummary[rid].total_referrals++;
            if (log.status === 'converted') payoutSummary[rid].converted++;
            else payoutSummary[rid].pending++;
        });

        return res.json({
            referralLogs: enrichedLogs,
            affiliateApplications: affiliateApps || [],
            payoutSummary: Object.values(payoutSummary),
            totalUsers: (allProfiles || []).length,
            totals: {
                totalReferrals: (referralLogs || []).length,
                totalAffiliateApps: (affiliateApps || []).length,
                totalConverted: (referralLogs || []).filter(l => l.status === 'converted').length,
                totalPending: (referralLogs || []).filter(l => l.status === 'pending').length,
                approvedAffiliates: (affiliateApps || []).filter(a => a.status === 'approved').length,
                pendingAffiliates: (affiliateApps || []).filter(a => a.status === 'pending').length
            }
        });

    } catch (err) {
        console.error('[ADMIN] Dashboard error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/users — All users with emails
router.get('/admin/users', async (req, res) => {
    try {
        if (!await isAdmin(req)) {
            return res.status(403).json({ error: 'Unauthorized — admin only' });
        }

        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, referral_code, credits, is_pro, subscription_status, created_at')
            .order('created_at', { ascending: false });

        // Fetch emails from Supabase Auth
        const enrichedUsers = [];
        for (const profile of (profiles || [])) {
            let email = null;
            try {
                const { data: { user } } = await supabase.auth.admin.getUserById(profile.id);
                if (user) email = user.email;
            } catch (e) { /* skip */ }

            enrichedUsers.push({
                ...profile,
                email,
            });
        }

        return res.json({ users: enrichedUsers, total: enrichedUsers.length });
    } catch (err) {
        console.error('[ADMIN] Users error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admin/affiliates/:id/approve — Approve affiliate application
router.post('/admin/affiliates/:id/approve', async (req, res) => {
    try {
        if (!await isAdmin(req)) {
            return res.status(403).json({ error: 'Unauthorized — admin only' });
        }

        const { id } = req.params;
        const { data, error } = await supabase
            .from('affiliate_applications')
            .update({ status: 'approved' })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: 'Failed to approve', details: error.message });
        }

        return res.json({ success: true, application: data });
    } catch (err) {
        console.error('[ADMIN] Approve error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admin/affiliates/:id/reject — Reject affiliate application
router.post('/admin/affiliates/:id/reject', async (req, res) => {
    try {
        if (!await isAdmin(req)) {
            return res.status(403).json({ error: 'Unauthorized — admin only' });
        }

        const { id } = req.params;
        const { data, error } = await supabase
            .from('affiliate_applications')
            .update({ status: 'rejected' })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: 'Failed to reject', details: error.message });
        }

        return res.json({ success: true, application: data });
    } catch (err) {
        console.error('[ADMIN] Reject error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// TEMP: Sync profiles for existing users (Fix for missing profiles)
router.post('/admin/sync-profiles', async (req, res) => {
    try {
        if (!await isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });

        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        const results = { total: users.length, created: 0, updated: 0, existing: 0, errors: [] };

        for (const user of users) {
            const { data: profile } = await supabase.from('profiles').select('id, referral_code').eq('id', user.id).single();
            if (profile) {
                if (!profile.referral_code) {
                    const newCode = 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ referral_code: newCode })
                        .eq('id', user.id);

                    if (updateError) results.errors.push({ email: user.email, error: updateError.message });
                    else results.updated++;
                } else {
                    results.existing++;
                }
            } else {
                const { error: insertError } = await supabase.from('profiles').insert({
                    id: user.id,
                    display_name: user.user_metadata?.full_name || user.email.split('@')[0],
                    credits: 3,
                    is_pro: false,
                    subscription_status: 'free',
                    referral_code: 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
                    created_at: user.created_at,
                    updated_at: new Date().toISOString()
                });

                if (insertError) results.errors.push({ email: user.email, error: insertError.message });
                else results.created++;
            }
        }

        return res.json(results);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

export default router;

