// Test persistence and data return fixes
const BASE_URL = 'http://127.0.0.1:3000';

async function testPersistenceAndDataReturn() {
    console.log('='.repeat(60));
    console.log('TESTING PERSISTENCE AND DATA RETURN FIXES');
    console.log('='.repeat(60));

    const sessionId = `test-session-${Date.now()}`;
    const userKey = `guest-${Date.now()}`;

    // Test 1: Progress endpoint without userKey (should return 200, not 400)
    console.log('\n📋 TEST 1: Progress without userKey (guest support)\n');
    let res = await fetch(`${BASE_URL}/api/progress`);
    console.log('Status:', res.status, res.statusText);
    let data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    // Test 2: Mock interview answer persistence
    console.log('\n📋 TEST 2: Mock Interview Answer Persistence\n');

    // Submit first answer
    res = await fetch(`${BASE_URL}/api/mock-interview/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userKey,
            sessionId,
            questionId: 'q1',
            questionText: 'Tell me about a time you led a project.',
            answerText: 'I led a team of 5 engineers to migrate our database. We reduced query time by 70% and saved $50k annually.'
        })
    });
    data = await res.json();
    console.log('First answer saved. Progress:', data.progress);

    // Submit second answer
    res = await fetch(`${BASE_URL}/api/mock-interview/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userKey,
            sessionId,
            questionId: 'q2',
            questionText: 'How do you handle conflict?',
            answerText: 'I focus on understanding both perspectives and finding common ground.'
        })
    });
    data = await res.json();
    console.log('Second answer saved. Progress:', data.progress);

    // Test 3: Mock interview summary with attempts
    console.log('\n📋 TEST 3: Mock Interview Summary with Attempts\n');
    res = await fetch(`${BASE_URL}/api/mock-interview/summary?sessionId=${sessionId}`);
    data = await res.json();
    console.log('Attempt Count:', data.attemptCount);
    console.log('Overall Score:', data.overall_score);
    console.log('Strengths:', data.strengths);
    console.log('Bullets:', data.bullets?.length, 'items');
    console.log('Completed:', data.completed);

    // Test 4: Practice vocabulary and rewrite
    console.log('\n📋 TEST 4: Practice Vocabulary and Rewrite\n');
    res = await fetch(`${BASE_URL}/api/practice/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userKey,
            sessionId: `practice-${Date.now()}`,
            questionId: 'p1',
            questionText: 'Describe a technical challenge.',
            answerText: 'Our API was slow. I optimized queries and added caching.'
        })
    });
    data = await res.json();
    console.log('Vocabulary count:', data.vocabulary?.length);
    console.log('Vocabulary sample:', data.vocabulary?.[0]);
    console.log('Clearer rewrite length:', data.clearerRewrite?.length);
    console.log('Hire likelihood before:', data.hireLikelihood);
    console.log('Hire likelihood after:', data.hireLikelihoodAfterRewrite);

    // Test 5: Progress with userKey
    console.log('\n📋 TEST 5: Progress with userKey\n');
    res = await fetch(`${BASE_URL}/api/progress?userKey=${userKey}`);
    data = await res.json();
    console.log('Total sessions:', data.total);
    console.log('Sessions:', data.sessions?.length);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETE');
    console.log('='.repeat(60));
}

testPersistenceAndDataReturn();
