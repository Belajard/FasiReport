import "dotenv/config";

const isProd = process.env.NODE_ENV === "production";

if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24)) {
  throw new Error("JWT_SECRET wajib diisi (minimal 24 karakter) pada mode production.");
}

export const config = {
  isProd,
  port: Number(process.env.PORT || 4000),
  databaseUrl:
    process.env.DATABASE_URL || "postgres://fasireport:fasireport@localhost:5432/fasireport",
  // SSL otomatis aktif untuk Supabase (atau paksa dengan DATABASE_SSL=true / matikan dengan false)
  databaseSsl:
    process.env.DATABASE_SSL !== undefined
      ? process.env.DATABASE_SSL === "true"
      : /supabase\.(co|com)/.test(process.env.DATABASE_URL || ""),
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me-please-0000",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map((s) => s.trim()),
  uploadDir: process.env.UPLOAD_DIR || new URL("./uploads", import.meta.url).pathname,
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 5),
  // Batas waktu penanganan (SLA) dalam jam, dihitung sejak laporan ditugaskan
  slaHours: { high: 24, medium: 72, low: 168 },
};
