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
        name: 'SEXUAL_CONTENT',
        text: "The manager was very sexy and I kept thinking about inappropriate things during the meeting. It was hard to focus on work."
    },
    {
        name: 'THREATS',
        text: "I was so angry at my coworker that I wanted to kill them. They kept messing up and I threatened to destroy their career."
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
        // Use unique userKey for each test to avoid rate limiting
        const userKey = `test-verify-${testCase.name.toLowerCase()}-${Date.now()}`;

        const res = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: testCase.text,
                userKey
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
    const sexual = results.SEXUAL_CONTENT;
    const threats = results.THREATS;
    const noRes = results.NO_RESULTS;

    if (!clean || !profane || !sexual || !threats || !noRes) {
        console.error("CRITICAL: One or more tests failed to return data. Cannot proceed.");
        process.exit(1);
    }

    // 1. Profanity Penalty
    const cleanScore = clean.score;
    const profaneScore = profane.score;
    const sexualScore = sexual.score;
    const threatsScore = threats.score;

    if (profaneScore <= 45 && profaneScore < cleanScore) {
        console.log(`PASS: Profanity case capped at 45 (got ${profaneScore})`);
    } else {
        console.error(`FAIL: Profanity score not capped. Clean: ${cleanScore}, Profane: ${profaneScore}`);
        passed = false;
    }

    // 2. Sexual Content Penalty
    if (sexualScore <= 45 && sexualScore < cleanScore) {
        console.log(`PASS: Sexual content case capped at 45 (got ${sexualScore})`);
    } else {
        console.error(`FAIL: Sexual content score not capped. Clean: ${cleanScore}, Sexual: ${sexualScore}`);
        passed = false;
    }

    // 3. Threats Penalty
    if (threatsScore <= 45 && threatsScore < cleanScore) {
        console.log(`PASS: Threats case capped at 45 (got ${threatsScore})`);
    } else {
        console.error(`FAIL: Threats score not capped. Clean: ${cleanScore}, Threats: ${threatsScore}`);
        passed = false;
    }

    // 4. Professionalism Score Check
    const profaneProfScore = profane.rubricBreakdown?.professionalism ?? 100;
    const sexualProfScore = sexual.rubricBreakdown?.professionalism ?? 100;
    const threatsProfScore = threats.rubricBreakdown?.professionalism ?? 100;

    if (profaneProfScore < 50 && sexualProfScore < 50 && threatsProfScore < 50) {
        console.log("PASS: All inappropriate content has professionalism < 50");
    } else {
        console.error(`FAIL: Professionalism scores not low enough. Profane: ${profaneProfScore}, Sexual: ${sexualProfScore}, Threats: ${threatsProfScore}`);
        passed = false;
    }

    // 5. No Praise for Professionalism in Inappropriate Content
    const profaneWhatWorked = profane.whatWorked.join(" ").toLowerCase();
    const sexualWhatWorked = sexual.whatWorked.join(" ").toLowerCase();
    const threatsWhatWorked = threats.whatWorked.join(" ").toLowerCase();

    const hasProfessionalPraise = (text) => {
        return text.includes("professional") || text.includes("polite") || text.includes("respectful") || text.includes("appropriate");
    };

    if (!hasProfessionalPraise(profaneWhatWorked) && !hasProfessionalPraise(sexualWhatWorked) && !hasProfessionalPraise(threatsWhatWorked)) {
        console.log("PASS: No professionalism praise in inappropriate content");
    } else {
        console.error("FAIL: Found professionalism praise in inappropriate content");
        passed = false;
    }

    // 6. Quote Grounding - hiringManagerHeard should quote problematic text
    const profaneHeard = profane.hiringManagerHeard || "";
    const sexualHeard = sexual.hiringManagerHeard || "";
    const threatsHeard = threats.hiringManagerHeard || "";

    const hasQuotes = (text) => text.includes('"') || text.includes("'");

    if (hasQuotes(profaneHeard) && hasQuotes(sexualHeard) && hasQuotes(threatsHeard)) {
        console.log("PASS: hiringManagerHeard contains quotes from transcript");
    } else {
        console.warn("WARN: Some hiringManagerHeard may be missing quotes");
        // Don't fail on this, just warn
    }

    // 7. Evidence Snippets in Clean Case
    function hasEvidence(analysis, inputText) {
        const chunks = inputText.split(' ').reduce((acc, _, i, arr) => {
            if (i % 3 === 0 && i + 3 < arr.length) acc.push(arr.slice(i, i + 3).join(' '));
            return acc;
        }, []);

        const hasQuote = analysis.whatWorked.some(s => s.includes('"') || s.includes("'"));
        const hasSubstring = analysis.whatWorked.some(s => chunks.some(c => s.toLowerCase().includes(c.toLowerCase())));

        return hasQuote || hasSubstring;
    }

    if (hasEvidence(clean, TEST_CASES[0].text)) {
        console.log("PASS: Evidence snippets detected in Clean case.");
    } else {
        console.warn("WARN: Evidence snippets might be missing in Clean case (heuristic check).");
    }

    // 8. Improve Next Content (Rewrite + STAR + Metric)
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
