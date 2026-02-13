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

import { sendEmail } from '../services/sendpulse.js';

// POST /api/support/contact
router.post('/support/contact', async (req, res) => {
    try {
        const { email, message, subject, name } = req.body;

        if (!email || !message) {
            return res.status(400).json({ error: 'Email and message are required' });
        }

        const htmlContent = `
            <h3>New Support Request</h3>
            <p><strong>From:</strong> ${name || 'User'} (${email})</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
        `;

        const textContent = `
New Support Request
From: ${name || 'User'} (${email})
Message:
${message}
        `;

        const result = await sendEmail({
            to: process.env.ADMIN_EMAIL || 'jobspeakpro@gmail.com',
            subject: `Support Request: ${subject || 'General Inquiry'}`,
            html: htmlContent,
            text: textContent,
            fromName: 'JobSpeakPro Contact',
            fromEmail: 'jobspeakpro@gmail.com' // SendPulse requires verified sender
        });

        if (result.success) {
            return res.json({ success: true, message: 'Message sent via SendPulse' });
        } else {
            console.error('[SUPPORT] SendPulse Failed:', result.error);
            // Fallback? No, just fail for now or mock.
            return res.status(500).json({ error: 'Failed to send message via SendPulse' });
        }

    } catch (err) {
        console.error('[SUPPORT] Error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

export default router;
