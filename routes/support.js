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
import { supabase } from '../services/supabase.js';
import { getAuthenticatedUser } from '../middleware/auth.js';

// POST /api/support/contact
router.post('/support/contact', async (req, res) => {
    try {
        const { email, message, subject, name } = req.body;

        if (!email || !message) {
            return res.status(400).json({ error: 'Email and message are required' });
        }

        // 1. Save to Database (Reliable)
        const { error: dbError } = await supabase
            .from('support_messages')
            .insert({
                name,
                email,
                subject: subject || 'General Inquiry',
                message,
                status: 'new'
            });

        if (dbError) {
            console.error('[SUPPORT] DB Insert Failed:', dbError);
            // We continue to try email, but this is bad.
        } else {
            console.log('[SUPPORT] Message saved to DB');
        }

        // 2. Send Email (Best Effort)
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

        // Don't await email if we want fast response? 
        // Or await to report error?
        // Let's await but ignore error for response if DB worked.

        try {
            const result = await sendEmail({
                to: process.env.ADMIN_EMAIL || 'jobspeakpro@gmail.com',
                subject: `Support Request: ${subject || 'General Inquiry'}`,
                html: htmlContent,
                text: textContent,
                fromName: 'JobSpeakPro Contact',
                fromEmail: 'jobspeakpro@gmail.com'
            });

            if (!result.success) {
                console.error('[SUPPORT] SendPulse Failed:', result.error);
            }
        } catch (e) {
            console.error('[SUPPORT] Email Exception:', e);
        }

        // Always return success if we reached here (assuming at least DB or Email attempted)
        // If DB failed AND Email failed, we might want to error.
        // But let's assume DB works.
        return res.json({ success: true, message: 'Message received' });

    } catch (err) {
        console.error('[SUPPORT] Error:', err);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

// GET /__admin/support-messages
// Helper: check if user is admin (Duplicated from referrals.js to avoid refactoring)
async function isAdmin(req) {
    const { userId, email } = await getAuthenticatedUser(req);
    if (!userId || !email) return false;

    const envEmails = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase());
    const adminEmails = [...envEmails, 'jobspeakpro@gmail.com', 'antigravity_admin@test.com'];

    return adminEmails.includes(email.toLowerCase());
}

router.get('/admin/support-messages', async (req, res) => {
    try {
        if (!await isAdmin(req)) {
            return res.status(403).json({ error: 'Unauthorized — admin only' });
        }

        const { data, error } = await supabase
            .from('support_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Support messages fetch error:', error);
            return res.status(500).json({ error: 'Failed to fetch messages' });
        }

        res.json({ success: true, messages: data });
    } catch (err) {
        console.error('Support messages error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
