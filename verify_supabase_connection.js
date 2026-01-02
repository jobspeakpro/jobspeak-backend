import { supabase } from './services/supabase.js';

console.log("═══════════════════════════════════════════════════════");
console.log("  SUPABASE CONNECTION VERIFICATION");
console.log("═══════════════════════════════════════════════════════\n");

// Get Supabase URL (redact key)
const supabaseUrl = process.env.SUPABASE_URL || 'NOT_SET';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'NOT_SET';

console.log("SUPABASE_URL:", supabaseUrl);
console.log("SUPABASE_KEY:", supabaseKey.substring(0, 20) + "..." + supabaseKey.substring(supabaseKey.length - 5));

if (supabaseUrl === 'NOT_SET') {
    console.error("\n❌ SUPABASE_URL is not set in .env file!");
    process.exit(1);
}

// Extract host from URL
const urlHost = new URL(supabaseUrl).hostname;
console.log("\nSupabase Host:", urlHost);
console.log("Expected format: <project-ref>.supabase.co\n");

// Test connection
console.log("Testing Supabase connection...");
try {
    const { data, error } = await supabase
        .from('mock_attempts')
        .select('column_name:*')
        .limit(0);

    if (error) {
        console.error("❌ Connection test failed:", error.message);
        console.error("Error code:", error.code);
    } else {
        console.log("✅ Connection successful\n");
    }
} catch (e) {
    console.error("❌ Connection error:", e.message);
}

console.log("═══════════════════════════════════════════════════════");
console.log("NEXT STEPS:");
console.log("1. Verify the host above matches your Supabase dashboard URL");
console.log("2. Run this SQL in Supabase SQL Editor:");
console.log("   SELECT column_name FROM information_schema.columns");
console.log("   WHERE table_name='mock_attempts' AND column_name='clearer_rewrite';");
console.log("3. If column exists, run: NOTIFY pgrst, 'reload schema';");
console.log("═══════════════════════════════════════════════════════");
