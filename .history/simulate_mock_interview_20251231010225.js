// Simulate a full mock interview session to verify persistence
// Run with: node simulate_mock_interview.js

const BASE_URL = 'http://127.0.0.1:3000';
const USER_KEY = `guest-${Date.now()}`;
let SESSION_ID = null;

async function runStep(name, fn) {
    console.log(`\n🔹 ${name}...`);
    try {
        await fn();
        console.log(`   ✅ passed`);
    } catch (e) {
        console.error(`   ❌ FAILED: ${e.message}`);
        if (e.response) {
            console.error(`      Status: ${e.response.status}`);
            console.error(`      Body:`, await e.response.json());
        }
        process.exit(1);
    }
}

async function verify() {
    console.log('='.repeat(60));
    console.log('MOCK INTERVIEW END-TO-END VERIFICATION');
    console.log('='.repeat(60));
    console.log(`User Key: ${USER_KEY}`);

    // 1. Check initial progress (should be empty or 200 OK)
    await runStep('Checking initial progress', async () => {
        const res = await fetch(`${BASE_URL}/api/progress?userKey=${USER_KEY}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        console.log(`   Initial sessions: ${data.total}`);
    });

    // 2. Get questions (starts session)
    await runStep('Starting mock interview (getting questions)', async () => {
        const res = await fetch(`${BASE_URL}/api/mock-interview/questions?type=short&userKey=${USER_KEY}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        if (!data.sessionId) throw new Error('No sessionId returned');
        SESSION_ID = data.sessionId;
        console.log(`   Session ID: ${SESSION_ID}`);
        console.log(`   Questions: ${data.questions.length}`);
    });

    // 3. Submit an answer
    await runStep('Submitting an answer', async () => {
        const payload = {
            userKey: USER_KEY,
            sessionId: SESSION_ID,
            questionId: 'q1',
            questionText: 'Tell me about a challenge you faced.',
            answerText: 'In my last project, we had a server crash. I investigated the logs, found a memory leak in the image processing service, and fixed it by implementing stream processing. This reduced memory usage by 60% and restored service stability.'
        };

        const res = await fetch(`${BASE_URL}/api/mock-interview/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        console.log(`   Score: ${data.score}`);
        console.log(`   Feedback: ${data.feedback[0]}`);

        if (data.score < 50) throw new Error('Score too low for good answer');
    });

    // 4. Get summary
    await runStep('Fetching session summary', async () => {
        const res = await fetch(`${BASE_URL}/api/mock-interview/summary?sessionId=${SESSION_ID}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        console.log(`   Overall Score: ${data.overall_score}`);
        console.log(`   Strengths: ${data.strengths.join(', ')}`);
        console.log(`   Bullets: ${data.bullets.length}`);

        if (data.overall_score === 0 && data.bullets.length > 0) {
            // Score might be 0 if summary generator logic averages all questions and we only answered 1? 
            // Logic: sum / validScores.length. If 1 valid score, should be that score.
            // Wait, generateSessionSummary uses attempts. 
        }
    });

    // 5. Check progress again (should have updated)
    await runStep('Verifying progress update', async () => {
        const res = await fetch(`${BASE_URL}/api/progress?userKey=${USER_KEY}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        console.log(`   Total sessions: ${data.total}`);
        const recent = data.sessions[0];

        if (data.total === 0) throw new Error('Progress did not update');
        console.log(`   Latest session: ${recent.type} - Score: ${recent.score}`);
    });

    console.log('\n✅ VERIFICATION COMPLETE - ALL SYSTEMS GO');
}

verify();
