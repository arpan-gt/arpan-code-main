import uploadOnCloudinary from "../config/cloudinary.js";
import geminiResponse from "../gemini.js";
import User from "../models/user.model.js";
import moment from "moment";

// ✅ Get Current User
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(400).json({ message: "User not found" });

    return res.status(200).json(user);
  } catch (error) {
    console.error("getCurrentUser Error:", error);
    return res.status(500).json({ message: "Error while fetching user" });
  }
};

// ✅ Update Assistant
export const updateAssistant = async (req, res) => {
  try {
    const { assistantName, imageUrl } = req.body;
    let assistantImage;

    if (req.file) {
      assistantImage = await uploadOnCloudinary(req.file.path);
    } else {
      assistantImage = imageUrl;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { assistantName, assistantImage },
      { new: true }
    ).select("-password");

    return res.status(200).json(user);
  } catch (error) {
    console.error("updateAssistant Error:", error);
    return res.status(500).json({ message: "Error updating assistant info" });
  }
};

// ✅ Main: Ask To Assistant (Now handles Technical Qs + Math + Date/Time)
export const askToAssistant = async (req, res) => {
  try {
    const { command } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(400).json({ response: "User not found" });

    // Save query in user history
    user.history.push(command);
    await user.save();

    const userName = user.name;
    const assistantName = user.assistantName || "AI Assistant";

    // 👉 Step 1: Try evaluating if it's a math expression
    // e.g., "5 + 10", "20% of 400", "square root of 16"
    const mathResult = evaluateMath(command);
    if (mathResult !== null) {
      return res.json({
        type: "calculation",
        response: `The result is ${mathResult}`,
      });
    }

    // 👉 Step 2: Otherwise, ask Gemini for general/technical answers
    const result = await geminiResponse(command, assistantName, userName);

    // Try extracting structured JSON (if Gemini returns structured output)
    const jsonMatch = result.match(/{[\s\S]*}/);
    if (jsonMatch) {
      const gemResult = JSON.parse(jsonMatch[0]);
      const type = gemResult.type;

      switch (type) {
        case "get-date":
          return res.json({
            type,
            response: `Current date is ${moment().format("YYYY-MM-DD")}`,
          });
        case "get-time":
          return res.json({
            type,
            response: `Current time is ${moment().format("hh:mm A")}`,
          });
        case "get-day":
          return res.json({
            type,
            response: `Today is ${moment().format("dddd")}`,
          });
        case "get-month":
          return res.json({
            type,
            response: `This month is ${moment().format("MMMM")}`,
          });
        default:
          return res.json({
            type: "general",
            response:
              gemResult.response ||
              "I'm not completely sure, but I’ll try to find a more accurate answer next time.",
          });
      }
    } else {
      return res.json({
        type: "general",
        response: result || "Sorry, I couldn't find an answer to that.",
      });
    }
  } catch (error) {
    console.error("askToAssistant Error:", error);
    return res.status(500).json({ response: "Error processing your request" });
  }
};

// 🧮 Utility: Evaluate basic math expressions safely
function evaluateMath(command) {
  try {
    let expr = command.toLowerCase().trim();

    // Handle simple phrases
    expr = expr
      .replace(/what is|calculate|find|result of|solve/g, "")
      .replace(/plus/g, "+")
      .replace(/minus/g, "-")
      .replace(/times|into|multiply|multiplied by/g, "*")
      .replace(/divide|divided by|over/g, "/")
      .replace(/power of|to the power of/g, "**")
      .replace(/square root of/g, "Math.sqrt")
      .replace(/% of/g, "*0.01*");

    // Prevent code injection: allow only numbers, operators, parentheses, and Math
    if (!/^[0-9+\-*/().\s^*%Mathsqrt]+$/.test(expr)) return null;

    // Evaluate safely using Function constructor sandbox
    const result = Function(`"use strict"; return (${expr})`)();

    if (isNaN(result)) return null;
    return Number(result.toFixed(4));
  } catch {
    return null;
  }
}
