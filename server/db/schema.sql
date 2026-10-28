-- FasiReport — skema PostgreSQL
-- Dijalankan oleh: npm run db:migrate  (aman dijalankan berulang)

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('employee','admin','technician')),
  phone         VARCHAR(40),
  specialty     VARCHAR(120),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facilities (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(160) NOT NULL,
  location   VARCHAR(200) NOT NULL,
  category   VARCHAR(100) NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(160) NOT NULL,
  category     VARCHAR(160) NOT NULL,
  pic_name     VARCHAR(120),
  phone        VARCHAR(60),
  email        VARCHAR(190),
  contract_end DATE,
  notes        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ID laporan dimulai dari 101 agar sama dengan tampilan sebelumnya
CREATE SEQUENCE IF NOT EXISTS reports_id_seq START 101;

CREATE TABLE IF NOT EXISTS reports (
  id               INTEGER PRIMARY KEY DEFAULT nextval('reports_id_seq'),
  user_id          INTEGER NOT NULL REFERENCES users(id),
  facility_id      INTEGER NOT NULL REFERENCES facilities(id),
  description      TEXT NOT NULL,
  photo            TEXT,
  priority         VARCHAR(10) NOT NULL CHECK (priority IN ('low','medium','high')),
  status           VARCHAR(20) NOT NULL DEFAULT 'reported'
                   CHECK (status IN ('reported','assigned','processing','repaired','completed','rejected')),
  admin_note       TEXT,
  technician_id    INTEGER REFERENCES users(id),
  vendor_id        INTEGER REFERENCES vendors(id),
  vendor_ticket    VARCHAR(80),
  due_at           TIMESTAMPTZ,
  assigned_at      TIMESTAMPTZ,
  started_at       TIMESTAMPTZ,
  repaired_at      TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  after_photo      TEXT,
  repair_summary   TEXT,
  cost             NUMERIC(14,2) NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  reopen_count     INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_tech ON reports(technician_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_facility ON reports(facility_id);

CREATE TABLE IF NOT EXISTS report_histories (
  id         SERIAL PRIMARY KEY,
  report_id  INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  changed_by INTEGER REFERENCES users(id),
  status     VARCHAR(20) NOT NULL,
  note       TEXT,
  photo      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hist_report ON report_histories(report_id);

CREATE TABLE IF NOT EXISTS report_materials (
  id        SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  name      VARCHAR(160) NOT NULL,
  qty       NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  report_id  INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_report ON comments(report_id);

CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(40) NOT NULL,
  title      VARCHAR(200) NOT NULL,
  body       TEXT,
  report_id  INTEGER REFERENCES reports(id) ON DELETE CASCADE,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id             SERIAL PRIMARY KEY,
  facility       VARCHAR(200) NOT NULL,
  location       VARCHAR(200) NOT NULL,
  scheduled_date DATE NOT NULL,
  type           VARCHAR(250) NOT NULL,
  pic            VARCHAR(200) NOT NULL,
  technician_id  INTEGER REFERENCES users(id),
  vendor_id      INTEGER REFERENCES vendors(id),
  status         VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','ongoing','done')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(60) NOT NULL,
  entity     VARCHAR(40) NOT NULL,
  entity_id  INTEGER,
  detail     JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- Indeks untuk foreign key yang sering dipakai join/filter
CREATE INDEX IF NOT EXISTS idx_reports_vendor ON reports(vendor_id);
CREATE INDEX IF NOT EXISTS idx_hist_changed_by ON report_histories(changed_by);
CREATE INDEX IF NOT EXISTS idx_materials_report ON report_materials(report_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_report ON notifications(report_id);
CREATE INDEX IF NOT EXISTS idx_maint_tech ON maintenance_schedules(technician_id);
CREATE INDEX IF NOT EXISTS idx_maint_vendor ON maintenance_schedules(vendor_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

-- Keamanan (penting di Supabase): akses data hanya lewat server API (koneksi Postgres langsung).
-- RLS diaktifkan tanpa policy sehingga API publik Supabase (anon/authenticated) tidak dapat membaca/menulis tabel ini.
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors               ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports               ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_histories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_materials      ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;

-- Foto lampiran disimpan di database (bukan di folder server) agar tidak bergantung pada
-- sistem berkas/OS dan tetap ada saat server dipindah atau di-deploy ke hosting cloud.
CREATE TABLE IF NOT EXISTS uploads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mime       VARCHAR(40) NOT NULL,
  size       INTEGER NOT NULL,
  data       BYTEA NOT NULL,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(user_id);
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
