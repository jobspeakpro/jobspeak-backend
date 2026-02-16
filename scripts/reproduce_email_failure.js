
import { sendEmail } from '../services/sendpulse.js';
import dotenv from 'dotenv';
dotenv.config();

async function testEmail() {
    console.log("Testing SendPulse Email...");
    try {
        const result = await sendEmail({
            to: 'jobspeakpro@gmail.com', // Sending to admin email to verify receipt
            subject: 'Test Email from Debug Script',
            html: '<h1>It Works!</h1><p>This is a test email to verify SendPulse integration.</p>',
            text: 'It works! This is a test email.',
            cc: null
        });
        console.log("Result:", result);
    } catch (error) {
        console.error("Test Failed:", error);
    }
}

testEmail();
