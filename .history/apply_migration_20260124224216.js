
import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function runMigration() {
    // Try to get connection string from env
    const connectionString = process.env.DATABASE_URL; // Direct connection preferred for DDL
    if (!connectionString) {
        console.log("No DATABASE_URL found. Cannot run migration automatically.");
        return;
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for some supabase connections
    });

    try {
        await client.connect();
        console.log("Connected to DB via pg.");

        const sql = fs.readFileSync('supabase-migrations/20240124_affiliate_payout_fields.sql', 'utf8');
        console.log("Running migration...");
        await client.query(sql);
        console.log("Migration applied successfully!");

    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        await client.end();
    }
}

runMigration();
