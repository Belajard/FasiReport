import bcrypt from "bcryptjs";
import { pool } from "../db.js";

// node server/db/seed.js          -> isi data contoh hanya jika database masih kosong
// node server/db/seed.js --reset  -> kosongkan semua tabel lalu isi ulang
const reset = process.argv.includes("--reset");
const sql = (await import("node:fs")).readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
await pool.query(sql);

if (reset) {
  await pool.query(`TRUNCATE audit_logs, notifications, comments, report_materials, report_histories,
    reports, maintenance_schedules, vendors, facilities, users RESTART IDENTITY CASCADE;
    ALTER SEQUENCE reports_id_seq RESTART WITH 101;`);
}
if ((await pool.query("SELECT COUNT(*)::int n FROM users")).rows[0].n > 0) {
  console.log("Database sudah berisi data — seed dilewati (pakai --reset untuk mengisi ulang).");
  await pool.end();
  process.exit(0);
}

const hash = await bcrypt.hash("password123", 10);
const ago = (d, h = 0) => new Date(Date.now() - (d * 24 + h) * 3600 * 1000);
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const users = [
  ["Admin Test", "admin.test@example.com", "admin", null, null],
  ["Karyawan Test", "karyawan.test@example.com", "employee", "0812-1111-0001", null],
  ["Karyawan Kedua", "karyawan2.test@example.com", "employee", "0812-1111-0002", null],
  ["Teknisi Test", "teknisi.test@example.com", "technician", "0813-8877-6655", "Kelistrikan & Plumbing"],
  ["Teknisi Kedua", "teknisi2.test@example.com", "technician", "0813-4455-2211", "Elektronik & IT Office"],
];
for (const [name, email, role, phone, specialty] of users) {
  await pool.query(
    `INSERT INTO users (name,email,password_hash,role,phone,specialty) VALUES ($1,$2,$3,$4,$5,$6)`,
    [name, email, hash, role, phone, specialty]
  );
}
// id: 1 admin, 2 karyawan, 3 karyawan2, 4 teknisi, 5 teknisi2

const facilities = [
  ["AC Ruang Produksi", "Gedung A Lantai 1", "Pendingin", "active"],
  ["Lampu Koridor", "Gedung A Lantai 2", "Penerangan", "active"],
  ["Printer Ruang Administrasi", "Gedung B Lantai 1", "Elektronik", "active"],
  ["Proyektor Ruang Rapat Alpha", "Gedung B Lantai 2", "Elektronik", "active"],
  ["Lift Penumpang Barat", "Gedung A", "Transportasi Vertikal", "inactive"],
];
for (const f of facilities) await pool.query(`INSERT INTO facilities (name,location,category,status) VALUES ($1,$2,$3,$4)`, f);

const vendors = [
  ["PT Sejuk Mandiri Teknik", "HVAC & Tata Udara (AC Sentral)", "Pak Bambang", "0812-3456-7890", "service@sejukmandiri.example", inDays(240)],
  ["Kone Elevator Indonesia", "Lift & Eskalator Penumpang", "Hotline 24 Jam", "0811-9876-5432", "care@kone.example", inDays(20)],
  ["Safety First Solusindo", "Fire Safety & APAR Gedung", "Inspeksi Tabung", "0813-2468-1357", "cs@safetyfirst.example", inDays(120)],
  ["PT Daya Nusantara Power", "Genset & Power Plant 250kVA", "Teknisi Mesin", "0812-7788-9900", "ops@dayanusantara.example", inDays(-15)],
];
for (const v of vendors) {
  await pool.query(`INSERT INTO vendors (name,category,pic_name,phone,email,contract_end) VALUES ($1,$2,$3,$4,$5,$6)`, v);
}

