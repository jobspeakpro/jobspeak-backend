import express from 'express';
import { supabase } from '../services/supabase.js'; // Keep original supabase import for now, but the new code redefines it.
import { getAuthenticatedUser } from '../middleware/auth.js';
// import { Resend } from 'resend'; // Dynamic

const router = express.Router();

/**
 * Helper: Send notification via MailerSend
 * Best-effort: failures are logged but do not throw
 */
async function sendAffiliateNotification(data) {
    const apiKey = process.env.MAILERSEND_API_KEY;
    const notifyEmail = process.env.AFFILIATE_NOTIFY_EMAIL;
    const fromEmail = process.env.MAILERSEND_FROM_EMAIL || 'system@jobspeakpro.com';

    if (!apiKey || !notifyEmail) {
        console.warn('[MailerSend] Skipped: Missing MAILERSEND_API_KEY or AFFILIATE_NOTIFY_EMAIL');
        return { skipped: true, reason: 'Missing env vars' };
    }

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
        const response = await fetch('https://api.mailersend.com/v1/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                from: { email: fromEmail },
                to: [{ email: notifyEmail }],
                subject: 'New Affiliate Application',
                text: textBody
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[MailerSend] Error ${response.status}: ${errText}`);
            return { error: true, status: response.status, message: errText };
        } else {
            const successData = await response.text(); // 202 Accepted usually has empty body or id
            console.log(`[MailerSend] Notification sent to ${notifyEmail} (Status: ${response.status})`);
            return { success: true, status: response.status, data: successData };
        }
    } catch (error) {
        console.error('[MailerSend] Network/Fetch Error:', error.message);
        return { error: true, message: error.message };
    }
}

// The original file had a different supabase initialization.
// Assuming the user intends to use the imported 'supabase' from '../services/supabase.js'
// and not redefine it with createClient here, as that would be a breaking change
// to the existing service pattern.
// If the user intended to replace the supabase import, they should have provided that.
// For now, we'll use the existing 'supabase' object.

router.post('/affiliate/apply', async (req, res) => { // Changed path back to original '/affiliate/apply'
    try {
        // Optional auth (guests can apply)
        const { userId } = await getAuthenticatedUser(req);

        const {
            name,
            email,
            country,
            primaryPlatform,
            otherPlatformText, // Changed from 'otherPlatform' to 'otherPlatformText' to match original
            audienceSize,
            channelLink, // Added from original
            promoPlan, // Added from original
            payoutPreference,
            payoutDetails
        } = req.body;

        // Validation
        const errors = {};
        if (!name) errors.name = "Required"; // Changed message to match original
        if (!email) errors.email = "Required"; // Changed message to match original
        if (!country) errors.country = "Required"; // Changed message to match original
        if (!primaryPlatform) errors.primaryPlatform = "Required"; // Changed message to match original
        if (!audienceSize) errors.audienceSize = "Required"; // Changed message to match original
        if (!payoutPreference) errors.payoutPreference = "Required"; // Changed message to match original

        // Payout details validation based on preference (retained original logic)
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
                errors // FE expects { errors: { field: "msg" } }
            });
        }

        const payoutDetailsString = typeof payoutDetails === 'object'
            ? JSON.stringify(payoutDetails)
            : payoutDetails;

        // Insert into Supabase (retained original column names and structure)
        const { data: application, error: dbError } = await supabase
            .from('affiliate_applications')
            .insert({
                user_id: userId || null,
                name,
                email,
                country,
                primary_platform: primaryPlatform,
                other_platform_text: otherPlatformText, // Changed from 'other_platform' to 'other_platform_text'
                audience_size: audienceSize,
                channel_link: channelLink, // Added from original
                promo_plan: promoPlan, // Added from original
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

        // Send notification via MailerSend (or skip if missing keys)
        const emailResult = await sendAffiliateNotification(application);

        return res.status(200).json({
            success: true,
            applicationId: application.id
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
