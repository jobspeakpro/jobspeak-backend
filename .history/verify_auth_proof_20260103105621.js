
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const MOCK_LIMIT_URL = 'https://jobspeakpro.com/api/mock-interview/limit-status';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUser(email, password) {
    console.log(`\n🔐 Authenticating ${email}...`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error(`❌ Login failed for ${email}:`, error.message);
        return;
    }

    const token = data.session.access_token;
    console.log(`✅ Login successful. Token obtained.`);

    console.log(`\n📡 Checking Limit Status for ${email}...`);
    console.log(`Command: curl -s -H "Authorization: Bearer [REDACTED]" ${MOCK_LIMIT_URL}`);

    try {
        const res = await fetch(MOCK_LIMIT_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const status = res.status;
        const body = await res.json();

        console.log(`Response Status: ${status}`);
        console.log(`Response Body:`);
        console.log(JSON.stringify(body, null, 2));

        if (status === 200) {
            console.log(`✅ Verified keys for ${email}:`);
            ['blocked', 'message', 'nextAllowedAt', 'resetInDays'].forEach(key => {
                const val = body[key];
                const exists = val !== undefined;
                console.log(`   - ${key}: ${exists ? 'OK' : 'MISSING'} (${val})`);
            });
        }
    } catch (err) {
        console.error(`❌ Request failed:`, err.message);
    }
}

async function run() {
    console.log('='.repeat(60));
    console.log('AUTHENTICATED PRODUCTION VERIFICATION');
    console.log('='.repeat(60));

    await checkUser('mimito1030@gavrom.com', 'mimito1030@gavrom.com'); // email=password as per prompt
    // Wait a bit
    await new Promise(r => setTimeout(r, 2000));
    // Check second user (optional per prompt but "Run also for a second account")
    await checkUser('meyefaf490@24faw.com', 'meyefaf490@24faw.com'); // Assuming email=password pattern
}

run();