async function report(r) {
  await pool.query(
    `INSERT INTO reports (id,user_id,facility_id,description,photo,priority,status,admin_note,technician_id,vendor_id,
       due_at,assigned_at,started_at,repaired_at,completed_at,repair_summary,cost,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$18)`,
    [r.id, r.user, r.fac, r.desc, r.photo ?? null, r.prio, r.status, r.note ?? null, r.tech ?? null, r.vendor ?? null,
     r.due ?? null, r.assigned ?? null, r.started ?? null, r.repaired ?? null, r.completed ?? null, r.summary ?? null, r.cost ?? 0, r.created]
  );
  for (const [by, status, note, at] of r.hist) {
    await pool.query(`INSERT INTO report_histories (report_id,changed_by,status,note,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$5)`, [r.id, by, status, note, at]);
  }
}

await report({
  id: 101, user: 2, fac: 1, prio: "high", status: "processing", tech: 4,
  desc: "Suhu AC tidak dingin dan mengeluarkan bunyi mendengung cukup keras sejak pagi hari saat jam shift pertama.",
  photo: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80",
  note: "Pengecekan kompresor dan kapasitor sedang berlangsung.",
  created: ago(6), assigned: ago(5, 20), started: ago(5, 10), due: ago(0, -6),
  hist: [
    [2, "reported", "Laporan AC Ruang Produksi berhasil dibuat oleh pelapor.", ago(6)],
    [1, "assigned", "Laporan diverifikasi dan ditugaskan kepada Teknisi Test.", ago(5, 20)],
    [4, "processing", "Teknisi mulai mengerjakan perbaikan.", ago(5, 10)],
    [4, "processing", "Pengecekan kompresor dan kapasitor sedang berlangsung.", ago(5, 2)],
  ],
});
await report({
  id: 102, user: 2, fac: 2, prio: "medium", status: "reported",
  desc: "Dua lampu di koridor depan ruang arsip berkedip-kedip dan satu lampu mati total sehingga koridor remang.",
  photo: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=600&q=80",
  created: ago(2),
  hist: [[2, "reported", "Laporan Lampu Koridor berhasil dibuat oleh pelapor.", ago(2)]],
});
await report({
  id: 103, user: 3, fac: 3, prio: "low", status: "repaired", tech: 5,
  desc: "Paper jam berulang kali pada tray 2 dan roller penarik kertas tampak aus.",
  note: "Roller tray 2 sudah diganti baru, uji cetak 50 lembar lancar.",
  summary: "Roller tray 2 sudah diganti baru, uji cetak 50 lembar lancar.", cost: 185000,
  created: ago(4), assigned: ago(3, 18), started: ago(3, 12), repaired: ago(2, 20), due: ago(-3),
  hist: [
    [3, "reported", "Laporan Printer Ruang Administrasi berhasil dibuat oleh pelapor.", ago(4)],
    [1, "assigned", "Laporan diverifikasi dan ditugaskan kepada Teknisi Kedua.", ago(3, 18)],
    [5, "processing", "Teknisi mulai mengerjakan perbaikan.", ago(3, 12)],
    [5, "repaired", "Roller tray 2 sudah diganti baru, uji cetak 50 lembar lancar.", ago(2, 20)],
  ],
});
await pool.query(`INSERT INTO report_materials (report_id,name,qty,unit_cost) VALUES (103,'Roller pickup tray 2',1,185000)`);
await report({
  id: 104, user: 2, fac: 4, prio: "medium", status: "completed", tech: 5,
  desc: "Warna proyektor dominan kuning kehijauan dan gambar buram saat presentasi rapat mingguan.",
  photo: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
  note: "Pelapor mengonfirmasi perbaikan sudah sesuai.",
  summary: "Lampu proyektor diganti baru & lensa dibersihkan. Kualitas proyeksi normal kembali.", cost: 650000,
  created: ago(12), assigned: ago(11, 20), started: ago(11, 10), repaired: ago(10, 8), completed: ago(9, 20), due: ago(9),
  hist: [
    [2, "reported", "Laporan Proyektor Ruang Rapat Alpha berhasil dibuat oleh pelapor.", ago(12)],
    [1, "assigned", "Laporan diverifikasi dan ditugaskan kepada Teknisi Kedua.", ago(11, 20)],
    [5, "processing", "Teknisi mulai mengerjakan perbaikan.", ago(11, 10)],
    [5, "repaired", "Lampu proyektor diganti baru & lensa dibersihkan. Kualitas proyeksi normal kembali.", ago(10, 8)],
    [2, "completed", "Pelapor mengonfirmasi perbaikan sudah sesuai.", ago(9, 20)],
  ],
});
await pool.query(`INSERT INTO report_materials (report_id,name,qty,unit_cost) VALUES (104,'Lampu proyektor',1,600000),(104,'Cairan pembersih lensa',1,50000)`);
await report({
  id: 105, user: 3, fac: 2, prio: "low", status: "assigned", vendor: 1,
  desc: "Lampu koridor lantai 2 sisi timur redup dan perlu pengecekan instalasi ballast.",
  note: "Laporan diverifikasi dan ditugaskan kepada PT Sejuk Mandiri Teknik (vendor).",
  created: ago(1), assigned: ago(0, 18), due: ago(-6),
  hist: [
    [3, "reported", "Laporan Lampu Koridor berhasil dibuat oleh pelapor.", ago(1)],
    [1, "assigned", "Laporan diverifikasi dan ditugaskan kepada PT Sejuk Mandiri Teknik (vendor).", ago(0, 18)],
  ],
});
await pool.query(`SELECT setval('reports_id_seq', 105)`);

