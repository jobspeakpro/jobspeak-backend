// Test live endpoint session rotation
const testSessionId = `test-session-${Date.now()}`;

console.log('Testing live endpoint with sessionId...\n');

// Test 1: Request without sessionId (backend should generate one)
console.log('Test 1: Request without sessionId');
const response1 = await fetch('http://127.0.0.1:3000/api/mock-interview/questions?type=short');
const data1 = await response1.json();
console.log(`  Generated sessionId: ${data1.sessionId}`);
console.log(`  Questions: ${data1.questions.length}`);
console.log(`  Interviewer: ${data1.interviewer.name} (${data1.interviewer.voiceId})`);

// Test 2: Request with same sessionId (should return same questions)
console.log('\nTest 2: Request with same sessionId');
const response2a = await fetch(`http://127.0.0.1:3000/api/mock-interview/questions?type=short&sessionId=${testSessionId}`);
const data2a = await response2a.json();
const questions2a = data2a.questions.map(q => q.id).join(',');

const response2b = await fetch(`http://127.0.0.1:3000/api/mock-interview/questions?type=short&sessionId=${testSessionId}`);
const data2b = await response2b.json();
const questions2b = data2b.questions.map(q => q.id).join(',');

if (questions2a === questions2b) {
    console.log('  ✅ Same sessionId returns same questions');
    console.log(`  SessionId: ${testSessionId}`);
    console.log(`  Questions: ${questions2a.substring(0, 60)}...`);
} else {
    console.log('  ❌ FAIL: Same sessionId returned different questions');
}

// Test 3: Request with different sessionId (should return different questions)
console.log('\nTest 3: Request with different sessionId');
const testSessionId2 = `test-session-${Date.now() + 1000}`;
const response3 = await fetch(`http://127.0.0.1:3000/api/mock-interview/questions?type=short&sessionId=${testSessionId2}`);
const data3 = await response3.json();
const questions3 = data3.questions.map(q => q.id).join(',');

if (questions2a !== questions3) {
    console.log('  ✅ Different sessionId returns different questions');
    console.log(`  Session 1: ${testSessionId}`);
    console.log(`  Session 2: ${testSessionId2}`);
} else {
    console.log('  ❌ FAIL: Different sessionId returned same questions');
}

console.log('\n✅ Live endpoint tests complete!');
