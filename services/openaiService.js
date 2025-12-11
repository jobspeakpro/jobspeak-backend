// jobspeak-backend/services/openaiService.js
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "⚠️ OPENAI_API_KEY is not set in .env. OpenAI calls will fall back to simple rewriting."
  );
}

// Create OpenAI client with API key from .env
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * askGPT
 * Simple helper to send a prompt to OpenAI and get back text.
 *
 * @param {Object} options
 * @param {string} options.prompt - user content
 * @param {string} [options.systemPrompt] - system role instructions
 * @param {string} [options.model] - model name
 * @returns {Promise<string>} - response text
 */
export async function askGPT({
  prompt,
  systemPrompt = "You are an AI English interview coach helping ESL job seekers sound clear and confident.",
  model = "gpt-4o-mini",
}) {
  if (!prompt || !prompt.trim()) {
    throw new Error("Missing prompt for askGPT");
  }

  if (!process.env.OPENAI_API_KEY) {
    // Fallback: just return the prompt if no key (we won't actually use this in ai.js)
    console.warn("askGPT called without OPENAI_API_KEY. Returning prompt as-is.");
    return prompt;
  }

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const message = completion.choices?.[0]?.message?.content || "";
    return message.trim();
  } catch (err) {
    console.error("askGPT error:", err);
    throw err;
  }
}
