import pg from "pg";
import { config } from "./config.js";

// DATE dikembalikan sebagai string 'YYYY-MM-DD' (bukan Date) agar tidak bergeser zona waktu
pg.types.setTypeParser(1082, (v) => v);
// NUMERIC -> number
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  // Supabase mewajibkan koneksi terenkripsi
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
});

export const query = (text, params) => pool.query(text, params);

/** Jalankan beberapa query dalam satu transaksi. */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
