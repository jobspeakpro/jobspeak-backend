import { sendEmail } from '../services/sendpulse.js';
import dotenv from 'dotenv';
dotenv.config();

console.log("Testing SendPulse Configuration (SIMPLE - NO CC)...");

async function test() {
    try {
        const result = await sendEmail({
            to: 'jobspeakpro@gmail.com',
            subject: 'SendPulse Simple Test - ' + new Date().toISOString(),
            html: '<h1>Simple Test</h1><p>Testing without CC.</p>',
            text: 'Simple Test',
            // No CC
        });

        if (result.success) {
            console.log("✅ SUCCESS: Simple Email sent successfully.");
            console.log("ID:", result.id);
        } else {
            console.error("❌ FAILED: Simple Email failed.");
            console.error("Error:", JSON.stringify(result.error, null, 2));
        }
    } catch (e) {
        console.error("❌ EXCEPTION:", e);
    }
}

test();
