import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. POI Status Update Simulation (PRD 3.4)
  // In a real app, this would be a real cron job or a trigger
  let poiLastUpdate = new Date().toISOString();
  
  app.get("/api/poi/status", (req, res) => {
    res.json({
      lastUpdate: poiLastUpdate,
      status: "Synced with Dubai 6:00 AM GST task",
      count: 42
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GeoRoute Explorer running at http://localhost:${PORT}`);
  });
}

startServer();
