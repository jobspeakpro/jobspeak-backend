// Demonstration of the updated summary response shape
// This shows the exact JSON structure returned by GET /mock-interview/summary

const sampleSummaryResponse = {
    "sessionId": "session-1767217700668-xel9s6",
    "attemptCount": 1,
    "overall_score": 75,
    "strengths": [
        "Clear and articulate communication",
        "Strong use of quantifiable results and metrics",
        "Answers directly address questions"
    ],
    "weaknesses": [
        "Practice using STAR format (Situation, Task, Action, Result)"
    ],
    "improvements": [
        "Practice using STAR format (Situation, Task, Action, Result)"
    ],
    "points_to_focus": [
        "Practice using STAR format (Situation, Task, Action, Result)"
    ],
    "risks": [],
    "biggest_risk": "Practice using STAR format (Situation, Task, Action, Result)",
    "biggestRisk": "Practice using STAR format (Situation, Task, Action, Result)",
    "bullets": [
        {
            "question": "Q1: Describe a challenging project you led....",
            "score": 75,
            "feedback": "Clear and well-articulated response"
        }
    ],
    "recommendation": "recommend_with_reservations",
    "completed": true,

    // ✅ NEW FIELDS - Both naming conventions for compatibility
    "hiring_manager_heard": "The answer was a bit messy, but the core skills seem to be there. I'd need to probe deeper to be sure.",
    "hiringManagerHeard": "The answer was a bit messy, but the core skills seem to be there. I'd need to probe deeper to be sure.",
    "improvedExample": "In a previous role, I led a team of 8 engineers to migrate our monolithic application to microservices."
};

console.log("═══════════════════════════════════════════════════════");
console.log("  MOCK INTERVIEW SUMMARY - RESPONSE SHAPE");
console.log("═══════════════════════════════════════════════════════\n");

console.log(JSON.stringify(sampleSummaryResponse, null, 2));

console.log("\n═══════════════════════════════════════════════════════");
console.log("  KEY FIELDS FOR FRONTEND");
console.log("═══════════════════════════════════════════════════════\n");

console.log("✅ hiringManagerHeard (camelCase):");
console.log(`   "${sampleSummaryResponse.hiringManagerHeard}"\n`);

console.log("✅ hiring_manager_heard (snake_case - backward compat):");
console.log(`   "${sampleSummaryResponse.hiring_manager_heard}"\n`);

console.log("✅ improvedExample:");
console.log(`   "${sampleSummaryResponse.improvedExample}"\n`);

console.log("Both values are identical:",
    sampleSummaryResponse.hiringManagerHeard === sampleSummaryResponse.hiring_manager_heard);
