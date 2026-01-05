
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3000/api';
// Use guest key to avoid UUID errors
const sessionId = `test-quality-${Date.now()}`;
const userKey = `guest-${Date.now()}`;

async function runTest() {
    console.log("=== STARTING COMPREHENSIVE QUALITY CHECK ===");

    // 1. Test Defensive 400
    console.log("--- Test 1: Defensive 400 Bad Request ---");
    const badRes = await fetch(`${BASE_URL}/mock-interview/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userKey,
            // Missing sessionId, questionId, questionText
        })
    });

    if (badRes.status === 400) {
        console.log("✅ Correctly rejected missing fields with 400");
        const json = await badRes.json();
        console.log("Error details:", json);
    } else {
        console.error("❌ Failed to reject missing fields, got", badRes.status);
        process.exit(1);
    }

    // 2. Submit 3 answers with overlapping vocab potential and repetitiveness checks
    const questions = [
        { id: 'q1', text: 'Q1 text', answer: 'I used my articulate skills to align the team.' },
        { id: 'q2', text: 'Q2 text', answer: 'I need to aligning and articulating my thoughts.' }, // Intentionally repetitive
        { id: 'q3', text: 'Q3 text', answer: 'Quantify the results.' }
    ];

    console.log("--- Test 2: Submitting Answers ---");
    for (const q of questions) {
        console.log(`Submitting answer for ${q.id}...`);
        const res = await fetch(`${BASE_URL}/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userKey,
                sessionId,
                questionId: q.id,
                questionText: q.text,
                answerText: q.answer,
                interviewType: 'short'
            })
        });
        if (!res.ok) {
            console.error('Answer fail:', await res.text());
            process.exit(1);
        }
    }

    // 3. Fetch summary
    console.log("--- Test 3: Analyzing Summary ---");
    const res = await fetch(`${BASE_URL}/mock-interview/summary?sessionId=${sessionId}`);
    const summary = await res.json();

    if (!summary.perQuestion || summary.perQuestion.length !== 3) {
        console.error("❌ Expected 3 perQuestion items, got", summary.perQuestion?.length);
        process.exit(1);
    }

    // 4. Verify Uniqueness
    const allVocabWords = [];
    const allIntros = [];
    const allFirstBullets = [];

    let failure = false;

    summary.perQuestion.forEach((item, idx) => {
        // Transcript check
        if (!item.transcript || item.transcript.length < 5) {
            console.error(`❌ Q${idx} missing transcript`);
            failure = true;
        }

        // HTML check
        if (item.strongerExample.text.includes('<') || item.strongerExample.text.includes('>')) {
            console.error(`❌ Q${idx} strongerExample contains HTML tags:`, item.strongerExample.text);
            failure = true;
        }

        // Vocab Count check
        if (item.strongerExample.vocab.length !== 2) {
            console.error(`❌ Q${idx} vocab count is ${item.strongerExample.vocab.length}, expected 2`);
            failure = true;
        }

        // Vocab Fields & Accumulate
        item.strongerExample.vocab.forEach(v => {
            if (!v.pos || !v.definition || !v.example) {
                console.error(`❌ Q${idx} vocab missing fields:`, v);
                failure = true;
            }
            allVocabWords.push(v.word.toLowerCase());
        });

        // Collect intros for variation check
        const text = item.strongerExample.text;
        const intro = text.split(' ').slice(0, 4).join(' '); // First 4 words
        allIntros.push(intro);

        // Collect bullets for variation check
        if (item.whatWorked.length > 0) allFirstBullets.push(item.whatWorked[0]);
    });

    // Check duplicates across session
    const unique = new Set(allVocabWords);
    if (unique.size !== allVocabWords.length) {
        console.error("❌ Vocab words repeated across questions!");
        console.log("All words:", allVocabWords);
        failure = true;
    } else {
        console.log("✅ Vocab uniqueness verified.");
    }

    // Check intro variation (heuristic: just check they aren't all identical)
    // Note: With only 3 items, random chance could pick same index. 
    // But let's see. If all 3 are identical, might be an issue unless inputs are identical.
    console.log("Intros:", allIntros);
    const uniqueIntros = new Set(allIntros);
    if (uniqueIntros.size < 2) {
        console.warn("⚠️ Intros seem repetitive. Check logic.");
        // Non-blocking but warning
    } else {
        console.log("✅ Stronger Example intros varied.");
    }

    // Check bullet variation
    console.log("First Bullets:", allFirstBullets);

    if (failure) {
        console.error("❌ VERIFICATION FAILED");
        process.exit(1);
    } else {
        console.log("✅ ALL CHECKS PASSED");
        // Print one vocab example for verification
        console.log("Sample Vocab:", JSON.stringify(summary.perQuestion[0].strongerExample.vocab[0], null, 2));
    }
}

runTest();