const maint = [
  ["AC Sentral & Split", "Gedung A (Lantai 1 - 3)", inDays(3), "Pembersihan Filter & Pengisian Freon Berkala", "PT Sejuk Mandiri (Teknisi HVAC)", null, 1, "upcoming"],
  ["Lift Penumpang 1 & 2", "Lobi Utama Gedung A", inDays(5), "Audit Kelayakan & Safety Sensor Rutin", "Kone Elevator Engineering", null, 2, "upcoming"],
  ["APAR & Fire Alarm Detector", "Seluruh Koridor & Tangga Darurat", inDays(-11), "Pengecekan Tekanan Tabung & Refill Bubuk Kimia", "Safety First Indonesia", null, 3, "done"],
  ["Genset Cadangan Daya 250kVA", "Ruang Power Plant Basement", inDays(10), "Penggantian Oli Mesin & Uji Running Otomatis", "Teknisi MEP Internal", 4, null, "upcoming"],
  ["Panel Listrik Utama", "Gedung B Lantai Dasar", inDays(-2), "Inspeksi Termografi & Pengencangan Terminal", "Teknisi Test", 4, null, "ongoing"],
];
for (const m of maint) {
  await pool.query(
    `INSERT INTO maintenance_schedules (facility,location,scheduled_date,type,pic,technician_id,vendor_id,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, m);
}

const notif = [
  [1, "new_report", "Laporan baru #102", "Karyawan Test melaporkan Lampu Koridor (prioritas medium).", 102],
  [1, "repaired", "Perbaikan #103 menunggu konfirmasi pelapor", "Roller tray 2 sudah diganti baru.", 103],
  [3, "repaired", "Perbaikan #103 selesai — mohon konfirmasi", "Roller tray 2 sudah diganti baru, uji cetak 50 lembar lancar.", 103],
  [4, "assigned", "Tugas baru #101", "Anda ditugaskan menangani laporan #101.", 101],
];
for (const [u, t, title, body, rid] of notif) {
  await pool.query(`INSERT INTO notifications (user_id,type,title,body,report_id) VALUES ($1,$2,$3,$4,$5)`, [u, t, title, body, rid]);
}

console.log("✓ Data contoh berhasil diisi. Akun demo (kata sandi: password123):");
console.log("  admin.test@example.com | karyawan.test@example.com | karyawan2.test@example.com");
console.log("  teknisi.test@example.com | teknisi2.test@example.com");
await pool.end();
