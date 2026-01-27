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
                        <p>We'll get back to you within 2-3 business days.</p>
                        <br/>
                        <p>Best,</p>
                        <p>The JobSpeakPro Team</p>
            `
                });

                // 3. Send Notification to Admin
                await emailClient.emails.send({
                    from: 'JobSpeakPro System <system@jobspeakpro.com>',
                    to: 'jobspeakpro@gmail.com',
                    subject: `New Affiliate Application: ${ name } `,
                    html: `
                < h3 > New Affiliate Application</h3 >
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Platform:</strong> ${primaryPlatform} ${otherPlatformText ? `(${otherPlatformText})` : ''}</p>
                        <p><strong>Audience:</strong> ${audienceSize}</p>
                        <p><strong>Payout:</strong> ${payoutPreference} (${payoutDetails})</p>
            `
                });
            } else {
                console.warn('[AFFILIATE] Skipped email - RESEND_API_KEY missing');
            }
        } catch (emailError) {
            console.error('[AFFILIATE] Email Failed:', emailError);
            // Don't fail the request if email fails, just log it
        }

        return res.json({ success: true, ok: true, id: application.id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
