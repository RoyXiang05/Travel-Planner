import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV });
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
