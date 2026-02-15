// scripts/verify_affiliate_logic.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BASE_URL = 'http://localhost:3000'; // Local backend

async function testAffiliateFlow() {
    console.log("1. Creating Test Application...");
    const testEmail = `antigravity_test_${Date.now()}@example.com`;

    // Simulate frontend submission
    const { data: app, error } = await supabase
        .from('affiliate_applications')
        .insert({
            name: "Antigravity Automated Tester",
            email: testEmail,
            country: "AI Land",
            primary_platform: "Testing",
            audience_size: "1000",
            payout_preference: "PayPal",
            payout_details: "test@example.com",
            status: "pending"
        })
        .select()
        .single();

    if (error) {
        console.error("Failed to create app:", error);
        return;
    }
    console.log(`   -> Created Application ID: ${app.id}`);

    // 2. Approve Application via API
    console.log("2. Approving Application via Admin API...");

    const response = await fetch(`${BASE_URL}/api/admin/affiliates/${app.id}/approve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-token': process.env.ADMIN_TOKEN,
            'x-verify-key': 'temp-verify-123'
        }
    });

    const result = await response.json();
    console.log("   -> API Response:", result);

    if (result.success && result.affiliateCode) {
        console.log(`   -> SUCCESS: Affiliate Code Generated: ${result.affiliateCode}`);
    } else {
        console.error("   -> FAILED: Code not generated or API error.");
    }

    // 3. Verify DB Update
    console.log("3. Verifying DB State...");
    const { data: updatedApp } = await supabase
        .from('affiliate_applications')
        .select('*')
        .eq('id', app.id)
        .single();

    console.log(`   -> Status: ${updatedApp.status}`);
    console.log(`   -> Code: ${updatedApp.affiliate_code}`);
    console.log(`   -> Payout Details (Log): ${updatedApp.payout_details}`);

    if (updatedApp.status === 'approved' && updatedApp.affiliate_code) {
        console.log("   -> VERIFICATION PASSED ✅");
    } else {
        console.log("   -> VERIFICATION FAILED ❌");
    }
}

testAffiliateFlow();
