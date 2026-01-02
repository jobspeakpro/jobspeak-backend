// Test script to verify session-based question rotation
import { generateMockInterviewQuestions } from './services/personalizedQuestionSelector.js';

console.log('='.repeat(60));
console.log('TESTING SESSION-BASED QUESTION ROTATION');
console.log('='.repeat(60));

const testUserKey = 'test-user-rotation';
const testProfile = {
    jobTitle: 'Software Engineer',
    industry: 'Technology',
    seniority: 'Senior'
};

// Test 1: Same sessionId should return identical questions
console.log('\n✅ TEST 1: Same sessionId returns identical questions');
const sessionId1 = 'session-test-123';
const result1a = generateMockInterviewQuestions({
    userKey: testUserKey,
    type: 'short',
    sessionId: sessionId1,
    ...testProfile
});
const result1b = generateMockInterviewQuestions({
    userKey: testUserKey,
    type: 'short',
    sessionId: sessionId1,
    ...testProfile
});

const questions1a = result1a.questions.map(q => q.id).join(',');
const questions1b = result1b.questions.map(q => q.id).join(',');

if (questions1a === questions1b) {
    console.log('   ✅ PASS: Same sessionId returns same questions');
    console.log(`   Session: ${sessionId1}`);
    console.log(`   Questions: ${questions1a.substring(0, 50)}...`);
} else {
    console.log('   ❌ FAIL: Same sessionId returned different questions');
    process.exit(1);
}

// Test 2: Different sessionId should return different questions
console.log('\n✅ TEST 2: Different sessionId returns different questions');
const sessionId2 = 'session-test-456';
const result2 = generateMockInterviewQuestions({
    userKey: testUserKey,
    type: 'short',
    sessionId: sessionId2,
    ...testProfile
});

const questions2 = result2.questions.map(q => q.id).join(',');

if (questions1a !== questions2) {
    console.log('   ✅ PASS: Different sessionId returns different questions');
    console.log(`   Session 1: ${sessionId1}`);
    console.log(`   Questions 1: ${questions1a.substring(0, 50)}...`);
    console.log(`   Session 2: ${sessionId2}`);
    console.log(`   Questions 2: ${questions2.substring(0, 50)}...`);
} else {
    console.log('   ❌ FAIL: Different sessionId returned same questions');
    process.exit(1);
}

// Test 3: No sessionId should fall back to date-based rotation
console.log('\n✅ TEST 3: No sessionId falls back to date-based rotation');
const result3a = generateMockInterviewQuestions({
    userKey: testUserKey,
    type: 'short',
    sessionId: null,
    ...testProfile
});
const result3b = generateMockInterviewQuestions({
    userKey: testUserKey,
    type: 'short',
    sessionId: null,
    ...testProfile
});

const questions3a = result3a.questions.map(q => q.id).join(',');
const questions3b = result3b.questions.map(q => q.id).join(',');

if (questions3a === questions3b) {
    console.log('   ✅ PASS: No sessionId uses date-based rotation (same questions today)');
    console.log(`   Questions: ${questions3a.substring(0, 50)}...`);
} else {
    console.log('   ❌ FAIL: No sessionId returned different questions');
    process.exit(1);
}

// Test 4: Verify Sarah Jenkins interviewer
console.log('\n✅ TEST 4: Verify Sarah Jenkins interviewer with en-US-Studio-O');
if (result1a.interviewer.name === 'Sarah Jenkins' &&
    result1a.interviewer.voiceId === 'en-US-Studio-O' &&
    result1a.interviewer.languageCode === 'en-US') {
    console.log('   ✅ PASS: Sarah Jenkins correctly configured');
    console.log(`   Name: ${result1a.interviewer.name}`);
    console.log(`   Voice: ${result1a.interviewer.voiceId}`);
    console.log(`   Language: ${result1a.interviewer.languageCode}`);
} else {
    console.log('   ❌ FAIL: Interviewer configuration incorrect');
    process.exit(1);
}

console.log('\n' + '='.repeat(60));
console.log('✅ ALL TESTS PASSED - Session-based rotation working correctly!');
console.log('='.repeat(60));
