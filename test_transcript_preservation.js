// Test script to verify transcript preservation
// Run with: node test_transcript_preservation.js

const BASE_URL = 'http://localhost:3000';

async function testTranscriptPreservation() {
    console.log('\n=== Testing Transcript Preservation ===\n');

    const sessionId = 'test-transcript-' + Date.now();
    const verbatimAnswer = 'Um, so like, I think the most important thing is to, you know, communicate clearly and stuff.';

    console.log('Submitting answer with casual language...');
    console.log('Verbatim answer:', verbatimAnswer);
    console.log('Length:', verbatimAnswer.length, 'chars\n');

    try {
        // Submit answer
        const submitRes = await fetch(`${BASE_URL}/api/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: sessionId,
                questionId: 'q1',
                questionText: 'What is the most important aspect of leadership?',
                answerText: verbatimAnswer,
                userKey: 'test-user',
                interviewType: 'short'
            })
        });

        if (submitRes.status !== 200) {
            console.log('❌ Submit failed:', submitRes.status);
            const error = await submitRes.json();
            console.log('Error:', error);
            return;
        }

        console.log('✅ Answer submitted successfully\n');
        console.log('Check server logs for:');
        console.log('  [MOCK ANSWER] 📝 Saved transcript: ...');
        console.log('  [MOCK ANSWER] ✨ Saved rewrite: ...\n');

        // Wait a moment for processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get summary
        console.log('Fetching summary...\n');
        const summaryRes = await fetch(`${BASE_URL}/api/mock-interview/summary?sessionId=${sessionId}`);

        if (summaryRes.status !== 200) {
            console.log('❌ Summary failed:', summaryRes.status);
            return;
        }

        const summary = await summaryRes.json();

        console.log('=== Summary Response ===\n');

        if (summary.perQuestion && summary.perQuestion.length > 0) {
            const q1 = summary.perQuestion[0];

            console.log('Question 1:');
            console.log('  yourAnswer:', q1.yourAnswer?.substring(0, 80) + '...');
            console.log('  answerText:', q1.answerText?.substring(0, 80) + '...');
            console.log('  strongerExample:', q1.strongerExample?.text?.substring(0, 80) + '...');
            console.log('');

            // Verify
            const hasYourAnswer = !!q1.yourAnswer;
            const transcriptMatchesOriginal = q1.yourAnswer === verbatimAnswer || q1.answerText === verbatimAnswer;
            const rewriteIsDifferent = q1.strongerExample?.text !== verbatimAnswer;

            console.log('Verification:');
            console.log('  ✅ Has yourAnswer field:', hasYourAnswer);
            console.log('  ' + (transcriptMatchesOriginal ? '✅' : '❌') + ' Transcript matches original:', transcriptMatchesOriginal);
            console.log('  ' + (rewriteIsDifferent ? '✅' : '❌') + ' Rewrite is different:', rewriteIsDifferent);

            if (transcriptMatchesOriginal && rewriteIsDifferent) {
                console.log('\n✅ SUCCESS: Verbatim transcript is preserved!');
            } else {
                console.log('\n❌ ISSUE: Transcript may have been modified');
                console.log('Original:', verbatimAnswer);
                console.log('Returned:', q1.yourAnswer || q1.answerText);
            }
        } else {
            console.log('❌ No perQuestion data in summary');
        }

        console.log('\n=== Check server logs for debug output ===');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testTranscriptPreservation();
