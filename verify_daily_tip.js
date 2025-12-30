// verify_daily_tip.js
// Test daily tip endpoint for deterministic rotation

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function testDailyTip() {
    console.log("=== Daily Tip Verification ===\n");

    try {
        // 1. Fetch daily tip
        console.log("1. Fetching daily tip...");
        const response1 = await fetch(`${BASE_URL}/api/daily-tip`);
        const data1 = await response1.json();
        console.log("   Response:", data1);

        if (!data1.tip || !data1.date) {
            throw new Error("Response should have 'tip' and 'date' fields");
        }

        if (typeof data1.tip !== 'string' || data1.tip.length === 0) {
            throw new Error("Tip should be a non-empty string");
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(data1.date)) {
            throw new Error("Date should be in YYYY-MM-DD format");
        }

        console.log("   ✅ Daily tip structure correct\n");

        // 2. Fetch again (should be same tip - deterministic)
        console.log("2. Fetching again (should be same tip)...");
        const response2 = await fetch(`${BASE_URL}/api/daily-tip`);
        const data2 = await response2.json();
        console.log("   Response:", data2);

        if (data1.tip !== data2.tip) {
            throw new Error("Same day should return same tip (deterministic)");
        }

        if (data1.date !== data2.date) {
            throw new Error("Same day should return same date");
        }

        console.log("   ✅ Deterministic rotation working\n");

        // 3. Verify tip is from expected pool (basic sanity check)
        console.log("3. Verifying tip content...");
        if (data1.tip.length < 20) {
            throw new Error("Tip seems too short - might be malformed");
        }

        // Check it's a reasonable interview tip (contains common keywords)
        const keywords = ['interview', 'practice', 'prepare', 'question', 'answer', 'company', 'role', 'skill', 'experience', 'STAR', 'research', 'follow'];
        const hasKeyword = keywords.some(keyword => data1.tip.toLowerCase().includes(keyword));

        if (!hasKeyword) {
            console.warn("   ⚠️  Warning: Tip doesn't contain common interview keywords");
        } else {
            console.log("   ✅ Tip content looks valid\n");
        }

        // 4. Verify date is today
        console.log("4. Verifying date is today...");
        const today = new Date().toISOString().split('T')[0];
        if (data1.date !== today) {
            throw new Error(`Date should be today (${today}), got ${data1.date}`);
        }
        console.log("   ✅ Date is correct\n");

        console.log("✅ ALL TESTS PASSED\n");
        console.log(`Today's tip: "${data1.tip}"\n`);
        return true;
    } catch (error) {
        console.error("❌ TEST FAILED:", error.message);
        console.error(error.stack);
        return false;
    }
}

testDailyTip().then(success => {
    process.exit(success ? 0 : 1);
});
