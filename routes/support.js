import express from 'express';
import { Resend } from 'resend';

const router = express.Router();
let resend;
if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
} else {
    console.warn("[SUPPORT] RESEND_API_KEY missing, emails will be mocked");
    resend = { emails: { send: async () => console.log("[MOCK EMAIL] Sent") } };
}

// POST /api/support/contact
router.post('/support/contact', async (req, res) => {
    try {
        const { email, message, subject, name } = req.body;

        if (!email || !message) {
            return res.status(400).json({ error: 'Email and message are required' });
        }

        if (process.env.RESEND_API_KEY) {
            // Forward to support
            await resend.emails.send({
                from: 'JobSpeakPro Contact <contact@jobspeakpro.com>',
                to: 'jobspeakpro@gmail.com',
                reply_to: email, // Allow replying directly to user
                subject: `Support Request: ${subject || 'General Inquiry'}`,
                html: `
                    <h3>New Support Request</h3>
                    <p><strong>From:</strong> ${name || 'User'} (${email})</p>
                    <p><strong>Message:</strong></p>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                `
            });
            return res.json({ success: true, message: 'Message sent' });
        } else {
            console.warn('[SUPPORT] Resend API Key missing - mocking success');
            return res.json({ success: true, message: 'Message logged (mock)' });
        }

    } catch (err) {
        console.error('[SUPPORT] Error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

export default router;
