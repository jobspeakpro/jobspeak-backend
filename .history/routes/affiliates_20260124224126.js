import express from 'express';
import { supabase } from '../services/supabase.js';
import { getAuthenticatedUser } from '../middleware/auth.js';
import { Resend } from 'resend';

const router = express.Router();

let resend;
if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
} else {
    // Mock for development/safe startup
    console.warn("[AFFILIATE] RESEND_API_KEY missing, emails will be mocked");
    resend = { emails: { send: async () => console.log("[MOCK EMAIL] Sent") } };
}

// POST /api/affiliate/apply
router.post('/affiliate/apply', async (req, res) => {
    try {
        // Auth optional - guests can apply
        // But if they have a token, we link it
        const { userId } = await getAuthenticatedUser(req);

        // FE Payload: country, primaryPlatform, audienceSize, payoutPreference, payoutDetails (email/wallet), name, email
        const {
            name, email,
            country, primaryPlatform, otherPlatformText,
            audienceSize, channelLink, promoPlan,
            payoutPreference, payoutDetails
        } = req.body;

        // Validation
        const errors = {};
        if (!name) errors.name = "Required";
        if (!email) errors.email = "Required";
        if (!country) errors.country = "Required";
        if (!primaryPlatform) errors.primaryPlatform = "Required";
        if (!audienceSize) errors.audienceSize = "Required";
        if (!payoutPreference) errors.payoutPreference = "Required";

        // Payout details validation based on preference
        if (payoutPreference === 'paypal' && (!payoutDetails || !payoutDetails.includes('@'))) {
            errors.payoutDetails = "Valid PayPal email required";
        }
        if (payoutPreference === 'stripe' && (!payoutDetails || !payoutDetails.includes('@'))) {
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

        // 1. Store application
        const { data: application, error: dbError } = await supabase
            .from('affiliate_applications')
            .insert({
                user_id: userId || null,
                name,
                email,
                country,
                platform: primaryPlatform, // Map primaryPlatform to existing 'platform' col if intended, or use new col
                primary_platform: primaryPlatform,
                other_platform_text: otherPlatformText,
                audience_size: audienceSize,
                channel_link: channelLink,
                promo_plan: promoPlan,
                payout_preference: payoutPreference,
                payout_details: typeof payoutDetails === 'object' ? JSON.stringify(payoutDetails) : payoutDetails,
                status: 'pending'
            })
            .select()
            .single();

        if (dbError) {
            console.error('[AFFILIATE] DB Error:', JSON.stringify(dbError, null, 2));
            return res.status(500).json({ error: 'Failed to submit application', details: dbError.message });
        }

        // 2. Send Confirmation Email to Applicant
        try {
            if (process.env.RESEND_API_KEY) {
                await resend.emails.send({
                    from: 'JobSpeakPro <support@jobspeakpro.com>', // Verify domain!
                    to: email, // Applicant
                    subject: 'Affiliate Application Received - JobSpeakPro',
                    html: `
                        <h2>Thanks for applying, ${name}!</h2>
                        <p>We've received your affiliate application and our team will review it shortly.</p>
                        <p>We'll get back to you within 2-3 business days.</p>
                        <br/>
                        <p>Best,</p>
                        <p>The JobSpeakPro Team</p>
                    `
                });

                // 3. Send Notification to Admin
                await resend.emails.send({
                    from: 'JobSpeakPro System <system@jobspeakpro.com>',
                    to: 'jobspeakpro@gmail.com',
                    subject: `New Affiliate Application: ${name}`,
                    html: `
                        <h3>New Affiliate Application</h3>
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
