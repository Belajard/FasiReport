import { Router } from "express";
import multer from "multer";
import { config } from "../config.js";
import { query } from "../db.js";
import { badRequest, HttpError } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";

// Hanya format gambar yang diizinkan; file disimpan di tabel `uploads` (PostgreSQL), bukan di disk.
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.has(file.mimetype) ? cb(null, true) : cb(badRequest("Format foto harus JPG, PNG, WEBP, atau GIF.")),
});

const router = Router();

router.post("/", requireAuth, (req, res, next) => {
  upload.single("file")(req, res, async (err) => {
    if (err?.code === "LIMIT_FILE_SIZE") return next(badRequest(`Ukuran foto maksimal ${config.maxUploadMb}MB.`));
    if (err) return next(err);
    if (!req.file) return next(badRequest("Pilih file foto terlebih dahulu."));
    try {
      const { rows } = await query(
        "INSERT INTO uploads (mime, size, data, user_id) VALUES ($1,$2,$3,$4) RETURNING id",
        [req.file.mimetype, req.file.size, req.file.buffer, req.user.id],
      );
      res.status(201).json({ url: `/api/uploads/${rows[0].id}` });
    } catch (e) {
      next(e);
    }
  });
});

// Dibuka tanpa login karena dipakai tag <img>; id berupa UUID acak sehingga tidak dapat ditebak.
router.get("/:id", async (req, res, next) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw new HttpError(404, "Foto tidak ditemukan.");
    const { rows } = await query("SELECT mime, data FROM uploads WHERE id = $1", [req.params.id]);
    if (!rows[0]) throw new HttpError(404, "Foto tidak ditemukan.");
    res.set({
      "Content-Type": rows[0].mime,
      "Cache-Control": "public, max-age=604800, immutable",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "X-Content-Type-Options": "nosniff",
    });
    res.send(rows[0].data);
  } catch (e) {
    next(e);
  }
});

export default router;
