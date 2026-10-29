import { Router } from "express";
import { z } from "zod";
import { query, withTransaction } from "../db.js";
import { asyncHandler, badRequest, conflict, forbidden, notFound, parse } from "../lib/http.js";
import { audit } from "../lib/audit.js";
import { adminIds, notify } from "../lib/notify.js";
import { loadReport, loadReports } from "../lib/serialize.js";
import { applyTransition, ACTIONS } from "../lib/workflow.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const scopeFor = (user) => {
  if (user.role === "employee") return { where: "r.user_id = $1", params: [user.id] };
  if (user.role === "technician") return { where: "r.technician_id = $1", params: [user.id] };
  return { where: "TRUE", params: [] };
};

const canView = (user, r) =>
  user.role === "admin" || (user.role === "employee" && r.user_id === user.id) ||
  (user.role === "technician" && r.technician_id === user.id);

async function mustView(user, id, client) {
  const r = await loadReport(id, client);
  if (!r || !canView(user, r)) throw notFound("Laporan tidak ditemukan.");
  return r;
}

router.get("/", asyncHandler(async (req, res) => {
  const { where, params } = scopeFor(req.user);
  res.json({ data: await loadReports({ where, params }) });
}));

router.get("/:id(\\d+)", asyncHandler(async (req, res) => {
  res.json({ data: await mustView(req.user, Number(req.params.id)) });
}));

const photoField = z.string().max(500).nullable().optional();
const createSchema = z.object({
  facility_id: z.number().int().positive("Pilih fasilitas yang dilaporkan"),
  description: z.string().trim().min(10, "Deskripsi kerusakan minimal 10 karakter").max(2000),
  priority: z.enum(["low", "medium", "high"], { message: "Pilih tingkat prioritas" }),
  photo: photoField,
});

async function activeFacility(client, id) {
  const f = (await client.query(`SELECT * FROM facilities WHERE id=$1`, [id])).rows[0];
  if (!f) throw badRequest("Fasilitas yang dipilih tidak valid.");
  if (f.status !== "active") throw badRequest("Fasilitas ini sedang nonaktif dan tidak dapat dilaporkan.");
  return f;
}

router.post("/", requireRole("employee", "admin"), asyncHandler(async (req, res) => {
  const d = parse(createSchema, req.body);
  const id = await withTransaction(async (c) => {
    const f = await activeFacility(c, d.facility_id);
    const { rows } = await c.query(
      `INSERT INTO reports (user_id,facility_id,description,photo,priority) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [req.user.id, d.facility_id, d.description, d.photo || null, d.priority]
    );
    const rid = rows[0].id;
    await c.query(
      `INSERT INTO report_histories (report_id,changed_by,status,note) VALUES ($1,$2,'reported',$3)`,
      [rid, req.user.id, `Laporan ${f.name} berhasil dibuat oleh pelapor.`]
    );
    await notify(c, await adminIds(c), {
      type: "new_report", title: `Laporan baru #${rid}`,
      body: `${req.user.name} melaporkan ${f.name} (prioritas ${d.priority}).`, reportId: rid,
    });
    await audit(c, req.user.id, "create", "report", rid, { facility_id: d.facility_id });
    return rid;
  });
  res.status(201).json({ data: await loadReport(id) });
}));

router.patch("/:id(\\d+)", requireRole("employee", "admin"), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const d = parse(createSchema.partial(), req.body);
  await withTransaction(async (c) => {
    const cur = (await c.query(`SELECT * FROM reports WHERE id=$1 FOR UPDATE`, [id])).rows[0];
    if (!cur || (req.user.role === "employee" && cur.user_id !== req.user.id)) throw notFound("Laporan tidak ditemukan.");
    if (req.user.role === "employee" && cur.status !== "reported") {
      throw conflict("Laporan tidak dapat diedit karena sudah dalam proses penanganan.");
    }
    if (["completed", "rejected"].includes(cur.status)) throw conflict("Laporan yang sudah ditutup tidak dapat diedit.");
    if (d.facility_id) await activeFacility(c, d.facility_id);
    await c.query(
      `UPDATE reports SET facility_id=COALESCE($2,facility_id), description=COALESCE($3,description),
         priority=COALESCE($4,priority), photo=CASE WHEN $5::boolean THEN $6 ELSE photo END, updated_at=NOW() WHERE id=$1`,
      [id, d.facility_id ?? null, d.description ?? null, d.priority ?? null, d.photo !== undefined, d.photo ?? null]
    );
    await c.query(
      `INSERT INTO report_histories (report_id,changed_by,status,note) VALUES ($1,$2,$3,'Detail laporan diperbarui.')`,
      [id, req.user.id, cur.status]
    );
    await audit(c, req.user.id, "update", "report", id, d);
  });
  res.json({ data: await loadReport(id) });
}));

