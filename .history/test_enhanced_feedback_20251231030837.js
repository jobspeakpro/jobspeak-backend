// Test enhanced hire-grade feedback system
const BASE_URL = 'http://127.0.0.1:3000';

async function testEnhancedFeedback() {
    console.log('='.repeat(60));
    console.log('TESTING ENHANCED HIRE-GRADE FEEDBACK');
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
    console.log('Hire Likelihood Before:', data.hireLikelihood);
    console.log('Hire Likelihood After Rewrite:', data.hireLikelihoodAfterRewrite);
    console.log('Why:', data.why);
    console.log('\nWhat Worked:');
    data.whatWorked.forEach(w => console.log('  -', w));
    console.log('\nImprove Next:');
    data.improveNext.forEach(i => console.log('  -', i));
    console.log('\nInterpretation:', data.interpretation);
    console.log('\nVocabulary (showing all):');
    data.vocabulary.forEach(v => console.log(`  - ${v.word} (${v.pos}): ${v.definition}`));
    console.log(`    Why it helps: ${data.vocabulary[0]?.whyItHelps}`);
    console.log('\nClearer Rewrite:', data.clearerRewrite?.substring(0, 100) + '...');

    // Test 2: Weak answer with profanity
    console.log('\n\n📋 TEST 2: Weak Answer with Profanity\n');
    const weakPayload = {
        userKey: `guest-${Date.now()}`,
        sessionId: `test-${Date.now()}`,
        questionId: 'q2',
        questionText: 'How do you handle difficult situations?',
        answerText: 'Man, this damn project was hell. I just did my best.'
    };

    res = await fetch(`${BASE_URL}/api/practice/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weakPayload)
    });

    data = await res.json();
    console.log('Score:', data.score);
    console.log('Hire Likelihood Before:', data.hireLikelihood);
    console.log('Hire Likelihood After:', data.hireLikelihoodAfterRewrite);
    console.log('Delta:', data.hireLikelihoodAfterRewrite - data.hireLikelihood);
    console.log('Why:', data.why);
    console.log('\nInterpretation:', data.interpretation);
    console.log('\nClearer Rewrite (profanity removed):', data.clearerRewrite);
    console.log('\nVocabulary count:', data.vocabulary.length);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETE');
    console.log('='.repeat(60));
}

testEnhancedFeedback();
