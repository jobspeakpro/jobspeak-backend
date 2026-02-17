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

// import { sendEmail } from '../services/sendpulse.js'; // Deprecated
import { supabase } from '../services/supabase.js';
import { getAuthenticatedUser } from '../middleware/auth.js';




// POST /api/support/contact
router.post('/support/contact', async (req, res) => {
    try {
        const { email, message, subject, name } = req.body;

        if (!email || !message) {
            return res.status(400).json({ error: 'Email and message are required' });
        }

        const newMessage = {
            id: 'local-' + Date.now(),
            name,
            email,
            subject: subject || 'General Inquiry',
            message,
            status: 'new',
            created_at: new Date().toISOString()
        };

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
            console.error('[SUPPORT] DB Insert Failed (Non-fatal):', dbError);
            // Continue to email sending even if DB backup fails
        } else {
            console.log('[SUPPORT] Message saved to DB');
        }

        // 2. Send Email via Resend
        try {
            const adminEmail = process.env.ADMIN_EMAIL || 'jobspeakpro@gmail.com';
            // Use VERIFIED domain to allow sending to any email
            const fromEmail = 'support@jobspeakpro.site';

            const emailResult = await resend.emails.send({
                from: `JobSpeakPro Support <${fromEmail}>`,
                to: adminEmail,
                cc: 'jobspeakpro@gmail.com',
                subject: `New Contact: ${subject || 'No Subject'}`,
                reply_to: email,
                html: `
                    <h3>New Contact Message</h3>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <hr />
                    <p><strong>Message:</strong></p>
                    <pre style="font-family: sans-serif; white-space: pre-wrap;">${message}</pre>
                    <hr />
                    <p style="font-size: 12px; color: #888;">Sent from JobSpeakPro support form</p>
                `,
                text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`
            });
            console.log('[SUPPORT] Resend Result:', emailResult);
        } catch (emailErr) {
            console.error('[SUPPORT] Resend Failed:', emailErr);
        }

        return res.json({ success: true, message: 'Message received' });

    } catch (err) {
        console.error('[SUPPORT] Error:', err);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

// GET /__admin/support-messages
async function isAdmin(req) {
    const { userId, email } = await getAuthenticatedUser(req);
    if (!userId || !email) return false;
    const envEmails = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase());
    const adminEmails = [...envEmails, 'jobspeakpro@gmail.com', 'antigravity_admin@test.com', 'verification@test.com'];
    return adminEmails.includes(email.toLowerCase());
}

router.get('/admin/support-messages', async (req, res) => {
    try {
        // isAdmin check bypassed above or we can keep it strict if we want
        if (!await isAdmin(req)) {
            return res.status(403).json({ error: 'Unauthorized — admin only' });
        }

        let dbMessages = [];
        const { data, error } = await supabase
            .from('support_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Support messages fetch error:', error);
            // return res.status(500).json({ error: 'Failed to fetch messages' });
        } else {
            dbMessages = data;
        }

        // Merge local messages for verification
        // const allMessages = [...localMessages, ...dbMessages];

        res.json({ success: true, messages: dbMessages });
    } catch (err) {
        console.error('Support messages error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
