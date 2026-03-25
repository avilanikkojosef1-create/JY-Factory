import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      env: process.env.NODE_ENV, 
      port: process.env.PORT,
      cwd: process.cwd(),
      dirname: __dirname,
      distExists: fs.existsSync(path.resolve(process.cwd(), 'dist'))
    });
  });

  const PORT = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === "production" || (!!process.env.PORT && process.env.NODE_ENV !== "development");

  console.log(`Starting server in ${isProduction ? 'production' : 'development'} mode...`);
  console.log(`Environment: PORT=${process.env.PORT}, NODE_ENV=${process.env.NODE_ENV}`);

  if (!isProduction) {
    console.log("Initializing Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the static files from the dist directory
    const distPath = path.resolve(process.cwd(), 'dist');
    console.log(`Serving static files from: ${distPath}`);
    
    if (fs.existsSync(distPath)) {
      console.log('Dist folder contents:', fs.readdirSync(distPath));
      const assetsPath = path.join(distPath, 'assets');
      if (fs.existsSync(assetsPath)) {
        console.log('Assets folder contents:', fs.readdirSync(assetsPath));
      } else {
        console.warn('Assets folder NOT found inside dist');
      }
    } else {
      console.error('CRITICAL: Dist folder NOT found at:', distPath);
    }

    // Explicitly serve /assets folder to be safe
    app.use('/assets', express.static(path.join(distPath, 'assets')));
    
    // Serve the rest of the static files
    app.use(express.static(distPath));
    
    // Log requests for assets that missed the static middleware
    app.use((req, res, next) => {
      if (req.url.startsWith('/assets/') || req.url.endsWith('.js') || req.url.endsWith('.css')) {
        console.error(`Asset 404: ${req.url} - This will cause a MIME type error in the browser.`);
      }
      next();
    });

    // Fallback to index.html for SPA routing
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (!fs.existsSync(indexPath)) {
        console.error(`CRITICAL: index.html not found at ${indexPath}`);
        return res.status(500).send("Internal Server Error: index.html not found.");
      }
      res.sendFile(indexPath);
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
