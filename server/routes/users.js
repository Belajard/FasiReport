import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "../db.js";
import { asyncHandler, badRequest, conflict, notFound, parse } from "../lib/http.js";
import { audit } from "../lib/audit.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const COLS = `id,name,email,role,phone,specialty,is_active,created_at,updated_at`;

// Daftar teknisi + beban kerja (dipakai admin saat menunjuk teknisi & direktori tim teknisi)
router.get("/technicians", requireRole("admin"), asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT u.id,u.name,u.email,u.phone,u.specialty,u.is_active,
       COUNT(r.id) FILTER (WHERE r.status IN ('assigned','processing'))::int AS active_tasks,
       COUNT(r.id) FILTER (WHERE r.status IN ('repaired','completed'))::int AS handled_total,
       COUNT(r.id) FILTER (WHERE r.status='completed'
          AND r.completed_at >= date_trunc('month', NOW()))::int AS completed_this_month,
       ROUND(AVG(EXTRACT(EPOCH FROM (r.repaired_at - r.assigned_at))/3600)
          FILTER (WHERE r.repaired_at IS NOT NULL AND r.assigned_at IS NOT NULL)::numeric, 1) AS avg_repair_hours,
       COUNT(r.id) FILTER (WHERE r.reopen_count > 0)::int AS disputed_total
     FROM users u LEFT JOIN reports r ON r.technician_id = u.id
     WHERE u.role='technician'
     GROUP BY u.id ORDER BY u.name`
  );
  res.json({ data: rows.map((t) => ({
    ...t,
    avg_repair_hours: t.avg_repair_hours === null ? null : Number(t.avg_repair_hours),
    availability: t.active_tasks >= 3 ? "busy" : "available",
  })) });
}));

router.get("/", requireRole("admin"), asyncHandler(async (_req, res) => {
  const { rows } = await query(`SELECT ${COLS} FROM users ORDER BY created_at DESC, id DESC`);
  res.json({ data: rows });
}));

const baseUser = {
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(120),
  email: z.string().trim().toLowerCase().email("Format email tidak valid").max(190),
  role: z.enum(["employee", "admin", "technician"]),
  phone: z.string().trim().max(40).nullable().optional(),
  specialty: z.string().trim().max(120).nullable().optional(),
};

router.post("/", requireRole("admin"), asyncHandler(async (req, res) => {
  const d = parse(z.object({ ...baseUser, password: z.string().min(8, "Kata sandi minimal 8 karakter").max(100) }), req.body);
  if ((await query(`SELECT 1 FROM users WHERE email=$1`, [d.email])).rowCount) throw conflict("Email sudah terdaftar.");
  const { rows } = await query(
    `INSERT INTO users (name,email,password_hash,role,phone,specialty) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${COLS}`,
    [d.name, d.email, await bcrypt.hash(d.password, 10), d.role, d.phone ?? null, d.specialty ?? null]
  );
  await audit(null, req.user.id, "create", "user", rows[0].id, { role: d.role, email: d.email });
  res.status(201).json({ data: rows[0] });
}));

router.patch("/:id", requireRole("admin"), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const d = parse(
    z.object({
      ...Object.fromEntries(Object.entries(baseUser).map(([k, v]) => [k, v.optional()])),
      is_active: z.boolean().optional(),
      password: z.string().min(8).max(100).optional(),
    }),
    req.body
  );
  const cur = (await query(`SELECT * FROM users WHERE id=$1`, [id])).rows[0];
  if (!cur) throw notFound("Pengguna tidak ditemukan.");
  if (id === req.user.id && (d.role && d.role !== "admin" || d.is_active === false)) {
    throw badRequest("Anda tidak dapat menurunkan role atau menonaktifkan akun Anda sendiri.");
  }
  if (d.email && d.email !== cur.email && (await query(`SELECT 1 FROM users WHERE email=$1`, [d.email])).rowCount) {
    throw conflict("Email sudah dipakai pengguna lain.");
  }
  const { rows } = await query(
    `UPDATE users SET name=COALESCE($2,name), email=COALESCE($3,email), role=COALESCE($4,role),
       phone=CASE WHEN $5::boolean THEN $6 ELSE phone END,
       specialty=CASE WHEN $7::boolean THEN $8 ELSE specialty END,
       is_active=COALESCE($9,is_active),
       password_hash=COALESCE($10,password_hash), updated_at=NOW()
     WHERE id=$1 RETURNING ${COLS}`,
    [id, d.name ?? null, d.email ?? null, d.role ?? null,
     d.phone !== undefined, d.phone ?? null, d.specialty !== undefined, d.specialty ?? null,
     d.is_active ?? null, d.password ? await bcrypt.hash(d.password, 10) : null]
  );
  await audit(null, req.user.id, "update", "user", id, { fields: Object.keys(d).filter((k) => k !== "password"), password_reset: !!d.password });
  res.json({ data: rows[0] });
}));

router.delete("/:id", requireRole("admin"), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw badRequest("Anda tidak dapat menghapus akun Anda sendiri.");
  const used = await query(
    `SELECT (SELECT COUNT(*) FROM reports WHERE user_id=$1 OR technician_id=$1)::int AS n`, [id]
  );
  if (used.rows[0].n > 0) {
    throw conflict("Pengguna ini memiliki riwayat laporan, sehingga tidak dapat dihapus. Nonaktifkan akunnya saja.");
  }
  const r = await query(`DELETE FROM users WHERE id=$1 RETURNING id`, [id]);
  if (!r.rowCount) throw notFound("Pengguna tidak ditemukan.");
  await audit(null, req.user.id, "delete", "user", id);
  res.json({ message: "Pengguna dihapus." });
}));

export default router;
