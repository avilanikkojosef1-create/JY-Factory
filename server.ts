import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', env: process.env.NODE_ENV, port: process.env.PORT });
  });

  // Cloud Run provides the PORT environment variable (usually 8080).
  // AI Studio preview requires the app to listen on port 3000.
  // Using process.env.PORT || 3000 ensures compatibility with both environments.
  const PORT = process.env.PORT || 3000;
  // Default to production if PORT is set (standard for Cloud Run) 
  // unless NODE_ENV is explicitly set to something else.
  const isProduction = process.env.NODE_ENV === "production" || (!!process.env.PORT && process.env.NODE_ENV !== "development");

  console.log(`Starting server in ${isProduction ? 'production' : 'development'} mode...`);
  console.log(`Environment: PORT=${process.env.PORT}, NODE_ENV=${process.env.NODE_ENV}`);

  // Vite middleware for development
  if (!isProduction) {
    console.log("Initializing Vite middleware...");
    // Dynamic import to avoid loading Vite in production where it is pruned
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the static files from the dist directory
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`Serving static files from: ${distPath}`);
    
    app.use(express.static(distPath));
    
    // Fallback to index.html for SPA routing
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`Error sending index.html from ${indexPath}:`, err);
          res.status(500).send("Internal Server Error: index.html not found. Did you run 'npm run build'?");
        }
      });
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
