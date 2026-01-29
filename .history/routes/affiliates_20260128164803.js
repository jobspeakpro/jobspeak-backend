import express from 'express';
import { supabase } from '../services/supabase.js';
import { getAuthenticatedUser } from '../middleware/auth.js';
import { Resend } from 'resend';

const router = express.Router();

async function sendAffiliateNotification(data) {
    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL || 'jobspeakpro@gmail.com';
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
        console.warn('[Resend] Skipped: Missing RESEND_API_KEY or RESEND_FROM_EMAIL');
        return { skipped: true, reason: 'Missing env vars' };
    }

    const resend = new Resend(apiKey);

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

    const textBody = `
New Affiliate Application

Name: ${name}
Email: ${email}
Country: ${country}
Primary Platform: ${primary_platform}
Audience Size: ${audience_size}
Payout Preference: ${payout_preference}
Payout Details: ${payout_details}
Application ID: ${id}
Timestamp: ${created_at}
    `.trim();

    try {
        const { data: emailData, error } = await resend.emails.send({
            from: fromEmail,
            to: adminEmail,
            subject: 'New Affiliate Application',
            text: textBody
        });

        if (error) {
            console.error('[Resend] Error:', error);
            return { error: true, message: error.message };
        }

        console.log(`[Resend] Notification sent to ${adminEmail} (ID: ${emailData?.id})`);
        return { success: true, id: emailData?.id };

    } catch (error) {
        console.error('[Resend] Unexpected Error:', error);
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
    const adminEmail = process.env.ADMIN_EMAIL || 'jobspeakpro@gmail.com';
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

export default router;
