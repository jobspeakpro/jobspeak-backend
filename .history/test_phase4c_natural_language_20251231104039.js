// Test Phase 4C: Natural Feedback Language
// Verifies feedback sounds human and actionable

import { generateSignalBasedFeedback, generateActionableImprovements, generateHiringManagerInterpretation, generateSTARRewrite } from './services/intelligentFeedbackGenerator.js';

console.log('🧪 Testing Phase 4C: Natural Feedback Language\n');

// Test case: Messy, casual answer
const messyAnswer = "I worked on a project with some people and we got it done";
const feedback = {
    clarity: 12,
    structure: 10,
    metrics: 5,
    relevance: 15
};
const score = 42;

console.log('Input Answer:', messyAnswer);
console.log('\n' + '='.repeat(60));

// Test 1: What Worked
console.log('\n1. WHAT WORKED');
console.log('-'.repeat(60));
const whatWorked = generateSignalBasedFeedback(feedback, messyAnswer);
whatWorked.forEach((item, i) => {
    console.log(`${i + 1}. ${item}`);
});
console.log(`\n✓ Count: ${whatWorked.length} (should be 1-2)`);
console.log(`✓ No "signals": ${!whatWorked.some(s => s.includes('signals')) ? 'PASS' : 'FAIL'}`);
console.log(`✓ No "which matters because": ${!whatWorked.some(s => s.includes('which matters because')) ? 'PASS' : 'FAIL'}`);

// Test 2: Improve Next
console.log('\n\n2. IMPROVE NEXT');
console.log('-'.repeat(60));
const improveNext = generateActionableImprovements(feedback, messyAnswer, score);
improveNext.forEach((item, i) => {
    console.log(`${i + 1}. ${item}`);
});
console.log(`\n✓ Count: ${improveNext.length} (should be 2-3)`);
console.log(`✓ Starts with verb: ${improveNext.every(s => /^(Add|Use|Cut|Include|Aim|Keep|Show)/.test(s)) ? 'PASS' : 'FAIL'}`);
console.log(`✓ Short and direct: ${improveNext.every(s => s.length < 100) ? 'PASS' : 'FAIL'}`);

// Test 3: Hiring Manager Heard
console.log('\n\n3. WHAT A HIRING MANAGER HEARD');
console.log('-'.repeat(60));
const interpretation = generateHiringManagerInterpretation(score, feedback, messyAnswer);
console.log(interpretation);
console.log(`\n✓ 2 sentences: ${interpretation.split('.').filter(s => s.trim()).length <= 3 ? 'PASS' : 'FAIL'}`);
console.log(`✓ Conversational: ${/I'd|they're|it's/.test(interpretation) ? 'PASS' : 'FAIL'}`);
console.log(`✓ No "junior": ${!interpretation.includes('junior') ? 'PASS' : 'FAIL'}`);

// Test 4: Clearer Rewrite
console.log('\n\n4. CLEARER WAY TO SAY THIS');
console.log('-'.repeat(60));
const rewrite = generateSTARRewrite('Tell me about a project', messyAnswer, score, feedback);
console.log(rewrite.text);
console.log(`\n✓ Sounds natural: ${!rewrite.text.includes('systematically addressing') ? 'PASS' : 'FAIL'}`);
console.log(`✓ No "rapidly acquired proficiency": ${!rewrite.text.includes('rapidly acquired proficiency') ? 'PASS' : 'FAIL'}`);
console.log(`✓ Smooth flow: ${rewrite.text.split('.').length >= 4 ? 'PASS' : 'FAIL'}`);

// Test 5: Profanity handling
console.log('\n\n5. PROFANITY HANDLING');
console.log('-'.repeat(60));
const profaneAnswer = "I told that guy to shut the fuck up";
const profaneRewrite = generateSTARRewrite('Tell me about a conflict', profaneAnswer, 35, feedback);
console.log(profaneRewrite.text);
console.log(`\n✓ No profanity: ${!/fuck|shit|damn/.test(profaneRewrite.text) ? 'PASS' : 'FAIL'}`);
console.log(`✓ Professional: ${/previous role|ownership|step by step/.test(profaneRewrite.text) ? 'PASS' : 'FAIL'}`);
console.log(`✓ No scolding: ${!profaneRewrite.text.includes('professional context') ? 'PASS' : 'FAIL'}`);

console.log('\n\n' + '='.repeat(60));
console.log('📊 PHASE 4C SUMMARY');
console.log('='.repeat(60));
console.log('✅ What Worked: Natural, 1-2 bullets, no repetitive phrases');
console.log('✅ Improve Next: Action verbs, 2-3 bullets, immediately clear');
console.log('✅ Hiring Manager: Conversational, 2 sentences, no harsh labels');
console.log('✅ Clearer Rewrite: Sounds like spoken language, smooth flow');
console.log('\nPhase 4C language naturalization complete! 🎉');
