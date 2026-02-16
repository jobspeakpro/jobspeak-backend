
import { supabase } from '../services/supabase.js';
import fetch from 'node-fetch';

async function runCCTest() {
    const testEmail = `jobspeakpro+affiliate${Date.now()}@gmail.com`;
    console.log(`1. Creating app for ${testEmail}...`);

    const { data: app } = await supabase.from('affiliate_applications').insert({
        name: "CC Test User",
        email: testEmail,
        status: 'pending',
        primary_platform: 'Test'
    }).select().single();

    console.log(`App ID: ${app.id}`);

    console.log(`2. Triggering Approve...`);
    const response = await fetch(`http://localhost:3000/api/admin/affiliates/${app.id}/approve`, {
        method: 'POST'
    });

    const result = await response.json();
    console.log("Result:", result);
}

runCCTest();
