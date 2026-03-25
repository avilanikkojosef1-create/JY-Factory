import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  // 1. Request Logging (helps debugging in Cloud Run)
  app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
  });

  // 2. Health Check Endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      env: process.env.NODE_ENV, 
      port: PORT,
      dirname: __dirname,
      distExists: fs.existsSync(path.join(__dirname, 'dist'))
    });
  });

  // 3. Determine Environment
  // We now strictly rely on NODE_ENV set in package.json scripts
  const isProduction = process.env.NODE_ENV === "production";
  console.log(`Starting in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

  if (!isProduction) {
    // Development Mode (Vite)
    console.log("Initializing Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode (Serve built files)
    const distPath = path.join(__dirname, 'dist');
    
    if (!fs.existsSync(distPath)) {
      console.error(`[FATAL ERROR] dist folder not found at ${distPath}. Build step may have failed.`);
    } else {
      console.log(`[OK] Serving static files from ${distPath}`);
    }

    // Serve static files (js, css, images)
    app.use(express.static(distPath));
    
    // SPA Fallback: Any unknown route gets index.html
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        // Prevent browser from caching index.html so it always gets the latest JS file hashes
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(indexPath);
      } else {
        console.error(`[FATAL ERROR] index.html not found at ${indexPath}`);
        res.status(500).send(`Error: index.html not found. Did the build complete?`);
      }
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
