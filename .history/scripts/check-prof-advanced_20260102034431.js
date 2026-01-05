
import { generateSTARRewrite, sanitizeForProfessionalism } from '../services/intelligentFeedbackGenerator.js';

console.log("=== STRICT PROFESSIONALISM VERIFICATION ===\n");

const tests = [
    // 1. Standard Profanity
    { name: "Standard Profanity", input: "I fucked up the database.", expectedFlag: true },
    // 2. Suffix Profanity
    { name: "Suffix Profanity", input: "It was a fucking disaster.", expectedFlag: true },
    // 3. Spaced Profanity
    { name: "Spaced Profanity", input: "Tough s h i t, we shipped it anyway.", expectedFlag: true },
    // 4. Leetspeak
    { name: "Leetspeak", input: "She was a b1tch during the meeting.", expectedFlag: true },
    { name: "Leetspeak 2", input: "I like pvu$$y.", expectedFlag: true },
    // 5. Sexual Explicit
    { name: "Sexual Explicit", input: "I want to see your boobs.", expectedFlag: true },
    // 6. Informal/Baby/Girl
    { name: "Informal 'Girl'", input: "Look girl, I know what I'm doing.", expectedFlag: true },
    { name: "Informal 'Baby'", input: "Hey baby, trust me.", expectedFlag: true },
    // 7. Flirt
    { name: "Flirt Phrase", input: "You look fine tonight.", expectedFlag: true },
    // 8. Safe Professional
    { name: "Safe Professional", input: "I managed a team of 10 developers.", expectedFlag: false },
    // 9. Safe Conflict
    { name: "Safe Conflict", input: "I disagreed with the approach but committed.", expectedFlag: false },
    // 10. Edge Case: Casual but safe
    { name: "Casual Safe", input: "I tackled the problem head on.", expectedFlag: false }
];

let passed = 0;

tests.forEach(test => {
    console.log(`[TEST] ${test.name}`);
    console.log(`Input: "${test.input}"`);

    // Generate Rewrite
    const result = generateSTARRewrite(
        "Tell me about a time you failed",
        test.input,
        50,
        { metrics: 0, structure: 0 },
        [{ word: "Focus", pos: "verb" }, { word: "Result", pos: "noun" }]
    );

    console.log(`Rewritten Text: "${result.text.substring(0, 80)}..."`); // Preview
    console.log(`Metadata:`, result.professionalism);

    const flagged = result.professionalism.flagged;
    const mode = result.professionalism.mode;

    const isSuccess = (flagged === test.expectedFlag);

    if (isSuccess) {
        // If expected flagged, verify mode is template_rewrite
        if (test.expectedFlag && mode !== "template_rewrite") {
            console.log("❌ FAIL: Flagged but wrong mode (expected template_rewrite)");
        } else {
            // Basic Content Check: Output should NOT contain bad words
            const outputSanity = sanitizeForProfessionalism(result.text);
            if (outputSanity.flagged) {
                console.log(`❌ FAIL: Output contained banned words! Reasons: ${outputSanity.reasons}`);
            } else {
                console.log("✅ PASS");
                passed++;
            }
        }
    } else {
        console.log(`❌ FAIL: Expected flagged=${test.expectedFlag}, got ${flagged}`);
    }
    console.log("-".repeat(40));
});

console.log(`\nResults: ${passed}/${tests.length} passed.`);
if (passed === tests.length) process.exit(0);
else process.exit(1);
