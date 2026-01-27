// jobspeak-backend/services/openaiService.js
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

let client;

try {
  if (process.env.OPENAI_API_KEY) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  } else {
    console.warn(
      "⚠️ OPENAI_API_KEY is not set. OpenAI calls will fall back to simple rewriting."
    );
  }
} catch (err) {
  console.error("Failed to initialize OpenAI client:", err.message);
}

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
  response_format,
}) {
  if (!prompt || !prompt.trim()) {
    throw new Error("Missing prompt for askGPT");
  }

  // Safety check: if client failed to init or key missing
  if (!client) {
    console.warn("askGPT called without active OpenAI client. Returning prompt as-is.");
    return prompt;
  }

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      response_format,
      temperature: 0.7,
    });

    const message = completion.choices?.[0]?.message?.content || "";
    return message.trim();
  } catch (err) {
    console.error("askGPT error:", err);
    // If it's an API error (401/429), maybe we should just return prompt too?
    // For now, rethrow to let caller handle (or fall back)
    throw err;
  }
}
