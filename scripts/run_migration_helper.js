
import { runStartupMigrations } from '../migrations/runMigrations.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    console.log("Running migrations...");
    try {
        await runStartupMigrations();
        console.log("Done.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

run();
