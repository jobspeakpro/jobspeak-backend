import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/ai/micro-demo';

const TEST_CASES = [
    {
        name: 'CLEAN_PROFESSIONAL',
        text: "I improved the database performance by indexing key columns. This reduced query time by 50% and improved user retention."
    },
    {
        name: 'PROFANITY_VIOLENCE',
        text: "I told the client to shut the hell up because they were being stupid. I wanted to punch the screen."
    },
    {
        name: 'NO_RESULTS',
        text: "I attended the meetings and did my job. I worked hard on the project and the team liked me."
    }
];

async function runTest(testCase) {
    console.log(`\n--- RUNNING TEST: ${testCase.name} ---`);
    console.log(`Input: "${testCase.text}"`);

    try {
        const res = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ // Add userKey to trigger rubric logic if needed (though prompt should handle anon too, but let's pass a dummy key if logic requires it for some reason - wait, route allows anon. We'll send just text)
                text: testCase.text,
                userKey: "test-user-verification" // pass a key to ensure we hit the OpenAi path if key check exists (checked code: needs OPENAI_API_KEY in env, userKey optional but adds context)
            })
        });

        if (!res.ok) {
            console.error(`Status ${res.status}: ${await res.text()}`);
            return null;
        }

        const data = await res.json();

        // Log key parts
        const analysis = data.analysis;
        if (!analysis) {
            console.error("FAIL: No analysis block in response.");
            return null;
        }

        console.log(`Score: ${analysis.score} (${analysis.label})`);
        console.log(`Rubric Breakdown:`, analysis.rubricBreakdown || "MISSING");
        console.log(`Evidence (What Worked):`, analysis.whatWorked);
        console.log(`Improve Next:`, analysis.improveNext);

        return analysis;

    } catch (err) {
        console.error("Request failed:", err);
        return null;
    }
}

async function verify() {
    console.log("Starting Verification...");

    const results = {};

    for (const test of TEST_CASES) {
        results[test.name] = await runTest(test);
    }

    // ASSERTIONS
    console.log("\n--- ASSERTIONS ---");
    let passed = true;

    const clean = results.CLEAN_PROFESSIONAL;
    const profane = results.PROFANITY_VIOLENCE;
    const noRes = results.NO_RESULTS;

    if (!clean || !profane || !noRes) {
        console.error("CRITICAL: One or more tests failed to return data. Cannot proceed.");
        process.exit(1);
    }

    // 1. Profanity Penalty
    // Check rubricBreakdown if available, otherwise check overall score
    const cleanProfScore = clean.rubricBreakdown?.professionalism ?? 100;
    const profaneProfScore = profane.rubricBreakdown?.professionalism ?? 100;

    if (profaneProfScore < cleanProfScore && profane.score < clean.score) {
        console.log("PASS: Profanity case has lower score.");
    } else {
        console.error(`FAIL: Profanity case did not drop score enough. Clean: ${clean.score}, Profane: ${profane.score}. ProfScore: ${cleanProfScore} vs ${profaneProfScore}`);
        passed = false;
    }

    // 2. Evidence Snippets
    // Check if "whatWorked" or "hiringManagerHeard" contains quotes (heuristic: look for quotation marks or user's exact text substrings)
    // We'll check if any item in whatWorked contains a quote or matches a substring of input

    function hasEvidence(analysis, inputText) {
        // A simple check: do any strings contain phrases from input? 
        // We'll split input into 4-word chunks and see if any match
        const chunks = inputText.split(' ').reduce((acc, _, i, arr) => {
            if (i % 3 === 0 && i + 3 < arr.length) acc.push(arr.slice(i, i + 3).join(' '));
            return acc;
        }, []);

        // Also check for explicit quotes
        const hasQuote = analysis.whatWorked.some(s => s.includes('"') || s.includes("'"));

        // Or check for substring matches
        const hasSubstring = analysis.whatWorked.some(s => chunks.some(c => s.toLowerCase().includes(c.toLowerCase())));

        return hasQuote || hasSubstring; // The prompt explicitly asks for quotes, so " should be there really.
    }

    if (hasEvidence(clean, TEST_CASES[0].text)) {
        console.log("PASS: Evidence snippets detected in Clean case.");
    } else {
        console.warn("WARN: Evidence snippets might be missing in Clean case (heuristic check). Check logs above.");
        // We strictly required it in prompt, let's look for quotes
        if (clean.whatWorked.some(s => s.includes('"') || s.includes("'"))) {
            console.log("PASS: Quotes detected in evidence.");
        } else {
            console.error("FAIL: No quotes detected in Clean case evidence.");
            passed = false;
        }
    }

    // 3. Improve Next Content (Rewrite + STAR + Metric)
    const improveItems = noRes.improveNext.join(" ").toLowerCase();

    const hasMetric = improveItems.includes("metric") || improveItems.includes("number") || improveItems.includes("%") || improveItems.includes("result");
    const hasStructure = improveItems.includes("star") || improveItems.includes("situation") || improveItems.includes("action");

    if (hasMetric && hasStructure) {
        console.log("PASS: Improve Next contains Metric prompt and STAR structure reference.");
    } else {
        console.error(`FAIL: Improve Next missing key elements. Found Metric: ${hasMetric}, Structure: ${hasStructure}`);
        passed = false;
    }

    if (passed) {
        console.log("\n✅ ALL CHECKS PASSED");
        process.exit(0);
    } else {
        console.error("\n❌ VERIFICATION FAILED");
        process.exit(1);
    }
}

verify();
