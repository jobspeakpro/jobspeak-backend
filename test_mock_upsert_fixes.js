#!/usr/bin/env node
/**
 * Comprehensive test for mock interview backend fixes:
 * 1. UPSERT prevents duplicates (submit Q1 twice → attemptCount stays 1)
 * 2. Submit Q1-Q5 → attemptCount 5, totalQuestions 5, perQuestion.length 5
 * 3. Transcript equals submitted answer_text
 * 4. Each perQuestion has exactly 2 vocab words
 * 5. No vocab repeats across session
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';
const sessionId = `test-upsert-${Date.now()}`;
const userKey = `guest-${Date.now()}`;

async function runTest() {
    console.log("=== MOCK INTERVIEW BACKEND VERIFICATION ===\n");

    // Test 1: Submit Q1 twice (UPSERT should prevent duplicate)
    console.log("--- Test 1: UPSERT Prevents Duplicates ---");

    const q1Payload = {
        userKey,
        sessionId,
        questionId: 'q1',
        questionText: 'Tell me about a time you led a team.',
        answerText: 'First submission: I led a team to success.',
        interviewType: 'short'
    };

    // First submit
    let res1 = await fetch(`${BASE_URL}/mock-interview/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(q1Payload)
    });

    if (!res1.ok) {
        console.error("❌ First Q1 submit failed:", await res1.text());
        process.exit(1);
    }
    console.log("✅ First Q1 submit: 200 OK");

    // Second submit (should UPSERT, not duplicate)
    q1Payload.answerText = 'Second submission: I led a team to deliver on time.';

    let res2 = await fetch(`${BASE_URL}/mock-interview/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(q1Payload)
    });

    if (!res2.ok) {
        console.error("❌ Second Q1 submit failed:", await res2.text());
        process.exit(1);
    }
    console.log("✅ Second Q1 submit: 200 OK (UPSERT)");

    // Check summary after duplicate submit
    let summaryRes = await fetch(`${BASE_URL}/mock-interview/summary?sessionId=${sessionId}`);
    let summary = await summaryRes.json();

    if (summary.attemptCount !== 1) {
        console.error(`❌ UPSERT FAILED: attemptCount is ${summary.attemptCount}, expected 1`);
        process.exit(1);
    }
    console.log(`✅ UPSERT verified: attemptCount = 1 (not 2)\n`);

    // Verify transcript was updated to second submission
    if (summary.perQuestion[0].transcript !== 'Second submission: I led a team to deliver on time.') {
        console.error("❌ Transcript not updated:", summary.perQuestion[0].transcript);
        process.exit(1);
    }
    console.log("✅ Transcript updated to latest submission\n");

    // Test 2: Submit Q2-Q5 (total 5 questions)
    console.log("--- Test 2: Submit Q2-Q5 ---");

    const questions = [
        { id: 'q2', text: 'Describe a conflict you resolved.', answer: 'I mediated a disagreement between team members.' },
        { id: 'q3', text: 'Tell me about a failure.', answer: 'I missed a deadline but learned to prioritize better.' },
        { id: 'q4', text: 'How do you handle pressure?', answer: 'I stay calm and focus on solutions.' },
        { id: 'q5', text: 'Why should we hire you?', answer: 'I bring strong leadership and technical skills.' }
    ];

    for (const q of questions) {
        const payload = {
            userKey,
            sessionId,
            questionId: q.id,
            questionText: q.text,
            answerText: q.answer,
            interviewType: 'short'
        };

        const res = await fetch(`${BASE_URL}/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            console.error(`❌ ${q.id} submit failed:`, await res.text());
            process.exit(1);
        }
        console.log(`✅ ${q.id} submitted`);
    }

    // Test 3: Verify final summary
    console.log("\n--- Test 3: Verify Final Summary ---");

    summaryRes = await fetch(`${BASE_URL}/mock-interview/summary?sessionId=${sessionId}`);
    summary = await summaryRes.json();

    console.log(`\nSummary Data:`);
    console.log(`  attemptCount: ${summary.attemptCount}`);
    console.log(`  totalQuestions: ${summary.totalQuestions}`);
    console.log(`  perQuestion.length: ${summary.perQuestion.length}`);

    // Verify counts
    if (summary.attemptCount !== 5) {
        console.error(`❌ attemptCount is ${summary.attemptCount}, expected 5`);
        process.exit(1);
    }
    console.log("✅ attemptCount = 5");

    if (summary.totalQuestions !== 5) {
        console.error(`❌ totalQuestions is ${summary.totalQuestions}, expected 5`);
        process.exit(1);
    }
    console.log("✅ totalQuestions = 5");

    if (summary.perQuestion.length !== 5) {
        console.error(`❌ perQuestion.length is ${summary.perQuestion.length}, expected 5`);
        process.exit(1);
    }
    console.log("✅ perQuestion.length = 5");

    // Test 4: Verify transcripts match submitted answers
    console.log("\n--- Test 4: Verify Transcripts ---");

    const expectedAnswers = [
        'Second submission: I led a team to deliver on time.', // Q1 (updated)
        'I mediated a disagreement between team members.',
        'I missed a deadline but learned to prioritize better.',
        'I stay calm and focus on solutions.',
        'I bring strong leadership and technical skills.'
    ];

    let transcriptMatch = true;
    summary.perQuestion.forEach((q, idx) => {
        const transcript = q.transcript || q.answerText || q.answer_text || '';
        if (transcript !== expectedAnswers[idx]) {
            console.error(`❌ Q${idx + 1} transcript mismatch:`);
            console.error(`   Expected: "${expectedAnswers[idx]}"`);
            console.error(`   Got: "${transcript}"`);
            transcriptMatch = false;
        }
    });

    if (!transcriptMatch) {
        process.exit(1);
    }
    console.log("✅ All transcripts match submitted answers");

    // Test 5: Verify vocab requirements
    console.log("\n--- Test 5: Verify Vocabulary ---");

    const allVocabWords = [];
    let vocabValid = true;

    summary.perQuestion.forEach((q, idx) => {
        const vocab = q.strongerExample?.vocab || [];

        // Check exactly 2 vocab words
        if (vocab.length !== 2) {
            console.error(`❌ Q${idx + 1} has ${vocab.length} vocab words, expected 2`);
            vocabValid = false;
        }

        // Check all required fields
        vocab.forEach(v => {
            if (!v.word || !v.ipa || !v.pos || !v.definition || !v.example || v.accent !== "US" || !v.audioText) {
                console.error(`❌ Q${idx + 1} vocab missing fields:`, v);
                vocabValid = false;
            }
            allVocabWords.push(v.word.toLowerCase());
        });

        // Check underlinedWords matches vocab
        const underlined = q.strongerExample?.underlinedWords || [];
        if (underlined.length !== 2) {
            console.error(`❌ Q${idx + 1} has ${underlined.length} underlinedWords, expected 2`);
            vocabValid = false;
        }

        // Check no HTML in strongerExample.text
        if (q.strongerExample?.text?.includes('<')) {
            console.error(`❌ Q${idx + 1} strongerExample contains HTML tags`);
            vocabValid = false;
        }
    });

    if (!vocabValid) {
        process.exit(1);
    }
    console.log("✅ All questions have exactly 2 vocab words with full fields");

    // Check uniqueness across session
    const uniqueWords = new Set(allVocabWords);
    if (uniqueWords.size !== allVocabWords.length) {
        console.error("❌ Vocab words repeated across questions!");
        console.log("All words:", allVocabWords);
        process.exit(1);
    }
    console.log("✅ All vocab words unique across session (10 unique words)");

    console.log("\n=== ✅ ALL TESTS PASSED ===");
    console.log("\nSample perQuestion[0]:");
    console.log(JSON.stringify(summary.perQuestion[0], null, 2));
}

runTest().catch(err => {
    console.error("Test failed with error:", err);
    process.exit(1);
});
