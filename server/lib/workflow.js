import { z } from "zod";
import { config } from "../config.js";
import { badRequest, forbidden, parse } from "./http.js";
import { notify, adminIds } from "./notify.js";

/**
 * Alur status laporan:
 *
 *  reported ──assign──▶ assigned ──start──▶ processing ──finish──▶ repaired ──confirm──▶ completed
 *     │                    │                    ▲                     │
 *     └──reject──▶ rejected└──decline──▶ reported└────────dispute──────┘
 *
 *  - Karyawan : membuat laporan, confirm / dispute hasil perbaikan
 *  - Admin    : verifikasi (assign) atau reject, menugaskan teknisi/vendor, force_complete
 *  - Teknisi  : start, decline, progress, finish
 *  - Admin juga boleh start/progress/finish bila laporan ditangani vendor (tanpa akun).
 */

const optNote = z.string().trim().max(1000).optional().nullable();
const reqNote = (label) => z.string().trim().min(3, `${label} wajib diisi (minimal 3 karakter)`).max(1000);

const schemas = {
  assign: z.object({
    technician_id: z.number().int().positive().optional(),
    vendor_id: z.number().int().positive().optional(),
    vendor_ticket: z.string().trim().max(80).optional().nullable(),
    due_at: z.string().datetime({ offset: true }).optional().nullable(),
    note: optNote,
  }),
  reject: z.object({ note: reqNote("Alasan penolakan") }),
  start: z.object({ note: optNote }),
  decline: z.object({ note: reqNote("Alasan penolakan tugas") }),
  progress: z.object({ note: reqNote("Catatan progres"), photo: z.string().max(500).optional().nullable() }),
  finish: z.object({
    summary: reqNote("Ringkasan perbaikan"),
    after_photo: z.string().max(500).optional().nullable(),
    cost: z.number().min(0).max(1e12).optional(),
    materials: z.array(z.object({
      name: z.string().trim().min(1).max(160),
      qty: z.number().positive().max(100000).default(1),
      unit_cost: z.number().min(0).max(1e12).default(0),
    })).max(30).optional(),
  }),
  confirm: z.object({ note: optNote }),
  dispute: z.object({ note: reqNote("Alasan perbaikan belum sesuai") }),
  force_complete: z.object({ note: reqNote("Catatan penyelesaian") }),
};

const rule = {
  assign: { roles: ["admin"], from: ["reported", "assigned"], to: "assigned" },
  reject: { roles: ["admin"], from: ["reported"], to: "rejected" },
  start: { roles: ["technician", "admin"], from: ["assigned"], to: "processing" },
  decline: { roles: ["technician"], from: ["assigned"], to: "reported" },
  progress: { roles: ["technician", "admin"], from: ["processing"], to: "processing" },
  finish: { roles: ["technician", "admin"], from: ["processing"], to: "repaired" },
  confirm: { roles: ["employee"], from: ["repaired"], to: "completed" },
  dispute: { roles: ["employee"], from: ["repaired"], to: "processing" },
  force_complete: { roles: ["admin"], from: ["repaired"], to: "completed" },
};

export const ACTIONS = Object.keys(rule);

const STATUS_ID = { reported: "Dilaporkan", assigned: "Ditugaskan", processing: "Diproses", repaired: "Diperbaiki", completed: "Selesai", rejected: "Ditolak" };

