import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/ai/micro-demo';
const NOTE = "I optimized the database queries by creating composite indexes, which reduced latency by 40%.";

async function verifyVocab() {
    const userKey = `vocab_check_${Date.now()}`;
    console.log("Checking vocabulary for partOfSpeech...");

    try {
        const res = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: NOTE, userKey })
        });

        const data = await res.json();
        if (!data.analysis || !data.analysis.vocabulary) {
            console.error("FAIL: No vocabulary returned", data);
            return;
        }

        const vocab = data.analysis.vocabulary;
        console.log("Returned Vocabulary:", JSON.stringify(vocab, null, 2));

        const hasPos = vocab.every(v => v.partOfSpeech && typeof v.partOfSpeech === 'string');
        if (hasPos) {
            console.log("PASS: All vocabulary items have 'partOfSpeech'.");
        } else {
            console.error("FAIL: Some items are missing 'partOfSpeech'.");
            process.exit(1);
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

verifyVocab();
