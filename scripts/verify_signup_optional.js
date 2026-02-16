
import fetch from 'node-fetch';
const BASE_URL = 'http://localhost:3000';

async function testOptionalSignup() {
    console.log("Testing Optional Signup (No Code)...");
    const rand = Math.floor(Math.random() * 10000);
    const email = `optional_user_${rand}@test.com`;

    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password: 'Password123!',
            firstName: 'Optional User',
            // inviteCode: undefined // OMITTED
        })
    });

    const data = await res.json();
    if (res.ok && data.ok) {
        console.log(`✅ PASS: Signup successful without code for ${email}`);
    } else {
        console.error(`❌ FAIL: Signup failed without code.`, data);
    }
}

testOptionalSignup();
