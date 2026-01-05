
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';
const sessionId = `test-multipart-${Date.now()}`;
const userKey = `guest-${Date.now()}`;

async function runTest() {
    console.log("=== STARTING MULTIPART & TRANSCRIPT CHECK ===");

    // 1. Test Multipart Upload (Simulated)
    console.log("--- Test 1: Multipart Upload with Audio ---");

    const boundary = '--------------------------987321567';
    // Construct valid multipart body
    const parts = [
        { name: 'userKey', value: userKey },
        { name: 'sessionId', value: sessionId },
        { name: 'questionId', value: 'q1' },
        { name: 'questionText', value: 'Tell me about a time you led a team.' },
        { name: 'answerText', value: 'I led a team to deliver a project on time.' },
        { name: 'interviewType', value: 'short' }
    ];

    let body = '';
    parts.forEach(p => {
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="${p.name}"\r\n\r\n`;
        body += `${p.value}\r\n`;
    });

    // Add dummy audio file
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="audioFile"; filename="test.wav"\r\n`;
    body += `Content-Type: audio/wav\r\n\r\n`;
    body += `[Simulated Audio Content]\r\n`;
    body += `--${boundary}--`;

    const res = await fetch(`${BASE_URL}/mock-interview/answer`, {
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: body
    });

    if (res.ok) {
        console.log("✅ Multipart upload successful (200 OK)");
        const json = await res.json();
        console.log("Response:", json.success);
    } else {
        console.error("❌ Multipart upload failed:", res.status, await res.text());
        process.exit(1);
    }

    // 2. Fetch Summary & Verify Transcript
    console.log("--- Test 2: Verify Transcript in Summary ---");
    const summaryRes = await fetch(`${BASE_URL}/mock-interview/summary?sessionId=${sessionId}`);
    const summary = await summaryRes.json();

    if (!summary.perQuestion || summary.perQuestion.length === 0) {
        console.error("❌ Summary empty/missing perQuestion");
        process.exit(1);
    }

    const item = summary.perQuestion[0];
    console.log("Transcript found:", item.transcript);

    if (item.transcript === 'I led a team to deliver a project on time.') {
        console.log("✅ Transcript matches submitted text.");
    } else {
        console.error("❌ Transcript mismatch. Got:", item.transcript);
        process.exit(1);
    }

    // 3. Verify Vocab Count (should fall back to geneated ones since answer is short)
    console.log("--- Test 3: Verify Vocab Count ---");
    console.log(`Vocab count: ${item.strongerExample.vocab.length}`);
    if (item.strongerExample.vocab.length === 2) {
        console.log("✅ Vocab count is exactly 2.");
        console.log("Vocab items:", item.strongerExample.vocab.map(v => v.word));
    } else {
        console.error("❌ Vocab count incorrect:", item.strongerExample.vocab.length);
        process.exit(1);
    }

    // 4. Verify no HTML in Stronger Example text
    console.log("--- Test 4: Check HTML Stripping ---");
    if (item.strongerExample.text.includes('<')) {
        console.error("❌ Stronger Example contains HTML:", item.strongerExample.text);
        process.exit(1);
    } else {
        console.log("✅ Stronger Example text is clean.");
    }

    console.log("✅ ALL CHECKS PASSED");
}

runTest();
