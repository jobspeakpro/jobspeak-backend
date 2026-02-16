
import { supabase } from '../services/supabase.js';

async function createTestApp() {
    const email = 'jobspeakpro@gmail.com';
    console.log(`Creating test application for ${email}...`);

    const { data, error } = await supabase
        .from('affiliate_applications')
        .insert({
            name: "JobSpeakPro Admin Test",
            email: email,
            primary_platform: "Test",
            status: "pending"
        })
        .select()
        .single();

    if (error) {
        console.error("Failed:", error);
    } else {
        console.log("Created App ID:", data.id);
        console.log("Run the approve script with this ID.");
    }
}

createTestApp();
