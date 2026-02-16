
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BASE_URL = 'http://localhost:3000';

async function testSignupCodes() {
    console.log("=== Verifying Signup with REF and AFF Codes ===");
    const rand = Math.floor(Math.random() * 10000);

    // 1. Setup Referrers
    console.log("\n1. Setting up Referrers...");

    // Referrer A (Standard Referral Code)
    const refEmail = `referrer_ref_${rand}@test.com`;
    const refCode = `REF-TEST-${rand}`;
    const { data: userRef, error: errRef } = await supabase.auth.admin.createUser({
        email: refEmail,
        password: 'Password123!',
        email_confirm: true,
        user_metadata: { full_name: 'Referrer REF' }
    });
    if (errRef) throw errRef;
    // Set code in profile
    await supabase.from('profiles').update({ referral_code: refCode }).eq('id', userRef.user.id);
    console.log(`   Created Referrer A: ${userRef.user.id} (Code: ${refCode})`);

    // Referrer B (Affiliate Code)
    const affEmail = `referrer_aff_${rand}@test.com`;
    const affCode = `AFF-TEST-${rand}`;
    const { data: userAff, error: errAff } = await supabase.auth.admin.createUser({
        email: affEmail,
        password: 'Password123!',
        email_confirm: true,
        user_metadata: { full_name: 'Referrer AFF' }
    });
    if (errAff) throw errAff;
    // Set code in profile
    await supabase.from('profiles').update({ affiliate_code: affCode }).eq('id', userAff.user.id);
    console.log(`   Created Referrer B: ${userAff.user.id} (Code: ${affCode})`);

    // 2. Test Signup with REF Code
    console.log("\n2. Testing Signup with REFERRAL Code...");
    const applicantRefEmail = `applicant_ref_${rand}@test.com`;
    const resRef = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: applicantRefEmail,
            password: 'Password123!',
            firstName: 'Applicant Ref',
            inviteCode: refCode
        })
    });
    const dataRef = await resRef.json();
    if (!dataRef.ok) throw new Error(`REF Signup failed: ${JSON.stringify(dataRef)}`);
    console.log(`   Signup successful for ${applicantRefEmail}`);


    // Helper to wait
    const wait = ms => new Promise(r => setTimeout(r, ms));

    // Helper to get profile with retries
    async function getProfileWithRetry(email, retries = 5) {
        // 1. Get User ID from Auth (since profiles doesn't have email)
        const { data: { users }, error: userErr } = await supabase.auth.admin.listUsers();
        // Note: listUsers is better than getUserByEmail if we don't have exact ID on older supabase versions, 
        // but getUserByEmail is standard. Let's try to find the user.
        // Actually, let's just use the returned 'email' which we know.

        // Wait for auth propagation if needed (user creation is sync though)
        // We can use admin.listUsers() and filter locally if strictly necessary, but let's try strict email lookup first.
        // There is no getUserByEmail in recent APIs, it's listUsers() or getUserById().

        // Let's implement a loop
        for (let i = 0; i < retries; i++) {
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const targetUser = users.find(u => u.email === email);
            if (targetUser) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', targetUser.id).single();
                if (profile) return { ...profile, user_id: targetUser.id };
            }
            await wait(1000 * (i + 1));
        }
        return null;
    }

    // Verify Attribution for REF
    console.log("   Waiting for profile creation...");
    const profileRef = await getProfileWithRetry(applicantRefEmail);

    if (!profileRef) {
        console.error(`   ❌ FAIL: Profile not found for ${applicantRefEmail}.`);
    } else if (profileRef.referred_by === userRef.user.id) {
        console.log(`   ✅ PASS: Applicant correctly attributed to Referrer A`);
    } else {
        console.error(`   ❌ FAIL: Expected attribution to ${userRef.user.id}, got ${profileRef.referred_by}`);
        console.log("Profile Dump:", profileRef);
    }

    // 3. Test Signup with AFF Code
    console.log("\n3. Testing Signup with AFFILIATE Code...");
    const applicantAffEmail = `applicant_aff_${rand}@test.com`;
    const resAff = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: applicantAffEmail,
            password: 'Password123!',
            firstName: 'Applicant Aff',
            inviteCode: affCode
        })
    });
    const dataAff = await resAff.json();
    if (!dataAff.ok) throw new Error(`AFF Signup failed: ${JSON.stringify(dataAff)}`);
    console.log(`   Signup successful for ${applicantAffEmail}`);

    // Verify Attribution
    console.log("   Waiting for profile creation...");
    const profileAff = await getProfileWithRetry(applicantAffEmail);

    if (!profileAff) {
        console.error(`   ❌ FAIL: Profile not found for ${applicantAffEmail}`);
    } else if (profileAff.referred_by === userAff.user.id) {
        console.log(`   ✅ PASS: Applicant correctly attributed to Referrer B`);
    } else {
        console.error(`   ❌ FAIL: Expected attribution to ${userAff.user.id}, got ${profileAff.referred_by}`);
        console.log("Profile Dump:", profileAff);
    }

    // 4. Verify Referral Logs
    console.log("\n4. Verifying Referral Logs...");
    if (profileRef && profileAff) {
        const { data: logs } = await supabase.from('referral_logs').select('*').in('referred_user_id', [profileRef.id, profileAff.id]);

        if (logs.length === 2) {
            console.log(`   ✅ PASS: Found 2 referral logs.`);
            // cleanup
            console.log("   (Cleanup: you may want to delete these test users manually or via script extension)");
        } else {
            console.error(`   ❌ FAIL: Found ${logs.length} referral logs (expected 2).`);
        }
    } else {
        console.log("   Skipping log verification due to missing profiles.");
    }
}

testSignupCodes().catch(console.error);
