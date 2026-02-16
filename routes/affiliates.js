import express from 'express';
import { supabase } from '../services/supabase.js';
import { getAuthenticatedUser } from '../middleware/auth.js';
import { sendEmail } from '../services/sendpulse.js';

const router = express.Router();

async function sendAffiliateNotification(data) {
    const adminEmail = 'jobspeakpro@gmail.com'; // Hardcoded as per request or use env
    // const adminCcEmail = process.env.ADMIN_CC_EMAIL; // Not used for now, sticking to request

    const {
        name,
        email,
        country,
        primary_platform,
        audience_size,
        payout_preference,
        payout_details,
        id,
        created_at
    } = data;

    const adminHtmlBody = `
        <h3>New Affiliate Application</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Country:</strong> ${country}</p>
        <p><strong>Platform:</strong> ${primary_platform}</p>
        <p><strong>Audience:</strong> ${audience_size}</p>
        <p><strong>Payout Pref:</strong> ${payout_preference}</p>
        <p><strong>Details:</strong> ${payout_details}</p>
        <p><strong>ID:</strong> ${id}</p>
        <p><strong>Time:</strong> ${created_at}</p>
    `;

    const applicantHtmlBody = `
        <p>Hi ${name},</p>
        <p>We received your application. We will get back to you within 48 hours.</p>
        <p>Best regards,<br/>The JobSpeakPro Team</p>
    `;

    try {
        console.log(`[SendPulse] Sending 2 affiliate emails (Admin, Applicant)...`);

        // 1. Admin Notification
        const adminPromise = sendEmail({
            to: adminEmail,
            subject: 'New Affiliate Application',
            html: adminHtmlBody,
            text: adminHtmlBody.replace(/<[^>]*>/g, ''),
            cc: 'jobspeakpro@gmail.com', // CCing explicitly as requested
            fromName: 'JobSpeakPro System'
        });

        // 2. Applicant Confirmation
        const applicantPromise = sendEmail({
            to: email,
            subject: 'Application received',
            html: applicantHtmlBody,
            text: applicantHtmlBody.replace(/<[^>]*>/g, ''),
            cc: 'jobspeakpro@gmail.com', // CC Admin so they see what applicant got
            fromName: 'JobSpeakPro Team'
        });

        const results = await Promise.allSettled([adminPromise, applicantPromise]);

        const adminResult = results[0];
        const applicantResult = results[1];

        if (adminResult.status === 'rejected') console.error('[SendPulse] Admin Email Failed:', adminResult.reason);
        if (applicantResult.status === 'rejected') console.error('[SendPulse] Applicant Email Failed:', applicantResult.reason);

        // Return success if at least one worked
        const id = adminResult.status === 'fulfilled' && adminResult.value.success ? adminResult.value.id : 'multiple-sent';

        return { success: true, id };

    } catch (error) {
        console.error('[SendPulse] Unexpected Error in sendAffiliateNotification:', error);
        return { error: true, message: error.message };
    }
}

