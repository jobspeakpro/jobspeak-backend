import fetch from 'node-fetch';

let accessToken = null;
let tokenExpiration = 0;

const CLIENT_ID = process.env.SENDPULSE_ID || 'c40eb82a53dd48e8c4b7880eae86690d';
const CLIENT_SECRET = process.env.SENDPULSE_SECRET || 'b021c05abcd3708e967fc7ce95db4dc0';

async function getAccessToken() {
    const now = Date.now();
    if (accessToken && now < tokenExpiration) {
        return accessToken;
    }

    console.log('[SendPulse] Requesting new access token...');

    try {
        const response = await fetch('https://api.sendpulse.com/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                grant_type: 'client_credentials',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET
            })
        });

        const data = await response.json();

        if (data.access_token) {
            accessToken = data.access_token;
            // Expires in data.expires_in seconds (usually 3600). buffer by 60s.
            tokenExpiration = now + (data.expires_in * 1000) - 60000;
            console.log('[SendPulse] Token received.');
            return accessToken;
        } else {
            console.error('[SendPulse] Auth failed:', data);
            throw new Error('Failed to authenticate with SendPulse');
        }
    } catch (error) {
        console.error('[SendPulse] Network error during auth:', error);
        throw error;
    }
}

export async function sendEmail({ to, subject, html, text, fromName = 'JobSpeakPro Contact', fromEmail = 'jobspeakpro@gmail.com' }) {
    try {
        const token = await getAccessToken();

        // Encode subject to base64 to avoid encoding issues? No, API handles utf8 usually.
        // SendPulse REST API payload structure:
        // {
        //   "email": {
        //     "html": "...",
        //     "text": "...",
        //     "subject": "...",
        //     "from": { "name": "...", "email": "..." },
        //     "to": [ { "name": "...", "email": "..." } ]
        //   }
        // }

        const emailData = {
            email: {
                html: html,
                text: text, // Optional
                subject: subject,
                from: {
                    name: fromName,
                    email: fromEmail // Must be a verified sender
                },
                to: [
                    {
                        email: to
                    }
                ]
            }
        };

        console.log(`[SendPulse] Sending email to ${to}...`);

        const response = await fetch('https://api.sendpulse.com/smtp/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        const result = await response.json();

        if (result.result === true) {
            console.log('[SendPulse] Email sent successfully:', result);
            return { success: true, id: result.id };
        } else {
            console.error('[SendPulse] Sending failed:', result);
            // Result might be { error_code: ..., message: ... }
            return { success: false, error: result };
        }

    } catch (error) {
        console.error('[SendPulse] Exception:', error);
        return { success: false, error: error.message };
    }
}
