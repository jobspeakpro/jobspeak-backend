// jobspeak-backend/routes/dailyTip.js
import express from "express";

const router = express.Router();

// Daily tips pool - deterministic rotation
const DAILY_TIPS = [
    "Practice the STAR method: Situation, Task, Action, Result. It's the gold standard for behavioral interviews.",
    "Research the company's recent news and achievements. Mention them naturally in your answers.",
    "Prepare 2-3 questions to ask the interviewer. It shows genuine interest and engagement.",
    "Use specific numbers and metrics when describing your achievements. Quantify your impact.",
    "Practice your elevator pitch. You should be able to introduce yourself confidently in 60 seconds.",
    "Mirror the interviewer's energy level. It builds rapport and makes the conversation flow naturally.",
    "Prepare examples of failures and what you learned. It shows self-awareness and growth mindset.",
    "Research the interviewer on LinkedIn if possible. Find common ground or shared interests.",
    "Practice saying 'I don't know, but here's how I'd find out.' Honesty beats guessing.",
    "Dress slightly more formal than the company culture. It's better to be overdressed than underdressed.",
    "Arrive 10-15 minutes early for in-person interviews. Use the time to observe the office culture.",
    "Prepare a 30-60-90 day plan for the role. It demonstrates initiative and strategic thinking.",
    "Use the 'pause and think' technique. It's okay to take 3-5 seconds before answering tough questions.",
    "Prepare stories that showcase different skills. Don't reuse the same example for multiple questions.",
    "End with enthusiasm. Your closing statement should reinforce why you're excited about the opportunity.",
    "Follow up within 24 hours with a personalized thank-you email. Reference specific conversation points.",
    "Practice your answers out loud, not just in your head. Speaking reveals gaps in your preparation.",
    "Prepare for 'Tell me about yourself' by focusing on: past experience, current situation, future goals.",
    "Research the role's key challenges. Prepare ideas on how you'd approach solving them.",
    "Bring a portfolio or work samples if relevant. Visual proof of your work makes a strong impression.",
    "Practice active listening. Repeat key points back to show you understood the question.",
    "Prepare salary expectations based on market research. Know your minimum acceptable offer.",
    "Have a backup plan for technical difficulties in virtual interviews. Test your setup beforehand.",
    "Prepare examples of cross-functional collaboration. Most roles require working with other teams.",
    "Research the company's values and culture. Align your answers with what they prioritize.",
    "Prepare for 'Why are you leaving your current role?' Focus on growth, not negativity.",
    "Practice your body language. Maintain eye contact, sit up straight, and use hand gestures naturally.",
    "Prepare questions about team dynamics and management style. Culture fit matters as much as skills.",
    "Have a clear narrative for career gaps or transitions. Frame them as intentional choices.",
    "End every answer with impact. Don't just describe what you did—explain the results you achieved.",
];

// GET /api/daily-tip
router.get("/daily-tip", (req, res) => {
    try {
        // Get current date in UTC
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
        const diff = now - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);

        // Deterministic selection: same tip for everyone on same day
        const tipIndex = dayOfYear % DAILY_TIPS.length;
        const tip = DAILY_TIPS[tipIndex];

        // Return tip with date for cache validation
        const date = now.toISOString().split('T')[0]; // YYYY-MM-DD

        return res.json({
            tip,
            date,
        });
    } catch (error) {
        console.error("Error fetching daily tip:", error);
        return res.status(500).json({ error: "Failed to fetch daily tip" });
    }
});

export default router;
