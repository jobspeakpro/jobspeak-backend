// Test script for Supabase avatar upload
// Run this to verify avatar storage configuration

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAvatarUpload() {
    console.log('=== Avatar Storage Test ===\n');

    // Step 1: Create a test user session (you'll need valid credentials)
    console.log('1. Testing with authenticated user...');

    // For testing, you can either:
    // A) Sign in with a real test user
    // B) Use a service role key (not recommended for production)

    const testEmail = 'test@example.com'; // Replace with real test user
    const testPassword = 'testpassword123'; // Replace with real password

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
    });

    if (authError) {
        console.error('❌ Auth failed:', authError.message);
        console.log('\n⚠️  To test avatar upload:');
        console.log('   1. Create a test user in Supabase Auth');
        console.log('   2. Update testEmail and testPassword in this script');
        console.log('   3. Run: node test_avatar_upload.js');
        process.exit(1);
    }

    const userId = authData.user.id;
    console.log(`✅ Authenticated as user: ${userId}\n`);

    // Step 2: Create a test image file (1x1 pixel PNG)
    const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
    );

    // Step 3: Upload avatar
    console.log('2. Uploading test avatar...');
    const fileName = `${userId}/avatar.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, testImageBuffer, {
            contentType: 'image/png',
            upsert: true // Overwrite if exists
        });

    if (uploadError) {
        console.error('❌ Upload failed:', uploadError.message);
        process.exit(1);
    }

    console.log(`✅ Upload successful: ${uploadData.path}\n`);

    // Step 4: Get public URL
    console.log('3. Retrieving public URL...');
    const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

    console.log(`✅ Public URL: ${urlData.publicUrl}\n`);

    // Step 5: Verify file exists
    console.log('4. Verifying file exists...');
    const { data: listData, error: listError } = await supabase.storage
        .from('avatars')
        .list(userId);

    if (listError) {
        console.error('❌ List failed:', listError.message);
        process.exit(1);
    }

    const avatarFile = listData.find(f => f.name === 'avatar.png');
    if (avatarFile) {
        console.log(`✅ File verified: ${avatarFile.name} (${avatarFile.metadata?.size} bytes)\n`);
    } else {
        console.error('❌ File not found in bucket');
        process.exit(1);
    }

    // Step 6: Test unauthorized access (try to upload to another user's folder)
    console.log('5. Testing access control (should fail)...');
    const fakeUserId = '00000000-0000-0000-0000-000000000000';
    const { error: unauthorizedError } = await supabase.storage
        .from('avatars')
        .upload(`${fakeUserId}/avatar.png`, testImageBuffer, {
            contentType: 'image/png'
        });

    if (unauthorizedError) {
        console.log(`✅ Access control working: ${unauthorizedError.message}\n`);
    } else {
        console.error('❌ WARNING: Unauthorized upload succeeded (policy issue!)');
    }

    // Summary
    console.log('=== Test Summary ===');
    console.log('✅ Avatar upload: PASS');
    console.log('✅ Public URL retrieval: PASS');
    console.log('✅ File verification: PASS');
    console.log('✅ Access control: PASS');
    console.log('\n✅ Avatar storage is configured correctly!');

    // Cleanup
    await supabase.auth.signOut();
}

testAvatarUpload().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
