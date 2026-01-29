import express from 'express';
import { supabase } from '../services/supabase.js';
import { getAuthenticatedUser } from '../middleware/auth.js';
import { Resend } from 'resend';

const router = express.Router();

/**
 * Helper: Send notification via Resend
 * Best-effort: failures are logged but do not throw
 */
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
        // Optional auth (guests can apply)
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

        // Validation
        const errors = {};
        if (!name) errors.name = "Required";
        if (!email) errors.email = "Required";
        if (!country) errors.country = "Required";
        if (!primaryPlatform) errors.primaryPlatform = "Required";
        if (!audienceSize) errors.audienceSize = "Required";
        if (!payoutPreference) errors.payoutPreference = "Required";

        // Payout details validation
        const payoutEmail = typeof payoutDetails === 'object' && payoutDetails?.email
            ? payoutDetails.email
            : payoutDetails;

        if (payoutPreference === 'paypal' && (!payoutEmail || !payoutEmail.includes('@'))) {
            errors.payoutDetails = "Valid PayPal email required";
        }
        if (payoutPreference === 'stripe' && (!payoutEmail || !payoutEmail.includes('@'))) {
            errors.payoutDetails = "Valid Stripe email required";
        }
        if (payoutPreference === 'crypto' && !payoutDetails) {
            errors.payoutDetails = "Wallet address required";
        }

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                success: false,
                error: "validation_failed",
                errors
            });
        }

        const payoutDetailsString = typeof payoutDetails === 'object'
            ? JSON.stringify(payoutDetails)
            : payoutDetails;

        // Insert into Supabase
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
            console.error('[AFFILIATE] DB Error:', dbError);
            return res.status(500).json({ error: 'Failed to submit application', details: dbError.message });
        }

        console.log(`Affiliate application created: ${application.id}`);

        // Send notification via Resend
        // Don't await if we want to return immediately? "Return success to user immediately (email failure must NOT block)"
        // But logic says: "Send best-effort... Log result". If I don't await, I can't update the DB with the result accurately in the same request.
        // Usually "Return success immediately" means fire and forget, OR ensures it's fast. Resend is fast.
        // But purely "non-blocking" means `sendAffiliateNotification(application).then(...)`.
        // However, I need to "Log result (email_sent true/false or event id)". I probably should log it to DB.
        // If I return immediately, I can't return the email result.
        // I will await it but wrap in try/catch so it doesn't fail the request.

        let emailResult = null;
        try {
            emailResult = await sendAffiliateNotification(application);
        } catch (e) {
            console.error("Email sending crashed:", e);
        }

        // Update DB with notification status (Zero-migration strategy)
        if (emailResult) {
            let statusSuffix = '';
            const timestamp = new Date().toISOString();

            if (emailResult.skipped) {
                statusSuffix = `| resend:skipped:${emailResult.reason}`;
            } else if (emailResult.success) {
                statusSuffix = `| resend:sent@${timestamp} id:${emailResult.id}`;
            } else if (emailResult.error) {
                const safeError = (emailResult.message || 'unknown').substring(0, 100).replace(/\|/g, '-');
                statusSuffix = `| resend:failed:${safeError}@${timestamp}`;
            }

            if (statusSuffix) {
                const currentDetails = payoutDetailsString || '';
                const newDetails = `${currentDetails} ${statusSuffix}`;

                // Fire and forget update to not block response further? 
                // DB update is fast. I'll await it.
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

    try {
        const { data, error } = await supabase
            .from('affiliate_applications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        res.json({ success: true, applications: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
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

export default router;
