// Tes alur end-to-end API. Jalankan: npm test  (butuh PostgreSQL + `npm run db:seed`)
process.env.NODE_ENV = "test";
import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../index.js";
import { pool } from "../db.js";

let server, base;
test.before(async () => {
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});
test.after(async () => { server.close(); await pool.end(); });

async function call(method, path, token, body) {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
const login = async (email, role) => (await call("POST", "/auth/login", null, { email, password: "password123", role })).body.token;

test("login: role tab harus cocok & password salah ditolak", async () => {
  assert.equal((await call("POST", "/auth/login", null, { email: "admin.test@example.com", password: "salah" })).status, 401);
  const wrongTab = await call("POST", "/auth/login", null, { email: "admin.test@example.com", password: "password123", role: "employee" });
  assert.equal(wrongTab.status, 401);
  assert.equal((await call("POST", "/auth/login", null, { email: "teknisi.test@example.com", password: "password123", role: "technician" })).status, 200);
});

test("RBAC: endpoint tanpa token / role salah ditolak", async () => {
  assert.equal((await call("GET", "/reports")).status, 401);
  const emp = await login("karyawan.test@example.com", "employee");
  assert.equal((await call("GET", "/users", emp)).status, 403);
  assert.equal((await call("POST", "/facilities", emp, { name: "X", location: "Y", category: "Z" })).status, 403);
});

test("alur lengkap: lapor → verifikasi+tugaskan → teknisi kerjakan → karyawan konfirmasi", async () => {
  const emp = await login("karyawan.test@example.com", "employee");
  const adm = await login("admin.test@example.com", "admin");
  const tech = await login("teknisi.test@example.com", "technician");
  const tech2 = await login("teknisi2.test@example.com", "technician");
  const emp2 = await login("karyawan2.test@example.com", "employee");

  const created = await call("POST", "/reports", emp, { facility_id: 1, description: "Tes alur: AC bocor air di plafon.", priority: "high" });
  assert.equal(created.status, 201);
  const id = created.body.data.id;
  assert.equal(created.body.data.status, "reported");

  // karyawan lain tidak bisa melihat
  assert.equal((await call("GET", `/reports/${id}`, emp2)).status, 404);
  // karyawan tidak bisa menugaskan
  assert.equal((await call("POST", `/reports/${id}/transition`, emp, { action: "assign", technician_id: 4 })).status, 403);
  // tidak boleh lompat status
  assert.equal((await call("POST", `/reports/${id}/transition`, adm, { action: "finish", summary: "x y z" })).status, 400);

  const techs = (await call("GET", "/users/technicians", adm)).body.data;
  assert.ok(techs.length >= 2);
  const tid = techs.find((t) => t.email === "teknisi.test@example.com").id;

  const assigned = await call("POST", `/reports/${id}/transition`, adm, { action: "assign", technician_id: tid });
  assert.equal(assigned.status, 200);
  assert.equal(assigned.body.data.status, "assigned");
  assert.ok(assigned.body.data.due_at, "SLA due_at terisi");

  // teknisi lain tidak bisa menyentuh tugas ini
  assert.equal((await call("GET", `/reports/${id}`, tech2)).status, 404);
  // teknisi yang ditunjuk melihat tugasnya + mendapat notifikasi
  const mine = (await call("GET", "/reports", tech)).body.data;
  assert.ok(mine.some((r) => r.id === id));
  const notifs = (await call("GET", "/notifications", tech)).body;
  assert.ok(notifs.data.some((n) => n.report_id === id && n.type === "assigned"));

  assert.equal((await call("POST", `/reports/${id}/transition`, tech, { action: "start" })).body.data.status, "processing");
  assert.equal((await call("POST", `/reports/${id}/transition`, tech, { action: "progress", note: "Menunggu suku cadang" })).status, 200);
  // finish wajib ringkasan
  assert.equal((await call("POST", `/reports/${id}/transition`, tech, { action: "finish" })).status, 400);
  const fin = await call("POST", `/reports/${id}/transition`, tech, {
    action: "finish", summary: "Pipa kondensasi diganti.", materials: [{ name: "Pipa PVC", qty: 2, unit_cost: 25000 }],
  });
  assert.equal(fin.body.data.status, "repaired");
  assert.equal(fin.body.data.cost, 50000);

  // karyawan menolak hasil → kembali ke teknisi
  const dis = await call("POST", `/reports/${id}/transition`, emp, { action: "dispute", note: "Masih menetes" });
  assert.equal(dis.body.data.status, "processing");
  assert.equal(dis.body.data.reopen_count, 1);
  await call("POST", `/reports/${id}/transition`, tech, { action: "finish", summary: "Sambungan disegel ulang." });
  const done = await call("POST", `/reports/${id}/transition`, emp, { action: "confirm" });
  assert.equal(done.body.data.status, "completed");
  assert.ok(done.body.data.status_histories.length >= 8);

  // sudah selesai: tidak bisa diubah lagi
  assert.equal((await call("POST", `/reports/${id}/transition`, emp, { action: "confirm" })).status, 400);

  const cm = await call("POST", `/reports/${id}/comments`, emp, { body: "Terima kasih!" });
  assert.equal(cm.status, 201);
});

test("admin menolak laporan, teknisi menolak tugas, tugaskan ke vendor", async () => {
  const emp = await login("karyawan.test@example.com", "employee");
  const adm = await login("admin.test@example.com", "admin");
  const tech = await login("teknisi.test@example.com", "technician");
  const mk = async () => (await call("POST", "/reports", emp, { facility_id: 2, description: "Tes cabang alur lampu mati.", priority: "low" })).body.data.id;

  const a = await mk();
  assert.equal((await call("POST", `/reports/${a}/transition`, adm, { action: "reject" })).status, 400); // alasan wajib
  assert.equal((await call("POST", `/reports/${a}/transition`, adm, { action: "reject", note: "Duplikat laporan lain" })).body.data.status, "rejected");

  const b = await mk();
  await call("POST", `/reports/${b}/transition`, adm, { action: "assign", technician_id: 4 });
  const dec = await call("POST", `/reports/${b}/transition`, tech, { action: "decline", note: "Butuh vendor lift" });
  assert.equal(dec.body.data.status, "reported");
  assert.equal(dec.body.data.technician_id, null);

  const c = await mk();
  assert.equal((await call("POST", `/reports/${c}/transition`, adm, { action: "assign", technician_id: 4, vendor_id: 1 })).status, 400);
  const v = await call("POST", `/reports/${c}/transition`, adm, { action: "assign", vendor_id: 1, vendor_ticket: "TKT-77" });
  assert.equal(v.body.data.vendor.id, 1);
  // admin boleh mewakili vendor
  assert.equal((await call("POST", `/reports/${c}/transition`, adm, { action: "start" })).body.data.status, "processing");

  for (const id of [a, b, c]) await call("DELETE", `/reports/${id}`, adm).catch(() => {});
});

test("validasi input & statistik", async () => {
  const emp = await login("karyawan.test@example.com", "employee");
  const adm = await login("admin.test@example.com", "admin");
  assert.equal((await call("POST", "/reports", emp, { facility_id: 1, description: "pendek", priority: "high" })).status, 400);
  assert.equal((await call("POST", "/reports", emp, { facility_id: 5, description: "Lift sedang nonaktif tes", priority: "high" })).status, 400);
  const s = (await call("GET", "/stats?period=30d", adm)).body.data;
  assert.equal(typeof s.totalReports, "number");
  assert.ok(Array.isArray(s.trend));
  assert.equal((await call("GET", "/audit", adm)).status, 200);
});

test("upload foto: tersimpan di database, bisa diambil kembali, format lain ditolak", async () => {
  const emp = await login("karyawan.test@example.com", "employee");
  // PNG 1x1 valid
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const send = (type, buf, token = emp) => {
    const fd = new FormData();
    fd.append("file", new Blob([buf], { type }), "x");
    return fetch(base + "/uploads", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
  };
  const ok = await send("image/png", png);
  assert.equal(ok.status, 201);
  const { url } = await ok.json();
  assert.match(url, /^\/api\/uploads\/[0-9a-f-]{36}$/);
  const got = await fetch(base.replace("/api", "") + url);
  assert.equal(got.status, 200);
  assert.equal(got.headers.get("content-type"), "image/png");
  assert.equal(Buffer.from(await got.arrayBuffer()).length, png.length);
  assert.equal((await send("text/plain", Buffer.from("x"))).status, 400);
  assert.equal((await send("image/png", png, null)).status, 401);
  assert.equal((await fetch(base + "/uploads/bukan-uuid")).status, 404);
});

test("hapus laporan: karyawan hanya yang belum diproses, admin boleh semua status + tercatat di audit", async () => {
  const emp = await login("karyawan.test@example.com", "employee");
  const emp2 = await login("karyawan2.test@example.com", "employee");
  const adm = await login("admin.test@example.com", "admin");
  const tech = await login("teknisi.test@example.com", "technician");
  const mk = async () => (await call("POST", "/reports", emp, { facility_id: 1, description: "Tes hapus: laporan uji coba dihapus.", priority: "low" })).body.data.id;

  const a = await mk();
  assert.equal((await call("DELETE", `/reports/${a}`, emp2)).status, 404); // bukan pemiliknya
  assert.equal((await call("DELETE", `/reports/${a}`, tech)).status, 403);  // teknisi tidak boleh

  // laporan sudah diproses: karyawan ditolak, admin berhasil
  const techUser = (await call("GET", "/users/technicians", adm)).body.data.find((t) => t.email === "teknisi.test@example.com");
  await call("POST", `/reports/${a}/transition`, adm, { action: "assign", technician_id: techUser.id });
  await call("POST", `/reports/${a}/transition`, tech, { action: "start" });
  assert.equal((await call("DELETE", `/reports/${a}`, emp)).status, 409);
  assert.equal((await call("DELETE", `/reports/${a}`, adm)).status, 200);
  assert.equal((await call("GET", `/reports/${a}`, adm)).status, 404);

  const log = (await call("GET", "/audit", adm)).body.data;
  assert.ok(log.some((l) => l.action === "delete" && l.entity === "report" && l.entity_id === a));
});
