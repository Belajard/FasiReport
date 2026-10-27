import { query } from "../db.js";

/** Catat aktivitas penting (siapa melakukan apa). Gagal mencatat tidak boleh menggagalkan request. */
export async function audit(client, userId, action, entity, entityId, detail = null) {
  try {
    await (client || { query }).query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, detail) VALUES ($1,$2,$3,$4,$5)`,
      [userId ?? null, action, entity, entityId ?? null, detail ? JSON.stringify(detail) : null]
    );
  } catch (e) {
    console.error("audit gagal:", e.message);
  }
}
