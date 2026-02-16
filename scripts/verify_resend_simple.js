
import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();


// Found in Railway Dashboard
const resend = new Resend("re_yUNVSmWK_HjGruotTNRoQmAFLzSNkoVjV");

async function testResend() {
    console.log("Testing Resend API...");
    try {

        const data = await resend.emails.send({
            from: 'JobSpeakPro Affiliates <affiliates@jobspeakpro.site>',
            to: ['jobspeakpro@gmail.com'],
            subject: 'Resend Verification - Verified Domain',
            html: '<p>This is a test email from the verified domain <strong>jobspeakpro.site</strong>.</p>',
            reply_to: 'jobspeakpro@gmail.com'
        });

        console.log("Resend Result:", data);
    } catch (error) {
        console.error("Resend Failed:", error);
    }
}

testResend();
