
import dotenv from 'dotenv';
dotenv.config();

console.log("Checking TTS Credentials...");
const googleCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
const openaiKey = process.env.OPENAI_API_KEY;
const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

console.log("GOOGLE_APPLICATION_CREDENTIALS_JSON:", googleCreds ? "Present (" + googleCreds.length + " chars)" : "Missing");
console.log("OPENAI_API_KEY:", openaiKey ? "Present (" + openaiKey.length + " chars)" : "Missing");
console.log("ELEVENLABS_API_KEY:", elevenLabsKey ? "Present (" + elevenLabsKey.length + " chars)" : "Missing");

if (googleCreds) {
    try {
        const parsed = JSON.parse(googleCreds);
        console.log("Google Creds Parse: OK");
        console.log("Project ID:", parsed.project_id);
    } catch (e) {
        console.log("Google Creds Parse: FAILED", e.message);
    }
}
