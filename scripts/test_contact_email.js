
import dotenv from 'dotenv';
dotenv.config();
import { sendEmail } from '../services/sendpulse.js';

async function test() {
    console.log("Testing Contact Email...");
    try {
        const result = await sendEmail({
            to: 'jobspeakpro@gmail.com',
            subject: 'Test Contact Form Fix',
            html: '<h1>This is a test</h1><p>Testing email sending logic.</p>',
            text: 'This is a test. Testing email sending logic.'
        });
        console.log("Result:", result);
    } catch (error) {
        console.error("Error:", error);
    }
}

test();
