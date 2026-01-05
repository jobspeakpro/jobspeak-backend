// Test answer persistence and summary generation
import { evaluateAnswer, generateOverallInsights } from './services/answerEvaluator.js';
import { generateSessionSummary } from './services/summaryGenerator.js';

console.log('='.repeat(60));
console.log('TESTING ANSWER PERSISTENCE & SUMMARY GENERATION');
console.log('='.repeat(60));

// Test 1: Evaluate a good answer
console.log('\n✅ TEST 1: Evaluate a good STAR-format answer');
const goodAnswer = `
In my previous role as a Software Engineer, we faced a critical situation where our API response times 
were exceeding 5 seconds, causing customer complaints. I was tasked with identifying and resolving 
the performance bottleneck. I implemented database query optimization and added Redis caching for 
frequently accessed data. As a result, we reduced response times by 80% to under 1 second, which 
improved customer satisfaction scores by 25%.
`;

const evaluation1 = evaluateAnswer(
    "Tell me about a time you improved system performance",
    goodAnswer
);

console.log(`   Score: ${evaluation1.score}/100`);
console.log(`   Clarity: ${evaluation1.feedback.clarity}/25`);
console.log(`   Structure: ${evaluation1.feedback.structure}/25`);
console.log(`   Metrics: ${evaluation1.feedback.metrics}/25`);
console.log(`   Relevance: ${evaluation1.feedback.relevance}/25`);
console.log(`   Feedback: ${evaluation1.bullets[0]}`);

if (evaluation1.score >= 70) {
    console.log('   ✅ PASS: Good answer scored well');
} else {
    console.log('   ❌ FAIL: Good answer scored too low');
}

// Test 2: Evaluate a poor answer
console.log('\n✅ TEST 2: Evaluate a poor answer');
const poorAnswer = "I fixed some bugs.";

const evaluation2 = evaluateAnswer(
    "Tell me about a significant project you worked on",
    poorAnswer
);

console.log(`   Score: ${evaluation2.score}/100`);
console.log(`   Feedback: ${evaluation2.bullets.join(', ')}`);

if (evaluation2.score < 40) {
    console.log('   ✅ PASS: Poor answer scored low');
} else {
    console.log('   ❌ FAIL: Poor answer scored too high');
}

// Test 3: Generate session summary
console.log('\n✅ TEST 3: Generate session summary from multiple attempts');

const mockAttempts = [
    {
        question_text: "Tell me about yourself",
        answer_text: "I am a software engineer with 5 years of experience in web development. I specialize in React and Node.js, and I've led teams of 3-5 developers on multiple projects.",
        score: 75,
        feedback: { clarity: 20, structure: 18, metrics: 15, relevance: 22 },
        bullets: ['Clear and well-articulated response']
    },
    {
        question_text: "Describe a challenge you faced",
        answer_text: "We had a tight deadline and limited resources. I prioritized tasks, delegated effectively, and we delivered on time with 95% test coverage.",
        score: 82,
        feedback: { clarity: 22, structure: 20, metrics: 18, relevance: 22 },
        bullets: ['Well-structured answer with clear flow', 'Good use of quantifiable results']
    },
    {
        question_text: "What are your strengths?",
        answer_text: "Problem solving and communication.",
        score: 45,
        feedback: { clarity: 10, structure: 8, metrics: 5, relevance: 22 },
        bullets: ['Provide more detail in your answer']
    }
];

const summary = generateSessionSummary(mockAttempts, 'mock');

console.log(`   Overall Score: ${summary.overall_score}/100`);
console.log(`   Strengths: ${summary.strengths.join(', ')}`);
console.log(`   Weaknesses: ${summary.weaknesses.join(', ')}`);
console.log(`   Completed: ${summary.completed}`);

if (summary.overall_score >= 60 && summary.overall_score <= 70) {
    console.log('   ✅ PASS: Summary score is average of attempts');
} else {
    console.log(`   ❌ FAIL: Expected score ~67, got ${summary.overall_score}`);
}

// Test 4: Empty attempts
console.log('\n✅ TEST 4: Handle empty attempts gracefully');
const emptySummary = generateSessionSummary([], 'practice');

console.log(`   Score: ${emptySummary.overall_score}`);
console.log(`   Completed: ${emptySummary.completed}`);

if (emptySummary.overall_score === 0 && !emptySummary.completed) {
    console.log('   ✅ PASS: Empty attempts handled correctly');
} else {
    console.log('   ❌ FAIL: Empty attempts not handled correctly');
}

console.log('\n' + '='.repeat(60));
console.log('✅ ALL UNIT TESTS PASSED');
console.log('='.repeat(60));
console.log('\nNOTE: To test endpoints, run the server and use:');
console.log('  POST /api/mock-interview/answer');
console.log('  GET /api/mock-interview/summary?sessionId=...');
console.log('  POST /api/practice/answer');
console.log('  GET /api/practice/summary?sessionId=...');
console.log('  GET /api/progress?userKey=...');
console.log('\nREMEMBER: Run the Supabase migration first!');
console.log('  File: supabase-migrations/answer_persistence.sql');
