import axios from "axios";

const geminiResponse = async (command, assistantName, userName) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_MODEL = process.env.GEMINI_MODEL;

  if (!GEMINI_API_KEY || !GEMINI_MODEL) {
    console.error("❌ Gemini API credentials missing");
    return "Configuration error: missing API key or model.";
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `
You are ${assistantName}, a helpful and intelligent virtual assistant created by ${userName}.
Your goal is to answer the user's question clearly, logically, and conversationally.
Always reason through the question before answering, and explain your thought process naturally.
Avoid robotic responses and unnecessary JSON or markdown unless asked.
The user said: "${command}"
`;

  let retries = 2;

  while (retries >= 0) {
    try {
      const response = await axios.post(apiUrl, {
        contents: [{ parts: [{ text: prompt }] }],
      });

      const text =
        response?.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (text && text.length > 0) return text;

      throw new Error("Empty response from Gemini API");
    } catch (error) {
      console.error("⚠️ Gemini Error:", error.message);
      if (retries === 0)
        return "Sorry, there was a temporary issue connecting to the assistant. Please try again.";
      await new Promise((res) => setTimeout(res, 800)); // wait before retry
      retries--;
    }
  }
};

export default geminiResponse;
