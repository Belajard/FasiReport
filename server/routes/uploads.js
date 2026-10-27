import { Router } from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { badRequest } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";

fs.mkdirSync(config.uploadDir, { recursive: true });

const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    // Nama file diacak; ekstensi ditentukan dari mimetype yang diizinkan, bukan dari nama asli
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(badRequest("Format foto harus JPG, PNG, WEBP, atau GIF.")),
});

const router = Router();

router.post("/", requireAuth, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err?.code === "LIMIT_FILE_SIZE") return next(badRequest(`Ukuran foto maksimal ${config.maxUploadMb}MB.`));
    if (err) return next(err);
    if (!req.file) return next(badRequest("Pilih file foto terlebih dahulu."));
    res.status(201).json({ url: `/uploads/${path.basename(req.file.filename)}` });
  });
});

export default router;
