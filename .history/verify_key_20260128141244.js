
import { Resend } from 'resend';

const resend = new Resend('re_yUNVSmWK_HjGruotTNRoQmAFLzSNkoVjV');

(async function () {
    try {
        const data = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'jobspeakpro@gmail.com',
            subject: 'Resend API Key Verification',
            html: '<p>The new API key is working!</p>'
        });
        console.log('Success:', data);
    } catch (error) {
        console.error('Error:', error);
    }
})();
