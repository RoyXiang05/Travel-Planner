import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Lazy initialization of Gemini AI
let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV });
});

// API Route: AI Route Planning
app.post("/api/plan", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("AI Planning Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate plan" });
  }
});

// API Route: AI Event Search
app.post("/api/events", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("AI Event Error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch events" });
  }
});

app.get("/api/poi/status", (req, res) => {
  res.json({
    lastUpdate: new Date().toISOString(),
    status: "Synced with GeoRoute Hub",
    count: 42
  });
});

// Setup Vite or Static
async function setupVite() {
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.VERCEL !== "1") {
    // Only serve static files locally if not on Vercel
    const distPath = path.resolve(__dirname, "..", "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
}

// Start listener for non-Vercel environments
if (process.env.VERCEL !== "1") {
  const PORT = Number(process.env.PORT) || 3000;
  setupVite().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  });
}
// Note: setupVite is not needed on Vercel because static files are handled by vercel.json

export default app;
