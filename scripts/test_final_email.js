
import dotenv from 'dotenv';
dotenv.config();
import { Resend } from 'resend';

async function testFinal() {
    console.log("Testing Final Email Logic (No CC)...");

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = 'support@jobspeakpro.site';
    const adminEmail = 'jobspeakpro@gmail.com';

    try {
        const data = await resend.emails.send({
            from: `JobSpeakPro Support <${fromEmail}>`,
            to: adminEmail,
            subject: 'Final Verification: No CC',
            html: `
                <h3>Final Verification</h3>
                <p>This email is sent <strong>only</strong> to ${adminEmail}.</p>
                <p>No CCs attached.</p>
                <p>Sender: ${fromEmail}</p>
            `,
            text: `Final Verification\nSent to: ${adminEmail}\nNo CC.`
        });

        console.log("Resend Result:", data);
    } catch (error) {
        console.error("Resend Error:", error);
    }
}

testFinal();
