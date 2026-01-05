// Test script to verify Sarah Jenkins voice assignment
import { generateMockInterviewQuestions } from './services/mockInterviewQuestions.js';

console.log('Testing Sarah Jenkins voice assignment...\n');

const result = generateMockInterviewQuestions('test-user', 'short', {
    job_title: 'Software Engineer',
    industry: 'Technology',
    seniority: 'Senior'
});

console.log('✅ Interviewer Details:');
console.log(`   Name: ${result.interviewer.name}`);
console.log(`   Title: ${result.interviewer.title}`);
console.log(`   Voice ID: ${result.interviewer.voiceId}`);
console.log(`   Language Code: ${result.interviewer.languageCode}`);
console.log(`\n✅ Generated ${result.questions.length} questions`);

// Verify Sarah Jenkins is using en-US-Studio-O
if (result.interviewer.name === 'Sarah Jenkins' && result.interviewer.voiceId === 'en-US-Studio-O') {
    console.log('\n✅ SUCCESS: Sarah Jenkins is correctly assigned voice en-US-Studio-O');
} else {
    console.log('\n❌ FAILED: Voice assignment incorrect');
    process.exit(1);
}
