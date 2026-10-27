import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { query } from "../db.js";
import { asyncHandler, badRequest, parse, unauthorized } from "../lib/http.js";
import { audit } from "../lib/audit.js";
import { requireAuth, signToken } from "../middleware/auth.js";

const router = Router();

// Batasi percobaan login brute-force: 10x / 15 menit per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit." },
  skip: () => process.env.NODE_ENV === "test",
});

const ROLE_LABEL = { employee: "Karyawan", admin: "Admin", technician: "Teknisi" };
const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role,
  phone: u.phone ?? null, specialty: u.specialty ?? null,
  created_at: u.created_at, updated_at: u.updated_at,
});

const emailSchema = z.string().trim().toLowerCase().email("Format email tidak valid").max(190);
const passwordSchema = z.string().min(8, "Kata sandi minimal 8 karakter").max(100);

router.post("/login", loginLimiter, asyncHandler(async (req, res) => {
  const { email, password, role } = parse(
    z.object({
      email: emailSchema,
      password: z.string().min(1, "Kata sandi wajib diisi"),
      role: z.enum(["employee", "admin", "technician"]).optional(),
    }),
    req.body
  );
  const { rows } = await query(`SELECT * FROM users WHERE email=$1`, [email]);
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw unauthorized("Email atau kata sandi tidak cocok dengan data kami.");
  if (!user.is_active) throw unauthorized("Akun Anda dinonaktifkan. Hubungi administrator.");
  if (role && user.role !== role) {
    throw unauthorized(`Akun ini bukan akun ${ROLE_LABEL[role]}. Pilih tab login yang sesuai.`);
  }
  await audit(null, user.id, "login", "user", user.id);
  res.json({ user: publicUser(user), token: signToken(user) });
}));

// Registrasi publik hanya untuk karyawan
router.post("/register", loginLimiter, asyncHandler(async (req, res) => {
  const { name, email, password } = parse(
    z.object({ name: z.string().trim().min(2, "Nama minimal 2 karakter").max(120), email: emailSchema, password: passwordSchema }),
    req.body
  );
  const exists = await query(`SELECT 1 FROM users WHERE email=$1`, [email]);
  if (exists.rowCount) throw badRequest("Email sudah terdaftar. Silakan gunakan email lain atau login.");
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,'employee') RETURNING *`,
    [name, email, hash]
  );
  await audit(null, rows[0].id, "register", "user", rows[0].id);
  res.status(201).json({ user: publicUser(rows[0]), token: signToken(rows[0]) });
}));

router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.patch("/me", requireAuth, asyncHandler(async (req, res) => {
  const data = parse(
    z.object({
      name: z.string().trim().min(2).max(120).optional(),
      phone: z.string().trim().max(40).nullable().optional(),
    }),
    req.body
  );
  const { rows } = await query(
    `UPDATE users SET name=COALESCE($2,name), phone=CASE WHEN $3::boolean THEN $4 ELSE phone END, updated_at=NOW()
     WHERE id=$1 RETURNING *`,
    [req.user.id, data.name ?? null, data.phone !== undefined, data.phone ?? null]
  );
  res.json({ user: publicUser(rows[0]) });
}));

router.post("/change-password", requireAuth, asyncHandler(async (req, res) => {
  const { current_password, new_password } = parse(
    z.object({ current_password: z.string().min(1, "Kata sandi lama wajib diisi"), new_password: passwordSchema }),
    req.body
  );
  const { rows } = await query(`SELECT password_hash FROM users WHERE id=$1`, [req.user.id]);
  if (!(await bcrypt.compare(current_password, rows[0].password_hash))) {
    throw badRequest("Kata sandi lama tidak sesuai.");
  }
  await query(`UPDATE users SET password_hash=$2, updated_at=NOW() WHERE id=$1`, [
    req.user.id, await bcrypt.hash(new_password, 10),
  ]);
  await audit(null, req.user.id, "change_password", "user", req.user.id);
  res.json({ message: "Kata sandi berhasil diperbarui." });
}));

export default router;
