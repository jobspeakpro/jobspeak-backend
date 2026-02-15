import { sendEmail } from '../services/sendpulse.js';
import dotenv from 'dotenv';
dotenv.config();

console.log("Testing SendPulse Configuration...");

async function test() {
    try {
        const result = await sendEmail({
            to: 'jobspeakpro@gmail.com',
            subject: 'SendPulse Integration Test - ' + new Date().toISOString(),
            html: '<h1>Integration Verified</h1><p>This email confirms that SendPulse is correctly configured in your Jobspeak backend.</p>',
            text: 'Integration Verified. SendPulse is working.',
            cc: 'jobspeakpro@gmail.com' // Testing CC as well
        });

        if (result.success) {
            console.log("✅ SUCCESS: Email sent successfully.");
            console.log("ID:", result.id);
        } else {
            console.error("❌ FAILED: Email failed to send.");
            console.error("Error:", JSON.stringify(result.error, null, 2));
        }
    } catch (e) {
        console.error("❌ EXCEPTION:", e);
    }
}

test();
