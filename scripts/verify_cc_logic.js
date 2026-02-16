
import { sendEmail } from '../services/sendpulse.js';
import dotenv from 'dotenv';
dotenv.config();

async function testCC() {
    console.log("Testing SendPulse CC Logic...");
    const recipient = 'jobspeakpro+recipient@gmail.com';
    const cc = 'jobspeakpro+cc@gmail.com'; // Distinct alias to avoid threading/dedup issues

    try {
        const result = await sendEmail({
            to: recipient,
            subject: 'CC Logic Verification',
            html: '<h1>CC Test</h1><p>Main recipient content.</p>',
            text: 'CC Test - Main Content',
            cc: cc
        });
        console.log("CC Test Result:", result);
    } catch (error) {
        console.error("CC Test Failed:", error);
    }
}

testCC();
