import dotenv from "dotenv";
import express, { Request, Response } from "express";
import path from "path";
import cors from "cors";
import axios from "axios";

dotenv.config();

// --- Imports ---
import { BASE_PROMPT, getSystemPrompt } from "./prompts.js";
import { basePrompt as nodeBasePrompt } from "./defaults/node.js";
import { basePrompt as reactBasePrompt } from "./defaults/react.js";

// --- ENV CHECK ---
if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("❌ OPENROUTER_API_KEY is missing in .env");
}

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

app.use(express.json({ limit: "11mb" }));
app.use(express.urlencoded({ extended: true, limit: "11mb" }));

// --- Headers (for WebContainer) ---
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});


// ✅ --- OpenRouter API FUNCTION ---
async function getAIResponse(messages: any[]) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct", // FREE + stable
        messages: messages
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Volt App"
        }
      }
    );

    return response.data.choices[0].message.content;

  } catch (error: any) {
    console.error("❌ OpenRouter FULL ERROR:", error.response?.data || error.message);
    throw new Error("AI request failed");
  }
}


// ================= ROUTES =================

// 🔹 TEMPLATE ROUTE
app.post("/template", async (req: Request, res: Response) => {
  const userPrompt = req.body.prompt;

  if (!userPrompt) {
    return res.status(400).json({ message: "Missing prompt" });
  }

  const systemInstruction =
    "Return either node or react based on what you think this project should be. Only return one word: node or react.";

  try {
    const aiResponse = await getAIResponse([
      { role: "user", content: `${systemInstruction}\n\n${userPrompt}` }
    ]);

    const answer = aiResponse.trim().toLowerCase();

    if (answer.includes("react")) {
      return res.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact...\n\n${reactBasePrompt}`
        ],
        uiPrompts: [reactBasePrompt],
      });
    }

    if (answer.includes("node")) {
      return res.json({
        prompts: [
          `Here is an artifact...\n\n${nodeBasePrompt}`
        ],
        uiPrompts: [nodeBasePrompt],
      });
    }

    return res.status(403).json({ message: "Unable to determine project type" });

  } catch (error: any) {
    console.error("❌ /template error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});


// 🔹 CHAT ROUTE
app.post("/chat", async (req: Request, res: Response) => {
  const messages = req.body.messages;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ message: "Invalid messages array" });
  }

  try {
    const aiResponse = await getAIResponse([
      { role: "system", content: getSystemPrompt() },
      ...messages
    ]);

    return res.json({ response: aiResponse });

  } catch (error: any) {
    console.error("❌ /chat error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});


// ================= FRONTEND =================

const staticPath = path.resolve(process.cwd(), "frontend", "dist");

app.use(express.static(staticPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(staticPath, "index.html"), (err) => {
    if (err) {
      res.status(500).send("Error loading frontend");
    }
  });
});



// ================= START =================

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
