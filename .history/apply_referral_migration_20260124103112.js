import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

// Try multiple connection string formats
// Note: This relies on the convention that postgres password *might* be accessible or this environment allows it.
// If this fails, the user must use the Dashboard SQL Editor.
const connectionStrings = [
    `postgresql://postgres:${supabaseServiceKey}@db.${projectRef}.supabase.co:6543/postgres`,
    `postgresql://postgres:${supabaseServiceKey}@db.${projectRef}.supabase.co:5432/postgres`,
];

async function tryConnection(connectionString, index) {
    console.log(`\nAttempt ${index + 1}: Trying connection format ${index + 1}...`);
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
    });
    try {
        await client.connect();
        console.log('   ✅ Connection successful!');
        return client;
    } catch (err) {
        console.log(`   ❌ Connection failed: ${err.message}`);
        return null;
    }
}

async function applyMigration() {
    console.log('🚀 Applying Referral & Affiliate Migration...\n');

    // Read SQL file
    const sqlPath = path.join(process.cwd(), 'supabase-migrations', 'referral_affiliate_system.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    let client = null;
    for (let i = 0; i < connectionStrings.length; i++) {
        client = await tryConnection(connectionStrings[i], i);
        if (client) break;
    }

    if (!client) {
        console.log('\n❌ Could not connect to database directly.');
        console.log('⚠️  Automatic migration failed.');
        console.log('\nPLEASE RUN THE FOLLOWING SQL IN SUPABASE DASHBOARD:');
        console.log(`File: ${sqlPath}`);
        console.log('\n--- SQL START ---');
        console.log(sqlContent);
        console.log('--- SQL END ---\n');
        process.exit(1);
    }

    try {
        console.log('\nRunning SQL Migration...');
        await client.query(sqlContent);
        console.log('✅ Migration applied successfully!');
        await client.end();
    } catch (err) {
        console.error('❌ Migration failed during execution:', err.message);
        if (client) await client.end();
        process.exit(1);
    }
}

applyMigration().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
