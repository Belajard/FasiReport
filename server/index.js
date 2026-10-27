import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { pool } from "./db.js";
import { HttpError } from "./lib/http.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import facilityRoutes from "./routes/facilities.js";
import reportRoutes from "./routes/reports.js";
import maintenanceRoutes from "./routes/maintenance.js";
import vendorRoutes from "./routes/vendors.js";
import notificationRoutes from "./routes/notifications.js";
import statsRoutes from "./routes/stats.js";
import auditRoutes from "./routes/audit.js";
import uploadRoutes from "./routes/uploads.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "blob:", "https:"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
        "script-src": ["'self'"],
        "connect-src": ["'self'"],
      },
    },
  }));
  app.use(cors({ origin: config.corsOrigin, credentials: false }));
  app.use(express.json({ limit: "200kb" }));
  app.use(rateLimit({ windowMs: 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test" }));

  app.use("/uploads", express.static(config.uploadDir, { maxAge: "7d", index: false }));

  app.get("/api/health", async (_req, res) => {
    try { await pool.query("SELECT 1"); res.json({ status: "ok", database: "connected" }); }
    catch { res.status(503).json({ status: "error", database: "unreachable" }); }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/facilities", facilityRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/maintenance", maintenanceRoutes);
  app.use("/api/vendors", vendorRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/audit", auditRoutes);
  app.use("/api/uploads", uploadRoutes);

  app.use("/api", (_req, _res, next) => next(new HttpError(404, "Endpoint tidak ditemukan.")));

  // Produksi: layani hasil `npm run build` (folder dist) dari server yang sama
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
  if (fs.existsSync(path.join(dist, "index.html"))) {
    app.use(express.static(dist, { index: false, maxAge: "1h" }));
    app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });
    if (err?.type === "entity.parse.failed") return res.status(400).json({ message: "Format JSON tidak valid." });
    if (err?.type === "entity.too.large") return res.status(413).json({ message: "Data terlalu besar." });
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  });
  return app;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  createApp().listen(config.port, () => console.log(`FasiReport API berjalan di http://localhost:${config.port}`));
}
