import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { asyncHandler, notFound, parse } from "../lib/http.js";
import { audit } from "../lib/audit.js";
import { notify } from "../lib/notify.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const SELECT = `
  SELECT m.*, to_char(m.scheduled_date,'YYYY-MM-DD') AS date_iso,
    (m.status <> 'done' AND m.scheduled_date < CURRENT_DATE) AS is_overdue,
    (m.scheduled_date - CURRENT_DATE) AS days_left,
    t.name AS technician_name, v.name AS vendor_name
  FROM maintenance_schedules m
  LEFT JOIN users t ON t.id = m.technician_id
  LEFT JOIN vendors v ON v.id = m.vendor_id`;

// Urutan: yang belum selesai paling dekat dulu, yang selesai di bawah
const ORDER = `ORDER BY (m.status='done') ASC, CASE WHEN m.status='done' THEN NULL ELSE m.scheduled_date END ASC, m.scheduled_date DESC`;

router.get("/", asyncHandler(async (req, res) => {
  const mine = req.user.role === "technician" ? `WHERE m.technician_id = ${Number(req.user.id)}` : "";
  const { rows } = await query(`${SELECT} ${mine} ${ORDER}`);
  res.json({ data: rows });
}));

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi (format YYYY-MM-DD)");
const body = z.object({
  facility: z.string().trim().min(2, "Nama fasilitas wajib diisi").max(200),
  location: z.string().trim().min(2, "Lokasi wajib diisi").max(200),
  scheduled_date: dateStr,
  type: z.string().trim().min(2, "Jenis pemeliharaan wajib diisi").max(250),
  pic: z.string().trim().min(2, "Pelaksana wajib diisi").max(200),
  technician_id: z.number().int().positive().nullable().optional(),
  vendor_id: z.number().int().positive().nullable().optional(),
  status: z.enum(["upcoming", "ongoing", "done"]).optional(),
});

const getOne = async (id) => (await query(`${SELECT} WHERE m.id=$1`, [id])).rows[0];

router.post("/", requireRole("admin"), asyncHandler(async (req, res) => {
  const d = parse(body, req.body);
  const { rows } = await query(
    `INSERT INTO maintenance_schedules (facility,location,scheduled_date,type,pic,technician_id,vendor_id,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'upcoming')) RETURNING id`,
    [d.facility, d.location, d.scheduled_date, d.type, d.pic, d.technician_id ?? null, d.vendor_id ?? null, d.status ?? null]
  );
  if (d.technician_id) {
    await notify(null, d.technician_id, {
      type: "maintenance", title: "Jadwal perawatan baru",
      body: `${d.facility} — ${d.type} (${d.scheduled_date})`,
    });
  }
  await audit(null, req.user.id, "create", "maintenance", rows[0].id, { facility: d.facility });
  res.status(201).json({ data: await getOne(rows[0].id) });
}));

router.patch("/:id", requireRole("admin"), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const raw = parse(body.partial(), req.body);
  const sets = [], vals = [id];
  for (const [k, v] of Object.entries(raw)) { vals.push(v ?? null); sets.push(`${k}=$${vals.length}`); }
  if (!sets.length) throw notFound("Tidak ada perubahan.");
  const r = await query(`UPDATE maintenance_schedules SET ${sets.join(",")}, updated_at=NOW() WHERE id=$1 RETURNING id`, vals);
  if (!r.rowCount) throw notFound("Jadwal pemeliharaan tidak ditemukan.");
  await audit(null, req.user.id, "update", "maintenance", id, raw);
  res.json({ data: await getOne(id) });
}));

// Maju status: upcoming -> ongoing -> done -> upcoming. Teknisi boleh untuk jadwal miliknya.
router.post("/:id/advance", requireRole("admin", "technician"), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const cur = (await query(`SELECT * FROM maintenance_schedules WHERE id=$1`, [id])).rows[0];
  if (!cur) throw notFound("Jadwal pemeliharaan tidak ditemukan.");
  if (req.user.role === "technician" && cur.technician_id !== req.user.id) {
    throw notFound("Jadwal pemeliharaan tidak ditemukan.");
  }
  const next = cur.status === "upcoming" ? "ongoing" : cur.status === "ongoing" ? "done" : "upcoming";
  await query(`UPDATE maintenance_schedules SET status=$2, updated_at=NOW() WHERE id=$1`, [id, next]);
  await audit(null, req.user.id, "advance", "maintenance", id, { from: cur.status, to: next });
  res.json({ data: await getOne(id) });
}));

router.delete("/:id", requireRole("admin"), asyncHandler(async (req, res) => {
  const r = await query(`DELETE FROM maintenance_schedules WHERE id=$1 RETURNING id`, [Number(req.params.id)]);
  if (!r.rowCount) throw notFound("Jadwal pemeliharaan tidak ditemukan.");
  await audit(null, req.user.id, "delete", "maintenance", r.rows[0].id);
  res.json({ message: "Jadwal dihapus." });
}));

export default router;
