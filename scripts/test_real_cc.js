
import dotenv from 'dotenv';
dotenv.config();
import { Resend } from 'resend';

async function testRealEmailWithCC() {
    console.log("Testing Verified Email with CC...");

    // Explicitly use the key if not loaded (just in case) or rely on env
    const resend = new Resend(process.env.RESEND_API_KEY);

    const fromEmail = 'support@jobspeakpro.site';
    const adminEmail = 'jobspeakpro@gmail.com';

    try {
        const data = await resend.emails.send({
            from: `JobSpeakPro Support <${fromEmail}>`,
            to: adminEmail,
            cc: 'jobspeakpro@gmail.com',
            subject: 'New Contact: Verification Success',
            html: `
                <h3>New Contact Message</h3>
                <p><strong>Name:</strong> Test User</p>
                <p><strong>Email:</strong> test@user.com</p>
                <p><strong>Subject:</strong> Verification Success</p>
                <hr />
                <p><strong>Message:</strong></p>
                <pre style="font-family: sans-serif; white-space: pre-wrap;">This is a final verification email with the clean sender name.</pre>
                <hr />
                <p style="font-size: 12px; color: #888;">Sent from JobSpeakPro support form</p>
            `,
            text: `Name: Test User\nEmail: test@user.com\nSubject: Verification Success\n\nMessage:\nThis is a final verification email with the clean sender name.`
        });

        console.log("Resend Result:", data);
    } catch (error) {
        console.error("Resend Error:", error);
    }
}

testRealEmailWithCC();
