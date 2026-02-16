// SendPulse service using Automation 360 Events API
// Workaround for SMTP restrictions on free/gmail addresses.

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const SENDPULSE_ID = process.env.SENDPULSE_ID;
const SENDPULSE_SECRET = process.env.SENDPULSE_SECRET;
// Event ID for "generic_email" (Created via Browser Subagent)
// Triggers "Transactional Flow" -> Sends "Dynamic_HTML_Template"
const EVENT_ID = '897fde5b794c454ea3c5a7ba8264c309';

let tokenCache = { token: null, expiresAt: 0 };

async function getAccessToken() {
    if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
        return tokenCache.token;
    }

    try {
        console.log('[SendPulse] Requesting new access token...');
        const response = await fetch('https://api.sendpulse.com/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'client_credentials',
                client_id: SENDPULSE_ID,
                client_secret: SENDPULSE_SECRET,
            })
        });

        const data = await response.json();

        if (!response.ok || !data.access_token) {
            throw new Error(data.error_description || 'Auth failed');
        }

        tokenCache = {
            token: data.access_token,
            expiresAt: Date.now() + (data.expires_in * 1000) - 60000, // Buffer 1 min
        };
        console.log('[SendPulse] Token received.');
        return data.access_token;
    } catch (error) {
        console.error('SendPulse Auth Error:', error.message);
        throw new Error('Failed to authenticate with SendPulse');
    }
}

/**
 * Trigger an Automation 360 event to send an email.
 * This bypasses SMTP restrictions for gmail senders.
 */
async function triggerEvent(email, subject, html) {
    const token = await getAccessToken();
    const url = `https://events.sendpulse.com/events/id/${EVENT_ID}`;

    try {
        const payload = {
            email: email,
            subject: subject,
            html: html
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Events API returns 200 { result: true }
        if (response.ok && (data.result === true || data.status === 200)) {
            console.log(`[SendPulse] Event triggered for ${email}`);
            return true;
        } else {
            console.warn(`[SendPulse] Event trigger warning:`, data);
            return false;
        }
    } catch (error) {
        console.error(`[SendPulse] Trigger failed for ${email}:`, error.message);
        throw error;
    }
}

export const sendEmail = async ({ to, subject, html, text, cc }) => {
    console.log(`[SendPulse] Preparing to send email to ${to} (CC: ${cc || 'none'})...`);

    if (!SENDPULSE_ID || !SENDPULSE_SECRET) {
        console.error("[SendPulse] Missing credentials.");
        throw new Error("Missing SendPulse API credentials");
    }

    try {
        // 1. Send to Primary Recipient
        // content fallback: use text if html is missing
        const content = html || text || "(No content)";
        await triggerEvent(to, subject, content);

        // 2. Handle CC (Send a separate copy to Admin)
        if (cc) {
            console.log(`[SendPulse] Processing CC for ${cc}...`);
            const ccSubject = `[CC] ${subject}`;
            const ccHtml = `<div style="background:#f0f0f0;padding:8px;margin-bottom:15px;border-bottom:1px solid #ccc;font-size:12px;color:#555;">
                <strong>[Admin Copy]</strong><br>
                Original Recipient: ${to}<br>
                Original Subject: ${subject}
            </div>` + content;

            await triggerEvent(cc, ccSubject, ccHtml);
        }

        return { success: true, message: 'Emails queued via Automation 360' };

    } catch (error) {
        console.error('[SendPulse] Send failed:', error);
        throw error;
    }
};
