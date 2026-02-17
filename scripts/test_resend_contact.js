
import dotenv from 'dotenv';
dotenv.config();
import { Resend } from 'resend';

async function testResend() {
    console.log("Testing Resend Email...");
    if (!process.env.RESEND_API_KEY) {
        console.error("Missing RESEND_API_KEY");
        return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    // Resend Testing Mode only allows sending to the account email
    const adminEmail = 'antigravitycoworker@gmail.com';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    try {
        const data = await resend.emails.send({
            from: `JobSpeakPro Test <${fromEmail}>`,
            to: adminEmail,
            subject: 'Resend Integration Test',
            html: '<strong>It works!</strong><p>This is a test email from the Resend integration.</p>'
        });

        console.log("Resend Result:", data);
    } catch (error) {
        console.error("Resend Error:", error);
    }
}

testResend();
