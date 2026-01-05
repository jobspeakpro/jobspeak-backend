// Test intelligent hire-grade feedback system
const BASE_URL = 'http://127.0.0.1:3000';

async function testIntelligentFeedback() {
    console.log('='.repeat(60));
    console.log('TESTING HIRE-GRADE INTELLIGENT FEEDBACK');
    console.log('='.repeat(60));

    // Test 1: Engineer with good answer
    console.log('\n📋 TEST 1: Engineer - Good Answer\n');
    const engineerPayload = {
        userKey: `guest-${Date.now()}`,
        sessionId: `test-${Date.now()}`,
        questionId: 'q1',
        questionText: 'Tell me about a time you improved system performance.',
        answerText: 'In Q2 2023, our API response times exceeded 5 seconds, causing customer complaints. I was tasked with optimizing performance. I implemented Redis caching and database query optimization. This reduced response times by 80% to under 1 second and improved customer satisfaction by 25%.'
    };

    let res = await fetch(`${BASE_URL}/api/practice/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(engineerPayload)
    });

    let data = await res.json();
    console.log('Score:', data.score);
    console.log('Hire Probability:', data.clearerRewrite?.hireProbabilityEstimate);
    console.log('\nWhat Worked:');
    data.whatWorked.forEach(w => console.log('  -', w));
    console.log('\nImprove Next:');
    data.improveNext.forEach(i => console.log('  -', i));
    console.log('\nInterpretation:', data.interpretation);
    console.log('\nVocabulary (first 2):');
    data.vocabulary.slice(0, 2).forEach(v => console.log(`  - ${v.word}: ${v.definition}`));
    console.log('\nClearer Rewrite:', data.clearerRewrite?.text?.substring(0, 100) + '...');

    // Test 2: Dentist with weak answer
    console.log('\n\n📋 TEST 2: Dentist - Weak Answer\n');
    const dentistPayload = {
        userKey: `guest-${Date.now()}`,
        sessionId: `test-${Date.now()}`,
        questionId: 'q2',
        questionText: 'How do you handle difficult patients?',
        answerText: 'I just try to be nice and help them.'
    };

    res = await fetch(`${BASE_URL}/api/practice/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dentistPayload)
    });

    data = await res.json();
    console.log('Score:', data.score);
    console.log('Hire Probability:', data.clearerRewrite?.hireProbabilityEstimate);
    console.log('\nWhat Worked:');
    data.whatWorked.forEach(w => console.log('  -', w));
    console.log('\nImprove Next:');
    data.improveNext.forEach(i => console.log('  -', i));
    console.log('\nInterpretation:', data.interpretation);
    console.log('\nVocabulary (first 2):');
    data.vocabulary.slice(0, 2).forEach(v => console.log(`  - ${v.word}: ${v.definition}`));

    // Test 3: Student answer
    console.log('\n\n📋 TEST 3: Student - Medium Answer\n');
    const studentPayload = {
        userKey: `guest-${Date.now()}`,
        sessionId: `test-${Date.now()}`,
        questionId: 'q3',
        questionText: 'Tell me about a project you completed.',
        answerText: 'For my computer science class, I built a web app that helps students find study groups. I used React and Node.js. It got good feedback from my classmates.'
    };

    res = await fetch(`${BASE_URL}/api/practice/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentPayload)
    });

    data = await res.json();
    console.log('Score:', data.score);
    console.log('Hire Probability:', data.clearerRewrite?.hireProbabilityEstimate);
    console.log('\nWhat Worked:');
    data.whatWorked.forEach(w => console.log('  -', w));
    console.log('\nImprove Next:');
    data.improveNext.forEach(i => console.log('  -', i));
    console.log('\nInterpretation:', data.interpretation);
    console.log('\nVocabulary (first 2):');
    data.vocabulary.slice(0, 2).forEach(v => console.log(`  - ${v.word}: ${v.definition}`));

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETE');
    console.log('='.repeat(60));
}

testIntelligentFeedback();
