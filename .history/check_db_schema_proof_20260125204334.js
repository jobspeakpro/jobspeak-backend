
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function checkSchema() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("--- DB Schema Check ---");
        console.log("Time:", new Date().toISOString());

        // Check affiliate_applications columns
        const cols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'affiliate_applications' 
            AND column_name IN ('payout_preference', 'payout_details', 'primary_platform', 'other_platform_text');
        `);
        console.log("\n[affiliate_applications] Columns Found:");
        console.table(cols.rows);

        // Check profiles constraint
        const constraints = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'profiles'::regclass 
            AND conname = 'profiles_referral_code_key';
        `);
        console.log("\n[profiles] Constraints Found:");
        console.table(constraints.rows);

    } catch (err) {
        console.error("Schema Check Failed:", err);
    } finally {
        await client.end();
    }
}

checkSchema();