router.delete("/:id(\\d+)", requireRole("employee", "admin"), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await withTransaction(async (c) => {
    const cur = (await c.query(`SELECT * FROM reports WHERE id=$1 FOR UPDATE`, [id])).rows[0];
    if (!cur || (req.user.role === "employee" && cur.user_id !== req.user.id)) throw notFound("Laporan tidak ditemukan.");
    // Karyawan hanya boleh menghapus laporannya yang belum diproses; admin boleh menghapus laporan berstatus apa pun
    if (req.user.role === "employee" && cur.status !== "reported") {
      throw conflict("Laporan tidak dapat dihapus karena sudah dalam proses penanganan.");
    }
    // Kumpulkan foto yang hanya dipakai laporan ini agar tidak menjadi data yatim di tabel uploads
    const hist = (await c.query(`SELECT photo FROM report_histories WHERE report_id=$1`, [id])).rows;
    const photoIds = [cur.photo, cur.after_photo, ...hist.map((h) => h.photo)]
      .map((u) => /^\/api\/uploads\/([0-9a-f-]{36})$/i.exec(u || "")?.[1])
      .filter(Boolean);
    await c.query(`DELETE FROM reports WHERE id=$1`, [id]); // riwayat, bahan, komentar, notifikasi ikut terhapus (CASCADE)
    if (photoIds.length) await c.query(`DELETE FROM uploads WHERE id = ANY($1::uuid[])`, [photoIds]);
    await audit(c, req.user.id, "delete", "report", id, {
      status: cur.status,
      facility_id: cur.facility_id,
      description: String(cur.description).slice(0, 120),
      photos_removed: photoIds.length,
    });
  });
  res.json({ message: "Laporan dihapus." });
}));

// Semua perubahan status melalui satu pintu; transaksi + lock baris mencegah balapan data
router.post("/:id(\\d+)/transition", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { action, ...rest } = req.body || {};
  if (!ACTIONS.includes(action)) throw badRequest("Aksi tidak dikenal.");
  const result = await withTransaction(async (c) => {
    const cur = (await c.query(`SELECT * FROM reports WHERE id=$1 FOR UPDATE`, [id])).rows[0];
    if (!cur || !canView(req.user, cur)) throw notFound("Laporan tidak ditemukan.");
    const out = await applyTransition(c, cur, req.user, action, rest);
    await audit(c, req.user.id, action, "report", id, out);
    return out;
  });
  res.json({ data: await loadReport(id), transition: result });
}));

// Komentar
router.get("/:id(\\d+)/comments", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await mustView(req.user, id);
  const { rows } = await query(
    `SELECT c.*, json_build_object('id',u.id,'name',u.name,'role',u.role) AS author
     FROM comments c JOIN users u ON u.id=c.user_id WHERE c.report_id=$1 ORDER BY c.created_at, c.id`, [id]);
  res.json({ data: rows });
}));

router.post("/:id(\\d+)/comments", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { body } = parse(z.object({ body: z.string().trim().min(1, "Komentar tidak boleh kosong").max(1000) }), req.body);
  const rep = await mustView(req.user, id);
  await withTransaction(async (c) => {
    await c.query(`INSERT INTO comments (report_id,user_id,body) VALUES ($1,$2,$3)`, [id, req.user.id, body]);
    const others = [rep.user_id, rep.technician_id, ...(await adminIds(c))].filter((u) => u && u !== req.user.id);
    await notify(c, others, { type: "comment", title: `Komentar baru di laporan #${id}`, body: `${req.user.name}: ${body.slice(0, 120)}`, reportId: id });
  });
  const { rows } = await query(
    `SELECT c.*, json_build_object('id',u.id,'name',u.name,'role',u.role) AS author
     FROM comments c JOIN users u ON u.id=c.user_id WHERE c.report_id=$1 ORDER BY c.created_at, c.id`, [id]);
  res.status(201).json({ data: rows });
}));

export default router;
