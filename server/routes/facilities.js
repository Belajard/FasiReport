import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { asyncHandler, notFound, parse } from "../lib/http.js";
import { audit } from "../lib/audit.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Statistik riwayat per fasilitas: jumlah laporan, yang masih terbuka, dan penanda kerusakan berulang (>=3 laporan / 90 hari)
const SELECT = `
  SELECT f.*,
    COUNT(r.id)::int AS report_count,
    COUNT(r.id) FILTER (WHERE r.status NOT IN ('completed','rejected'))::int AS open_count,
    COUNT(r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL '90 days')::int AS recent_count,
    MAX(r.created_at) AS last_report_at,
    COALESCE(SUM(r.cost) FILTER (WHERE r.status IN ('repaired','completed')),0)::numeric AS total_cost
  FROM facilities f LEFT JOIN reports r ON r.facility_id = f.id`;

const withFlag = (f) => ({ ...f, is_recurring: f.recent_count >= 3 });

router.get("/", asyncHandler(async (req, res) => {
  const onlyActive = req.user.role !== "admin";
  const { rows } = await query(
    `${SELECT} ${onlyActive ? "WHERE f.status='active'" : ""} GROUP BY f.id ORDER BY f.created_at DESC, f.id DESC`
  );
  res.json({ data: rows.map(withFlag) });
}));

const body = z.object({
  name: z.string().trim().min(2, "Nama fasilitas minimal 2 karakter").max(160),
  location: z.string().trim().min(2, "Lokasi wajib diisi").max(200),
  category: z.string().trim().min(2, "Kategori wajib diisi").max(100),
  status: z.enum(["active", "inactive"]).optional(),
});

router.post("/", requireRole("admin"), asyncHandler(async (req, res) => {
  const d = parse(body, req.body);
  const { rows } = await query(
    `INSERT INTO facilities (name,location,category,status) VALUES ($1,$2,$3,$4) RETURNING *`,
    [d.name, d.location, d.category, d.status || "active"]
  );
  await audit(null, req.user.id, "create", "facility", rows[0].id, { name: d.name });
  res.status(201).json({ data: rows[0] });
}));

router.patch("/:id", requireRole("admin"), asyncHandler(async (req, res) => {
  const d = parse(body.partial(), req.body);
  const { rows } = await query(
    `UPDATE facilities SET name=COALESCE($2,name), location=COALESCE($3,location),
       category=COALESCE($4,category), status=COALESCE($5,status), updated_at=NOW()
     WHERE id=$1 RETURNING *`,
    [Number(req.params.id), d.name ?? null, d.location ?? null, d.category ?? null, d.status ?? null]
  );
  if (!rows[0]) throw notFound("Fasilitas tidak ditemukan.");
  await audit(null, req.user.id, "update", "facility", rows[0].id, d);
  res.json({ data: rows[0] });
}));

// Riwayat lengkap satu fasilitas
router.get("/:id/history", requireRole("admin", "technician"), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT r.id, r.description, r.priority, r.status, r.cost, r.created_at, r.completed_at, t.name AS technician_name
     FROM reports r LEFT JOIN users t ON t.id = r.technician_id
     WHERE r.facility_id=$1 ORDER BY r.created_at DESC LIMIT 100`,
    [Number(req.params.id)]
  );
  res.json({ data: rows });
}));

export default router;
