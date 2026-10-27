import { query } from "../db.js";

const ACTIVE_FOR_SLA = ["assigned", "processing"];

/**
 * Ambil laporan beserta relasi (fasilitas, pelapor, teknisi, vendor, riwayat, material).
 * Bentuk keluarannya sengaja dibuat sama dengan data lama agar tampilan tidak berubah.
 */
export async function loadReports({ where = "TRUE", params = [], client } = {}) {
  const db = client || { query };
  const { rows } = await db.query(
    `SELECT r.*,
       json_build_object('id',f.id,'name',f.name,'location',f.location,'category',f.category,'status',f.status) AS facility,
       json_build_object('id',u.id,'name',u.name,'email',u.email,'role',u.role) AS "user",
       CASE WHEN t.id IS NULL THEN NULL ELSE
         json_build_object('id',t.id,'name',t.name,'phone',t.phone,'specialty',t.specialty) END AS technician,
       CASE WHEN v.id IS NULL THEN NULL ELSE
         json_build_object('id',v.id,'name',v.name,'phone',v.phone,'category',v.category) END AS vendor,
       (SELECT COUNT(*)::int FROM comments c WHERE c.report_id = r.id) AS comments_count
     FROM reports r
     JOIN facilities f ON f.id = r.facility_id
     JOIN users u ON u.id = r.user_id
     LEFT JOIN users t ON t.id = r.technician_id
     LEFT JOIN vendors v ON v.id = r.vendor_id
     WHERE ${where}
     ORDER BY r.created_at DESC, r.id DESC`,
    params
  );
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);

  const [hist, mats] = await Promise.all([
    db.query(
      `SELECT h.*, CASE WHEN cu.id IS NULL THEN NULL ELSE
          json_build_object('id',cu.id,'name',cu.name,'role',cu.role) END AS changed_by_user
       FROM report_histories h LEFT JOIN users cu ON cu.id = h.changed_by
       WHERE h.report_id = ANY($1) ORDER BY h.created_at ASC, h.id ASC`,
      [ids]
    ),
    db.query(`SELECT * FROM report_materials WHERE report_id = ANY($1) ORDER BY id`, [ids]),
  ]);

  const histBy = new Map();
  for (const h of hist.rows) (histBy.get(h.report_id) || histBy.set(h.report_id, []).get(h.report_id)).push(h);
  const matBy = new Map();
  for (const m of mats.rows) (matBy.get(m.report_id) || matBy.set(m.report_id, []).get(m.report_id)).push(m);

  const now = Date.now();
  return rows.map((r) => ({
    ...r,
    technician_id: r.technician_id ?? null,
    status_histories: histBy.get(r.id) || [],
    materials: matBy.get(r.id) || [],
    is_overdue: !!(r.due_at && ACTIVE_FOR_SLA.includes(r.status) && new Date(r.due_at).getTime() < now),
  }));
}

export async function loadReport(id, client) {
  const list = await loadReports({ where: "r.id = $1", params: [id], client });
  return list[0] || null;
}
