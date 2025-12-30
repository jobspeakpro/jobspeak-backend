// verify_all.js
// Master verification script that runs all backend reliability tests

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TESTS = [
    {
        name: "Feedback Grounding",
        script: "verify_feedback_grounding.js",
        description: "Tests content detection and AI override logic"
    },
    {
        name: "Vocabulary Validation",
        script: "verify_vocab.js",
        description: "Tests surface-form matching and partOfSpeech"
    },
    {
        name: "Mock Interview Gating",
        script: "verify_mock_interview_gate.js",
        description: "Tests one-time free interview limit and 403 payload"
    }
];

function runTest(test) {
    return new Promise((resolve, reject) => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Running: ${test.name}`);
        console.log(`Description: ${test.description}`);
        console.log('='.repeat(60));

        const child = spawn('node', [test.script], {
            cwd: __dirname,
            stdio: 'inherit',
            shell: true
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve({ name: test.name, passed: true });
            } else {
                resolve({ name: test.name, passed: false, code });
            }
        });

        child.on('error', (err) => {
            reject({ name: test.name, error: err });
        });
    });
}

async function runAllTests() {
    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║     JOBSPEAK PRO - BACKEND RELIABILITY VERIFICATION        ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log();
    console.log(`Running ${TESTS.length} test suites...\n`);

    const results = [];

    for (const test of TESTS) {
        try {
            const result = await runTest(test);
            results.push(result);
        } catch (err) {
            results.push({ name: test.name, passed: false, error: err });
        }
    }

    // Print summary
    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║                      TEST SUMMARY                          ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log();

    let allPassed = true;
    for (const result of results) {
        const status = result.passed ? "✅ PASS" : "❌ FAIL";
        console.log(`  ${status}  ${result.name}`);
        if (!result.passed) {
            allPassed = false;
            if (result.error) {
                console.log(`         Error: ${result.error.message || result.error}`);
            } else if (result.code) {
                console.log(`         Exit code: ${result.code}`);
            }
        }
    }

    console.log();
    console.log("─".repeat(60));

    if (allPassed) {
        console.log("\n✅ ALL TESTS PASSED - Backend reliability verified!\n");
        process.exit(0);
    } else {
        console.log("\n❌ SOME TESTS FAILED - Please review the output above\n");
        process.exit(1);
    }
}

// Run all tests
runAllTests().catch(err => {
    console.error("\n❌ CRITICAL ERROR:", err);
    process.exit(1);
});
