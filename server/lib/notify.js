import { query } from "../db.js";

/** Kirim notifikasi dalam aplikasi ke satu atau banyak user. */
export async function notify(client, userIds, { type, title, body, reportId }) {
  const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean))];
  if (!ids.length) return;
  const db = client || { query };
  for (const uid of ids) {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, report_id) VALUES ($1,$2,$3,$4,$5)`,
      [uid, type, title, body ?? null, reportId ?? null]
    );
  }
}

export async function adminIds(client) {
  const { rows } = await (client || { query }).query(
    `SELECT id FROM users WHERE role='admin' AND is_active`
  );
  return rows.map((r) => r.id);
}
