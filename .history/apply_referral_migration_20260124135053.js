import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Brute force SSL bypass for self-signed certs (Supabase direct connection sometimes needs this)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

// Try multiple connection string formats
// Format 1: Transaction pooler (port 6543)
// Format 2: Session pooler (port 5432)
// Format 3: Direct connection with SSL params (This might be the magic one)
const connectionStrings = [
    `postgresql://postgres:${supabaseServiceKey}@db.${projectRef}.supabase.co:6543/postgres`,
    `postgresql://postgres:${supabaseServiceKey}@db.${projectRef}.supabase.co:5432/postgres`,
    `postgresql://postgres:${supabaseServiceKey}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`,
];

async function tryConnection(connectionString, index) {
    console.log(`\nAttempt ${index + 1}: Trying connection format ${index + 1}...`);
    // Mask key in logs
    const masked = connectionString.replace(supabaseServiceKey, '***SERVICE_KEY***');
    console.log(`   Connecting to: ${masked}`);

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }, // Critical for Supabase
        connectionTimeoutMillis: 10000 // Increased timeout
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
    console.log('🚀 Applying Referral & Affiliate Migration (Robust Mode)...\n');

    // Read SQL file
    const sqlPath = path.join(process.cwd(), 'supabase-migrations', 'referral_affiliate_system.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error(`❌ SQL file not found at: ${sqlPath}`);
        process.exit(1);
    }
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    let client = null;
    for (let i = 0; i < connectionStrings.length; i++) {
        client = await tryConnection(connectionStrings[i], i);
        if (client) break;
    }

    if (!client) {
        console.log('\n❌ All connection attempts failed.');
        console.log('⚠️  Could not execute migration automatically.');
        process.exit(1);
    }

    try {
        console.log('\nRunning SQL Migration...');
        await client.query(sqlContent);
        console.log('✅ Migration executed successfully!');

        // Final Confirmation
        console.log('\nVerifying Created Tables...');
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('referral_logs', 'affiliate_applications');
        `);

        const found = res.rows.map(r => r.table_name);
        console.log(`Found tables: ${found.join(', ')}`);

        if (found.includes('referral_logs') && found.includes('affiliate_applications')) {
            console.log('✅ VERIFICATION PASSED: All tables exist.');
        } else {
            console.error('❌ VERIFICATION FAILED: Tables missing despite successful query?');
        }

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
