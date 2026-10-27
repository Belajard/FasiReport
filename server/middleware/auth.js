import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { query } from "../db.js";
import { asyncHandler, forbidden, unauthorized } from "../lib/http.js";

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

/** Wajib login. Data user selalu diambil ulang dari DB agar role/status nonaktif langsung berlaku. */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw unauthorized();
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw unauthorized("Sesi telah berakhir. Silakan login kembali.");
  }
  const { rows } = await query(
    `SELECT id, name, email, role, phone, specialty, is_active, created_at, updated_at FROM users WHERE id=$1`,
    [payload.sub]
  );
  const user = rows[0];
  if (!user || !user.is_active) throw unauthorized("Akun tidak ditemukan atau sudah dinonaktifkan.");
  req.user = user;
  next();
});

/** Batasi akses berdasarkan role (RBAC di sisi server). */
export const requireRole =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user?.role) ? next() : next(forbidden());
