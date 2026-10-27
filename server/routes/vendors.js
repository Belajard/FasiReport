import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { asyncHandler, conflict, notFound, parse } from "../lib/http.js";
import { audit } from "../lib/audit.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("admin", "technician"));

router.get("/", asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT v.*,
       COUNT(r.id) FILTER (WHERE r.status IN ('assigned','processing'))::int AS active_tasks,
       COALESCE(SUM(r.cost) FILTER (WHERE r.status IN ('repaired','completed')),0)::numeric AS total_cost,
       (v.contract_end IS NOT NULL AND v.contract_end < CURRENT_DATE) AS contract_expired,
       (v.contract_end IS NOT NULL AND v.contract_end >= CURRENT_DATE AND v.contract_end <= CURRENT_DATE + 30) AS contract_expiring
     FROM vendors v LEFT JOIN reports r ON r.vendor_id = v.id
     GROUP BY v.id ORDER BY v.is_active DESC, v.name`
  );
  res.json({ data: rows });
}));

const body = z.object({
  name: z.string().trim().min(2, "Nama vendor minimal 2 karakter").max(160),
  category: z.string().trim().min(2, "Kategori wajib diisi").max(160),
  pic_name: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(60).nullable().optional(),
  email: z.string().trim().email("Format email tidak valid").max(190).nullable().optional().or(z.literal("")),
  contract_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD").nullable().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).nullable().optional(),
  is_active: z.boolean().optional(),
});
const clean = (d) => ({ ...d, email: d.email || null, contract_end: d.contract_end || null });

router.post("/", requireRole("admin"), asyncHandler(async (req, res) => {
  const d = clean(parse(body, req.body));
  const { rows } = await query(
    `INSERT INTO vendors (name,category,pic_name,phone,email,contract_end,notes,is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,TRUE)) RETURNING *`,
    [d.name, d.category, d.pic_name ?? null, d.phone ?? null, d.email, d.contract_end, d.notes ?? null, d.is_active ?? null]
  );
  await audit(null, req.user.id, "create", "vendor", rows[0].id, { name: d.name });
  res.status(201).json({ data: rows[0] });
}));

router.patch("/:id", requireRole("admin"), asyncHandler(async (req, res) => {
  const raw = parse(body.partial(), req.body);
  const sets = [], vals = [Number(req.params.id)];
  for (const [k, v] of Object.entries(raw)) {
    vals.push(v === "" ? null : v ?? null);
    sets.push(`${k}=$${vals.length}`);
  }
  if (!sets.length) throw notFound("Tidak ada perubahan.");
  const { rows } = await query(`UPDATE vendors SET ${sets.join(",")}, updated_at=NOW() WHERE id=$1 RETURNING *`, vals);
  if (!rows[0]) throw notFound("Vendor tidak ditemukan.");
  await audit(null, req.user.id, "update", "vendor", rows[0].id, raw);
  res.json({ data: rows[0] });
}));

router.delete("/:id", requireRole("admin"), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const used = await query(
    `SELECT (SELECT COUNT(*) FROM reports WHERE vendor_id=$1) + (SELECT COUNT(*) FROM maintenance_schedules WHERE vendor_id=$1) AS n`, [id]);
  if (Number(used.rows[0].n) > 0) throw conflict("Vendor sudah dipakai pada laporan/jadwal. Nonaktifkan saja.");
  const r = await query(`DELETE FROM vendors WHERE id=$1 RETURNING id`, [id]);
  if (!r.rowCount) throw notFound("Vendor tidak ditemukan.");
  await audit(null, req.user.id, "delete", "vendor", id);
  res.json({ message: "Vendor dihapus." });
}));

export default router;
