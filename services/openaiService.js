import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function askGPT(prompt, json = false) {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      response_format: json ? { type: "json_object" } : undefined
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("GPT ERROR:", error);
    return "Error generating response.";
  }
}
