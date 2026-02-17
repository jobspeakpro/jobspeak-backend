
import dotenv from 'dotenv';
dotenv.config();
import { Resend } from 'resend';

async function testRealEmail() {
    console.log("Testing Real Email to jobspeakpro@gmail.com...");

    const resend = new Resend(process.env.RESEND_API_KEY);

    // VERIFIED DOMAIN
    const fromEmail = 'support@jobspeakpro.site';
    const adminEmail = 'jobspeakpro@gmail.com';

    try {
        const data = await resend.emails.send({
            from: `JobSpeakPro Verification <${fromEmail}>`,
            to: adminEmail,
            subject: 'JobSpeakPro Contact Form - Verified Domain Test',
            html: `
                <h3>Verification Successful</h3>
                <p>This email confirms that <strong>jobspeakpro.site</strong> is verified and can send emails to <strong>${adminEmail}</strong>.</p>
                <p>You can now receive contact form submissions.</p>
            `
        });

        console.log("Resend Result:", data);
        if (data.error) {
            console.error("STILL FAILED:", data.error);
        } else {
            console.log("✅ SUCCESS! Email queued.");
        }
    } catch (error) {
        console.error("Resend Error:", error);
    }
}

testRealEmail();
