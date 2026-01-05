// test_question_generation.js
// Verify personalized question generation for mock interviews and practice

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const TEST_USER_KEY = `test-questions-${Date.now()}`;

async function testQuestionGeneration() {
    console.log('=== Question Generation Verification ===\n');

    let passed = 0;
    let failed = 0;

    // Test 1: Mock Interview Questions - Short
    console.log('1. Testing short mock interview questions...');
    try {
        const res = await fetch(`${BASE_URL}/api/mock-interview/questions?userKey=${TEST_USER_KEY}&type=short`);
        const data = await res.json();

        if (!data.interviewer || !data.questions) {
            console.error('   ❌ Missing interviewer or questions');
            failed++;
        } else if (data.questions.length !== 5) {
            console.error(`   ❌ Expected 5 questions, got ${data.questions.length}`);
            failed++;
        } else {
            console.log(`   ✅ Interviewer: ${data.interviewer.name} (${data.interviewer.title})`);
            console.log(`   ✅ Voice ID: ${data.interviewer.voiceId}`);
            console.log(`   ✅ Questions: ${data.questions.length}`);
            console.log(`   ✅ Sample: "${data.questions[0].prompt.substring(0, 60)}..."`);
            passed++;
        }
    } catch (err) {
        console.error('   ❌ Error:', err.message);
        failed++;
    }

    // Test 2: Mock Interview Questions - Long
    console.log('\n2. Testing long mock interview questions...');
    try {
        const res = await fetch(`${BASE_URL}/api/mock-interview/questions?userKey=${TEST_USER_KEY}&type=long`);
        const data = await res.json();

        if (data.questions.length !== 10) {
            console.error(`   ❌ Expected 10 questions, got ${data.questions.length}`);
            failed++;
        } else {
            console.log(`   ✅ Questions: ${data.questions.length}`);
            passed++;
        }
    } catch (err) {
        console.error('   ❌ Error:', err.message);
        failed++;
    }

    // Test 3: Question Structure
    console.log('\n3. Testing question structure...');
    try {
        const res = await fetch(`${BASE_URL}/api/mock-interview/questions?userKey=${TEST_USER_KEY}&type=short`);
        const data = await res.json();

        const firstQuestion = data.questions[0];
        const hasRequiredFields =
            firstQuestion.id &&
            firstQuestion.category &&
            firstQuestion.difficulty &&
            firstQuestion.prompt &&
            firstQuestion.hint;

        if (!hasRequiredFields) {
            console.error('   ❌ Question missing required fields');
            console.log('   Question:', firstQuestion);
            failed++;
        } else {
            console.log(`   ✅ ID: ${firstQuestion.id}`);
            console.log(`   ✅ Category: ${firstQuestion.category}`);
            console.log(`   ✅ Difficulty: ${firstQuestion.difficulty}`);
            console.log(`   ✅ Has hint: ${firstQuestion.hint ? 'Yes' : 'No'}`);
            passed++;
        }
    } catch (err) {
        console.error('   ❌ Error:', err.message);
        failed++;
    }

    // Test 4: Practice Demo Questions
    console.log('\n4. Testing practice demo questions...');
    try {
        const res = await fetch(`${BASE_URL}/api/practice/demo-questions?jobTitle=Software Engineer&industry=Technology&seniority=Senior`);
        const data = await res.json();

        if (!data.questions || data.questions.length < 3 || data.questions.length > 5) {
            console.error(`   ❌ Expected 3-5 questions, got ${data.questions?.length || 0}`);
            failed++;
        } else {
            console.log(`   ✅ Questions: ${data.questions.length}`);
            console.log(`   ✅ Sample: "${data.questions[0].prompt.substring(0, 60)}..."`);
            passed++;
        }
    } catch (err) {
        console.error('   ❌ Error:', err.message);
        failed++;
    }

    // Test 5: Practice Demo Questions - Personalization
    console.log('\n5. Testing practice demo personalization...');
    try {
        const res = await fetch(`${BASE_URL}/api/practice/demo-questions?jobTitle=Product Manager&focusAreas=leadership,behavioral`);
        const data = await res.json();

        const hasPersonalization = data.questions.some(q =>
            q.prompt.toLowerCase().includes('product manager') ||
            q.category === 'leadership' ||
            q.category === 'behavioral'
        );

        if (!hasPersonalization) {
            console.error('   ❌ Questions not personalized');
            failed++;
        } else {
            console.log('   ✅ Questions personalized for Product Manager');
            console.log(`   ✅ Categories: ${data.questions.map(q => q.category).join(', ')}`);
            passed++;
        }
    } catch (err) {
        console.error('   ❌ Error:', err.message);
        failed++;
    }

    // Test 6: Daily Rotation (same day = same questions)
    console.log('\n6. Testing daily rotation consistency...');
    try {
        const res1 = await fetch(`${BASE_URL}/api/mock-interview/questions?userKey=${TEST_USER_KEY}&type=short`);
        const data1 = await res1.json();

        // Wait a moment and fetch again
        await new Promise(resolve => setTimeout(resolve, 100));

        const res2 = await fetch(`${BASE_URL}/api/mock-interview/questions?userKey=${TEST_USER_KEY}&type=short`);
        const data2 = await res2.json();

        const sameQuestions = data1.questions.every((q, i) => q.id === data2.questions[i].id);

        if (!sameQuestions) {
            console.error('   ❌ Questions changed within same day');
            failed++;
        } else {
            console.log('   ✅ Questions consistent for same day');
            passed++;
        }
    } catch (err) {
        console.error('   ❌ Error:', err.message);
        failed++;
    }

    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed === 0) {
        console.log('\n✅ ALL TESTS PASSED');
        process.exit(0);
    } else {
        console.log('\n❌ SOME TESTS FAILED');
        process.exit(1);
    }
}

testQuestionGeneration().catch(err => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
});