/** Terapkan satu aksi pada laporan (dipanggil di dalam transaksi, laporan sudah di-lock FOR UPDATE). */
export async function applyTransition(client, report, user, action, rawBody) {
  const r = rule[action];
  if (!r) throw badRequest("Aksi tidak dikenal.");
  if (!r.roles.includes(user.role)) throw forbidden("Peran Anda tidak diizinkan melakukan aksi ini.");
  if (!r.from.includes(report.status)) {
    throw badRequest(
      `Aksi tidak dapat dilakukan: laporan berstatus '${STATUS_ID[report.status]}'.`
    );
  }
  // Kepemilikan
  if (user.role === "employee" && report.user_id !== user.id) throw forbidden("Anda hanya dapat mengonfirmasi laporan milik sendiri.");
  if (user.role === "technician" && report.technician_id !== user.id) throw forbidden("Laporan ini bukan tugas Anda.");
  if (user.role === "admin" && ["start", "progress", "finish"].includes(action) && !report.vendor_id) {
    throw forbidden("Laporan ini ditangani teknisi internal. Hanya teknisi yang ditunjuk yang dapat memperbarui pengerjaan.");
  }

  const d = parse(schemas[action], rawBody || {});
  const now = new Date();
  const set = { status: r.to };
  let note = d.note || null;
  let histPhoto = null;
  const toNotify = []; // {users, payload}
  const rid = report.id;
  const label = `#${rid}`;

  switch (action) {
    case "assign": {
      if (!!d.technician_id === !!d.vendor_id) throw badRequest("Pilih salah satu: teknisi internal ATAU vendor rekanan.");
      let target;
      if (d.technician_id) {
        const t = (await client.query(`SELECT id,name FROM users WHERE id=$1 AND role='technician' AND is_active`, [d.technician_id])).rows[0];
        if (!t) throw badRequest("Teknisi tidak ditemukan atau sudah nonaktif.");
        target = t.name;
        set.technician_id = t.id; set.vendor_id = null; set.vendor_ticket = null;
        toNotify.push({ users: t.id, payload: { type: "assigned", title: `Tugas baru ${label}`, body: `Anda ditugaskan menangani laporan ${label}.` } });
      } else {
        const v = (await client.query(`SELECT id,name,is_active FROM vendors WHERE id=$1`, [d.vendor_id])).rows[0];
        if (!v || !v.is_active) throw badRequest("Vendor tidak ditemukan atau sudah nonaktif.");
        target = `${v.name} (vendor)`;
        set.vendor_id = v.id; set.technician_id = null; set.vendor_ticket = d.vendor_ticket || null;
      }
      set.assigned_at = now;
      set.due_at = d.due_at ? new Date(d.due_at) : new Date(now.getTime() + config.slaHours[report.priority] * 3600 * 1000);
      set.rejection_reason = null;
      note = note || `Laporan diverifikasi dan ditugaskan kepada ${target}.`;
      set.admin_note = note;
      toNotify.push({ users: report.user_id, payload: { type: "verified", title: `Laporan ${label} diverifikasi`, body: `Laporan Anda diverifikasi dan ditugaskan kepada ${target}.` } });
      break;
    }
    case "reject":
      set.rejection_reason = d.note; set.admin_note = d.note; note = d.note;
      toNotify.push({ users: report.user_id, payload: { type: "rejected", title: `Laporan ${label} ditolak`, body: d.note } });
      break;
    case "start":
      set.started_at = now;
      note = note || "Teknisi mulai mengerjakan perbaikan.";
      set.admin_note = note;
      toNotify.push({ users: report.user_id, payload: { type: "progress", title: `Laporan ${label} mulai dikerjakan`, body: note } });
      break;
    case "decline":
      set.technician_id = null; set.assigned_at = null; set.due_at = null;
      note = `Tugas ditolak teknisi: ${d.note}`;
      set.admin_note = note;
      toNotify.push({ users: await adminIds(client), payload: { type: "declined", title: `Teknisi menolak tugas ${label}`, body: d.note } });
      break;
    case "progress":
      note = d.note; histPhoto = d.photo || null; set.admin_note = note;
      toNotify.push({ users: report.user_id, payload: { type: "progress", title: `Update perbaikan ${label}`, body: note } });
      break;
    case "finish": {
      const mats = d.materials || [];
      const matTotal = mats.reduce((s, m) => s + m.qty * m.unit_cost, 0);
      set.repaired_at = now; set.repair_summary = d.summary; set.admin_note = d.summary;
      set.after_photo = d.after_photo || null;
      set.cost = d.cost ?? matTotal;
      note = d.summary; histPhoto = d.after_photo || null;
      await client.query(`DELETE FROM report_materials WHERE report_id=$1`, [rid]);
      for (const m of mats) {
        await client.query(`INSERT INTO report_materials (report_id,name,qty,unit_cost) VALUES ($1,$2,$3,$4)`, [rid, m.name, m.qty, m.unit_cost]);
      }
      toNotify.push({ users: report.user_id, payload: { type: "repaired", title: `Perbaikan ${label} selesai — mohon konfirmasi`, body: d.summary } });
      toNotify.push({ users: await adminIds(client), payload: { type: "repaired", title: `Perbaikan ${label} menunggu konfirmasi pelapor`, body: d.summary } });
      break;
    }
    case "confirm":
      set.completed_at = now;
      note = note || "Pelapor mengonfirmasi perbaikan sudah sesuai.";
      toNotify.push({ users: [report.technician_id, ...(await adminIds(client))], payload: { type: "completed", title: `Laporan ${label} selesai`, body: note } });
      break;
    case "dispute":
      set.reopen_count = report.reopen_count + 1;
      set.completed_at = null; set.repaired_at = null;
      set.due_at = new Date(now.getTime() + 24 * 3600 * 1000);
      note = `Pelapor menilai perbaikan belum sesuai: ${d.note}`;
      set.admin_note = note;
      toNotify.push({ users: [report.technician_id, ...(await adminIds(client))], payload: { type: "disputed", title: `Perbaikan ${label} belum sesuai`, body: d.note } });
      break;
    case "force_complete":
      set.completed_at = now; note = `Diselesaikan oleh admin: ${d.note}`; set.admin_note = note;
      toNotify.push({ users: [report.user_id, report.technician_id], payload: { type: "completed", title: `Laporan ${label} ditutup admin`, body: d.note } });
      break;
  }

  const cols = Object.keys(set);
  const vals = cols.map((c) => set[c]);
  await client.query(
    `UPDATE reports SET ${cols.map((c, i) => `${c}=$${i + 2}`).join(",")}, updated_at=NOW() WHERE id=$1`,
    [rid, ...vals]
  );
  await client.query(
    `INSERT INTO report_histories (report_id, changed_by, status, note, photo) VALUES ($1,$2,$3,$4,$5)`,
    [rid, user.id, r.to, note || `Status diperbarui menjadi ${STATUS_ID[r.to]}.`, histPhoto]
  );
  for (const n of toNotify) {
    const users = (Array.isArray(n.users) ? n.users : [n.users]).filter((u) => u && u !== user.id);
    await notify(client, users, { ...n.payload, reportId: rid });
  }
  return { action, from: report.status, to: r.to };
}
