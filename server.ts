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
      dirname: __dirname
    });
  });

  const PORT = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === "production" || (!!process.env.PORT && process.env.NODE_ENV !== "development");

  console.log(`Starting server in ${isProduction ? 'production' : 'development'} mode...`);
  
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    console.log(`Checking for static files at: ${distPath}`);
    
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

    // Serve static files with explicit logging for 404s
    app.use(express.static(distPath, {
      fallthrough: true // Let it fall through to the SPA handler
    }));
    
    // Log specifically when an asset is requested but not found
    app.use((req, res, next) => {
      if (req.url.startsWith('/assets/') || req.url.endsWith('.js') || req.url.endsWith('.css')) {
        console.error(`Asset 404: ${req.url} - This will cause a MIME type error in the browser.`);
      }
      next();
    });

    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`Error sending index.html:`, err);
          res.status(500).send("Internal Server Error: index.html not found.");
        }
      });
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