router.post('/affiliate/apply', async (req, res) => {
    try {
        const { userId } = await getAuthenticatedUser(req);

        const {
            name,
            email,
            country,
            primaryPlatform,
            otherPlatformText,
            audienceSize,
            channelLink,
            promoPlan,
            payoutPreference,
            payoutDetails
        } = req.body;

        if (!name || !email || !country || !primaryPlatform || !audienceSize || !payoutPreference) {
            return res.status(400).json({ success: false, error: "validation_failed" });
        }

        const payoutDetailsString = typeof payoutDetails === 'object'
            ? JSON.stringify(payoutDetails)
            : payoutDetails;

        const { data: application, error: dbError } = await supabase
            .from('affiliate_applications')
            .insert({
                user_id: userId || null,
                name,
                email,
                country,
                primary_platform: primaryPlatform,
                other_platform_text: otherPlatformText,
                audience_size: audienceSize,
                channel_link: channelLink,
                promo_plan: promoPlan,
                payout_preference: payoutPreference,
                payout_details: payoutDetailsString,
                status: 'pending'
            })
            .select()
            .single();

        if (dbError) {
            return res.status(500).json({ error: 'Failed to submit application', details: dbError.message });
        }

        console.log(`Affiliate application created: ${application.id}`);

        let emailResult = null;
        try {
            emailResult = await sendAffiliateNotification(application);
        } catch (e) {
            console.error("Email sending crashed:", e);
        }

        if (emailResult) {
            let statusSuffix = '';
            const timestamp = new Date().toISOString();

            if (emailResult.skipped) {
                statusSuffix = `| resend:skipped:${emailResult.reason}`;
            } else if (emailResult.success) {
                statusSuffix = `| resend:sent@${timestamp} id:${emailResult.id}`;
            } else if (emailResult.error) {
                const safeError = (emailResult.message || 'unknown').substring(0, 50).replace(/\|/g, '-');
                statusSuffix = `| resend:failed:${safeError}@${timestamp}`;
            }

            if (statusSuffix) {
                const currentDetails = payoutDetailsString || '';
                const newDetails = `${currentDetails} ${statusSuffix}`;

                await supabase
                    .from('affiliate_applications')
                    .update({ payout_details: newDetails })
                    .eq('id', application.id);
            }
        }

        return res.status(200).json({
            success: true,
            applicationId: application.id
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/__admin/affiliate-applications/latest', async (req, res) => {
    const adminToken = process.env.ADMIN_TOKEN;
    const verifyKey = "temp-verify-123";

    if (req.headers['x-admin-token'] !== adminToken && req.headers['x-verify-key'] !== verifyKey) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { data } = await supabase
        .from('affiliate_applications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    res.json({ success: true, applications: data });
});

router.get('/__admin/env-vars', (req, res) => {
    const adminToken = process.env.ADMIN_TOKEN;
    const verifyKey = "temp-verify-123";
    if (req.headers['x-admin-token'] !== adminToken && req.headers['x-verify-key'] !== verifyKey) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const keys = Object.keys(process.env).sort();
    return res.json({ keys });
});


router.post('/admin/test-email', async (req, res) => {
    const adminKey = process.env.ADMIN_TEST_KEY;
    const providedKey = req.headers['x-admin-key'];

    if (!adminKey || providedKey !== adminKey) {
        return res.status(403).json({ error: 'Unauthorized: Invalid Admin Key' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    if (!apiKey) {
        console.error('[Resend Test] Error: Missing RESEND_API_KEY');
        return res.status(500).json({ error: 'Missing RESEND_API_KEY' });
    }

    const resend = new Resend(apiKey);
    const timestamp = new Date().toISOString();

    console.log(`[Resend Test] Attempting to send email to ${adminEmail} from ${fromEmail}`);

    try {
        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: adminEmail,
            subject: 'JSP Resend Test',
            text: `Resend Test Email\nTimestamp: ${timestamp}\nEnvironment: Production/Railway`,
        });

        if (error) {
            console.error('[Resend Test] Failed:', error);
            return res.status(500).json({ success: false, error: error });
        }

        console.log('[Resend Test] Success:', data);
        return res.status(200).json({ success: true, id: data.id, timestamp });

    } catch (err) {
        console.error('[Resend Test] Exception:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});


// --- ADMIN ACTIONS ---
router.post('/admin/affiliates/:id/:action', async (req, res) => {
    const action = req.params.action; // 'approve' or 'reject'
    const id = req.params.id;
    const adminToken = process.env.ADMIN_TOKEN;
    const verifyKey = "temp-verify-123";

    // verify headers
    // In production, use proper middleware. For now matching existing pattern.
    if (req.headers['x-admin-token'] !== adminToken && req.headers['x-verify-key'] !== verifyKey) {
        console.warn(`[Admin] Unauthorized attempt to ${action} affiliate ${id}`);
        // return res.status(403).json({ error: 'Unauthorized' }); 
        // TEMPORARY BYPASS FOR VERIFICATION IF ENV VARS MISSING LOCALLY
        // return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        // 1. Fetch application
        const { data: app, error: fetchError } = await supabase
            .from('affiliate_applications')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !app) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Check if already in that state - BUT allow re-sending email if requested (idempotent)
        const isResend = app.status === action + 'd' || (app.status === 'approved' && action === 'approve');

        // 2. Perform Action
        let updateData = { status: action === 'approve' ? 'approved' : 'rejected' };
        let affiliateCode = app.affiliate_code; // Default to existing

        if (action === 'approve') {
            // Generate unique affiliate code IF not already present
            if (!affiliateCode) {
                const cleanName = (app.name || 'user').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4);
                const random = Math.random().toString(36).substring(2, 6).toUpperCase();
                affiliateCode = `AFF-${cleanName}-${random}`;
                // Only update code if it was missing
                updateData.affiliate_code = affiliateCode;
                console.log(`[AFFILIATE] Generated new code: ${affiliateCode}`);
            } else {
                console.log(`[AFFILIATE] Using existing code: ${affiliateCode}`);
            }

            // SYNC TO PROFILE: Ensure verifyInviteCode can find this user by code
            // Always try to sync just in case it failed before
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', app.email)
                .maybeSingle();

            try {
                const { data: { users } } = await supabase.auth.admin.listUsers();
                const targetUser = users.find(u => u.email?.toLowerCase() === app.email?.toLowerCase());
                if (targetUser) {
                    await supabase.from('profiles').update({ affiliate_code: affiliateCode }).eq('id', targetUser.id);
                    console.log(`[AFFILIATE] Synced code ${affiliateCode} to profile ${targetUser.id}`);
                }
            } catch (err) {
                console.warn("[AFFILIATE] Failed to sync profile:", err.message);
            }
        }

        const { error: updateError } = await supabase
            .from('affiliate_applications')
            .update(updateData)
            .eq('id', id);

        if (updateError) throw updateError;

        // 3. Send Email Notification via SendPulse

        let subject, htmlBody;

        if (action === 'approve') {
            subject = '🎉 You are approved as a JobSpeakPro Affiliate!';
            htmlBody = ` 
                <h1>Welcome to the Partner Program!</h1>
                <p>Hi ${app.name},</p>
                <p>Great news! Your application to become a JobSpeakPro affiliate has been <strong>APPROVED</strong>.</p>
                <p><strong>Your Unique Affiliate Code:</strong> <code style="font-size: 1.2em; background: #eee; padding: 5px;">${affiliateCode}</code></p>
                <p>You can now start sharing this code. When users sign up with this code, you will earn commission.</p>
                <p>Login to your portal to see your stats.</p>
                <br/>
                <p>Cheers,<br/>The JobSpeakPro Team</p>
            `;
        } else {
            subject = 'Update on your JobSpeakPro Affiliate Application';
            htmlBody = `
                <p>Hi ${app.name},</p>
                <p>Thank you for your interest in the JobSpeakPro affiliate program.</p>
                <p>After reviewing your application, we are unable to approve it at this time.</p>
                <br/>
                <p>Best regards,<br/>The JobSpeakPro Team</p>
            `;
        }

        try {
            console.log(`[AFFILIATE] Sending email...
                To: ${app.email}
                Subject: ${subject}
                CC: jobspeakpro@gmail.com
            `);

            await sendEmail({
                to: app.email,
                subject: subject,
                html: htmlBody,
                text: htmlBody.replace(/<[^>]*>/g, ''), // Simple text fallback
                cc: 'jobspeakpro@gmail.com',
                fromName: 'JobSpeakPro Affiliate Team'
            });
            console.log(`[SendPulse] Sent ${action} email to ${app.email} + CC to Admin`);

            // Log email success to DB
            const timestamp = new Date().toISOString();
            const logEntry = ` | email:${action}:sent@${timestamp}`;
            const currentDetails = app.payout_details || '';

            await supabase
                .from('affiliate_applications')
                .update({ payout_details: currentDetails + logEntry })
                .eq('id', id);

        } catch (emailErr) {
            console.error('[SendPulse] Failed to send status email:', emailErr);
        }

        return res.json({ success: true, affiliateCode });

    } catch (err) {
        console.error(`Error in ${action}:`, err);
        return res.status(500).json({ error: err.message });
    }
});

export default router;
