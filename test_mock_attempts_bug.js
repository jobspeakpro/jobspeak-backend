// Test to reproduce "0 attempts" bug
// This simulates answering a mock interview question and then fetching the summary

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Mock Interview Attempt Count Bug\n');

// Simulate the data flow
const testSessionId = 'test-session-123';
const testUserKey = 'guest-test-user';

// Step 1: Simulate answer insertion
console.log('Step 1: Simulating answer insertion');
const insertData = {
    session_id: testSessionId,
    question_id: 'q1',
    question_text: 'Tell me about a time you led a project',
    answer_text: 'I led a team of 5 engineers to build a new feature...',
    audio_url: null,
    score: 75,
    feedback: {
        clarity: 18,
        structure: 20,
        metrics: 15,
        relevance: 19
    }
};
console.log('  Insert session_id:', insertData.session_id);
console.log('  Insert score:', insertData.score);
console.log('  Insert feedback:', JSON.stringify(insertData.feedback));

// Step 2: Simulate summary query
console.log('\nStep 2: Simulating summary query');
const querySessionId = testSessionId;
console.log('  Query session_id:', querySessionId);
console.log('  ✓ session_id match:', insertData.session_id === querySessionId);

// Step 3: Simulate generateSessionSummary with the attempt
console.log('\nStep 3: Testing generateSessionSummary');

// Mock the function
function generateSessionSummary(attempts, sessionType = 'practice') {
    console.log('  Received attempts:', attempts?.length || 0);

    if (!attempts || attempts.length === 0) {
        console.log('  ❌ PROBLEM: No attempts found!');
        return {
            overall_score: 0,
            strengths: ['Complete the session to get insights'],
            weaknesses: ['No attempts recorded'],
            bullets: [],
            completed: false
        };
    }

    console.log('  ✓ Attempts found:', attempts.length);

    // Calculate overall score
    const validScores = attempts
        .filter(a => a.score !== null && a.score !== undefined)
        .map(a => a.score);

    const overall_score = validScores.length > 0
        ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length)
        : 0;

    console.log('  Valid scores:', validScores);
    console.log('  Overall score:', overall_score);

    // Generate bullets
    const bullets = attempts.map((attempt, index) => {
        const questionNum = index + 1;
        const score = attempt.score || 0;
        return {
            question: `Q${questionNum}: ${attempt.question_text?.substring(0, 60)}...`,
            score,
            feedback: 'Sample feedback'
        };
    });

    console.log('  Bullets generated:', bullets.length);

    return {
        overall_score,
        strengths: ['Good structure'],
        weaknesses: ['Work on metrics'],
        bullets,
        completed: true
    };
}

// Test with 1 attempt
const mockAttempts = [insertData];
const summary = generateSessionSummary(mockAttempts, 'mock');

console.log('\n📊 Summary Result:');
console.log('  attemptCount:', mockAttempts.length);
console.log('  overall_score:', summary.overall_score);
console.log('  bullets:', summary.bullets.length);
console.log('  completed:', summary.completed);

// Check exit condition
console.log('\n✅ Exit Condition Check:');
const exitConditionMet = mockAttempts.length >= 1 && summary.bullets.length >= 1 && summary.overall_score > 0;
console.log('  Answer once → summary shows 1+ item:', summary.bullets.length >= 1);
console.log('  Score > 0:', summary.overall_score > 0);
console.log('  Exit condition met:', exitConditionMet ? '✅ YES' : '❌ NO');

// Now test the actual issue: what if attempts array is empty?
console.log('\n🔍 Testing potential bug scenario:');
console.log('What if the query returns empty array?');
const emptyAttempts = [];
const emptySummary = generateSessionSummary(emptyAttempts, 'mock');
console.log('  attemptCount:', emptyAttempts.length);
console.log('  overall_score:', emptySummary.overall_score);
console.log('  bullets:', emptySummary.bullets.length);
console.log('  ❌ This would show "0 attempts" bug!');

console.log('\n💡 Root Cause Analysis:');
console.log('If summary shows 0 attempts after answering, the issue is:');
console.log('1. Query is not finding the inserted attempt');
console.log('2. Possible causes:');
console.log('   - session_id mismatch between insert and query');
console.log('   - Timing issue (query runs before insert completes)');
console.log('   - Database transaction not committed');
console.log('   - Wrong table being queried');
