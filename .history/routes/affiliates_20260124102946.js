import express from 'express';
import { supabase } from '../services/supabase.js';
import { getAuthenticatedUser } from '../middleware/auth.js';
import { Resend } from 'resend';

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/affiliate/apply
router.post('/affiliate/apply', async (req, res) => {
    try {
        // Auth optional - guests can apply
        // But if they have a token, we link it
        const { userId } = await getAuthenticatedUser(req);

        const { name, email, country, platform, audienceSize, channelLink, promoPlan } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        // 1. Store application
        const { data: application, error: dbError } = await supabase
            .from('affiliate_applications')
            .insert({
                user_id: userId || null,
                name,
                email,
                country,
                platform,
                audience_size: audienceSize,
                channel_link: channelLink,
                promo_plan: promoPlan,
                status: 'pending'
            })
            .select()
            .single();

        if (dbError) {
            console.error('[AFFILIATE] DB Error:', dbError);
            return res.status(500).json({ error: 'Failed to submit application' });
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
                        <p><strong>Platform:</strong> ${platform}</p>
                        <p><strong>Audience:</strong> ${audienceSize}</p>
                        <p><strong>Link:</strong> ${channelLink}</p>
                        <p><strong>Plan:</strong> ${promoPlan}</p>
                    `
                });
            } else {
                console.warn('[AFFILIATE] Skipped email - RESEND_API_KEY missing');
            }
        } catch (emailError) {
            console.error('[AFFILIATE] Email Failed:', emailError);
            // Don't fail the request if email fails, just log it
        }

        return res.json({ success: true, id: application.id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
