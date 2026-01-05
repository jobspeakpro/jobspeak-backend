
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const BASE_URL = 'http://localhost:3000/api';
const sessionId = `test-quality-${Date.now()}`;
const userKey = `guest-${Date.now()}`;

async function runTest() {
    console.log("=== STARTING QUALITY CHECK ===");

    // 1. Create a session (short)
    // Implicitly created on first answer

    // 2. Submit 3 answers with overlapping vocab potential
    // We want to force "articulate", "align" to appear in multiple answers to test uniqueness logic
    const questions = [
        { id: 'q1', text: 'Q1 text', answer: 'I used my articulate skills to align the team.' },
        { id: 'q2', text: 'Q2 text', answer: 'I need to aligning and articulating my thoughts.' }, // Intentionally repetitive
        { id: 'q3', text: 'Q3 text', answer: 'Quantify the results.' }
    ];

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
    console.log("Fetching summary...");
    const res = await fetch(`${BASE_URL}/mock-interview/summary?sessionId=${sessionId}`);
    const summary = await res.json();

    if (!summary.perQuestion || summary.perQuestion.length !== 3) {
        console.error("❌ Expected 3 perQuestion items, got", summary.perQuestion?.length);
        process.exit(1);
    }

    // 4. Verify Uniqueness
    const allVocabWords = [];
    let failure = false;

    summary.perQuestion.forEach((item, idx) => {
        // Verify transcript
        if (!item.transcript || item.transcript.length < 5) {
            console.error(`❌ Q${idx} missing transcript`);
            failure = true;
        }

        // Verify HTML stripping
        if (item.strongerExample.text.includes('<') || item.strongerExample.text.includes('>')) {
            console.error(`❌ Q${idx} strongerExample contains HTML tags:`, item.strongerExample.text);
            failure = true;
        }

        // Verify Vocab Count
        if (item.strongerExample.vocab.length !== 2) {
            console.error(`❌ Q${idx} vocab count is ${item.strongerExample.vocab.length}, expected 2`);
            failure = true;
        }

        // Verify Vocab Fields & Accumulate for uniqueness
        item.strongerExample.vocab.forEach(v => {
            if (!v.pos || !v.definition || !v.example) {
                console.error(`❌ Q${idx} vocab missing fields:`, v);
                failure = true;
            }
            if (v.example.includes('<') || v.example.includes('>')) {
                console.error(`❌ Q${idx} vocab example contains HTML:`, v.example);
                failure = true;
            }

            // Check matching underlinedWords
            const match = item.strongerExample.underlinedWords.find(uw => uw.toLowerCase() === v.word.toLowerCase());
            if (!match) {
                console.error(`❌ Q${idx} vocab ${v.word} not in underlinedWords`);
                failure = true;
            }

            allVocabWords.push(v.word.toLowerCase());
        });
    });

    // Check duplicates across session
    const unique = new Set(allVocabWords);
    if (unique.size !== allVocabWords.length) {
        console.error("❌ Vocab words repeated across questions!");
        console.log("All words:", allVocabWords);
        failure = true;
    } else {
        console.log("✅ Vocab uniqueness verified across all questions.");
    }

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
