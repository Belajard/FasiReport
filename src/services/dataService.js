// Klien API FasiReport.
// Semua data kini tersimpan di PostgreSQL melalui server (folder /server).
// Pembacaan tetap sinkron dari cache lokal agar komponen tidak perlu berubah;
// setiap perubahan dikirim ke server lalu cache diperbarui, dan data disinkronkan
// otomatis (polling) sehingga perubahan dari pengguna lain ikut muncul.

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "fasireport_token";
const USER_KEY = "fasireport_user";
const POLL_MS = 8000;

// Sesi login disimpan di sessionStorage: berlaku selama tab/jendela terbuka (tetap login saat refresh),
// tetapi hilang saat browser/tab ditutup sehingga membuka aplikasi lagi selalu meminta login.
// Token lama di localStorage (versi sebelumnya) dibersihkan agar tidak auto-login.
try {
  window.localStorage.removeItem("fasireport_token");
  window.localStorage.removeItem("fasireport_user");
} catch {
  /* storage tidak tersedia */
}
const memStore = {};
export const safeLocalStorage = {
  getItem: (key) => {
    try {
      const v = window.sessionStorage.getItem(key);
      if (v !== null) return v;
    } catch {
      /* storage tidak tersedia */
    }
    return memStore[key] ?? null;
  },
  setItem: (key, value) => {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      /* abaikan */
    }
    memStore[key] = value;
  },
  removeItem: (key) => {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* abaikan */
    }
    delete memStore[key];
  },
};

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const formatDateId = (iso) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
};

class DataService {
  constructor() {
    this.listeners = new Set();
    this.cache = this.emptyCache();
    this.statsPeriod = "all";
    this.timer = null;
    this.refreshing = null;
    this.onUnauthorized = null;
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && this.getToken()) this.refresh().catch(() => {});
      });
    }
  }

  emptyCache() {
    return { reports: [], facilities: [], schedules: [], stats: null, notifications: [], unread: 0, technicians: [], vendors: [] };
  }

  // ---------- HTTP ----------
  async request(method, path, body, { auth = true } = {}) {
    const headers = {};
    if (body !== undefined && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
    const token = this.getToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    let res;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      });
    } catch {
      throw new Error("Tidak dapat terhubung ke server. Pastikan server API dan database sudah berjalan.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && auth && token && this.onUnauthorized) this.onUnauthorized(data.message);
      throw new Error(data.message || `Permintaan gagal (${res.status}).`);
    }
    return data;
  }

  // ---------- Sesi ----------
  getToken() {
    return safeLocalStorage.getItem(TOKEN_KEY);
  }
  getCurrentUser() {
    const raw = safeLocalStorage.getItem(USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  saveSession({ user, token }) {
    safeLocalStorage.setItem(TOKEN_KEY, token);
    safeLocalStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  /** Validasi sesi tersimpan ke server, lalu muat data awal. Mengembalikan user atau null. */
  async restoreSession() {
    if (!this.getToken()) return null;
    try {
      const { user } = await this.request("GET", "/auth/me");
      safeLocalStorage.setItem(USER_KEY, JSON.stringify(user));
      await this.start();
      return user;
    } catch (err) {
      if (/terhubung ke server/.test(err.message)) throw err;
      this.clearSession();
      return null;
    }
  }

  async login(email, password, role) {
    const res = await this.request("POST", "/auth/login", { email, password, role }, { auth: false });
    this.saveSession(res);
    await this.start();
    return res;
  }

  async register(name, email, password) {
    const res = await this.request("POST", "/auth/register", { name, email, password }, { auth: false });
    this.saveSession(res);
    await this.start();
    return res;
  }

  clearSession() {
    this.stop();
    this.generation = (this.generation || 0) + 1; // batalkan refresh milik sesi lama
    this.refreshing = null;
    safeLocalStorage.removeItem(TOKEN_KEY);
    safeLocalStorage.removeItem(USER_KEY);
    this.cache = this.emptyCache();
  }
  logout() {
    this.clearSession();
  }

  async changePassword(current_password, new_password) {
    return this.request("POST", "/auth/change-password", { current_password, new_password });
  }
  async updateProfile(data) {
    const { user } = await this.request("PATCH", "/auth/me", data);
    safeLocalStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  }

  // ---------- Sinkronisasi ----------
  async start() {
    this.stop();
    await this.refresh();
    this.timer = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") this.refresh().catch(() => {});
    }, POLL_MS);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  refresh() {
    if (this.refreshing) return this.refreshing;
    const user = this.getCurrentUser();
    if (!user) return Promise.resolve();
    const gen = this.generation || 0;
    const job = (async () => {
      const jobs = [
        this.request("GET", "/reports"),
        this.request("GET", "/facilities"),
        this.request("GET", "/maintenance"),
        this.request("GET", `/stats?period=${this.statsPeriod}`),
        this.request("GET", "/notifications"),
      ];
      if (user.role === "admin") {
        jobs.push(this.request("GET", "/users/technicians"), this.request("GET", "/vendors"));
      } else if (user.role === "technician") {
        jobs.push(this.request("GET", "/vendors"));
      }
      const [reports, facilities, maint, stats, notif, extra1, extra2] = await Promise.all(jobs);
      if (gen !== (this.generation || 0)) return; // sesi sudah berganti: buang hasil lama
      this.cache.reports = reports.data;
      this.cache.facilities = facilities.data;
      this.cache.schedules = maint.data.map((m) => ({ ...m, date: formatDateId(m.date_iso) }));
      this.cache.stats = stats.data;
      this.cache.notifications = notif.data;
      this.cache.unread = notif.unread;
      if (user.role === "admin") {
        this.cache.technicians = extra1.data;
        this.cache.vendors = extra2.data;
      } else if (user.role === "technician") {
        this.cache.vendors = extra1.data;
      }
      this.emit("refresh");
    })().finally(() => {
      if (this.refreshing === job) this.refreshing = null;
    });
    this.refreshing = job;
    return job;
  }

  /** Setelah perubahan data: ambil ulang dari server lalu beri tahu semua komponen. */
  async afterChange(event) {
    await this.refresh();
    this.emit(event);
  }

  emit(event) {
    for (const cb of this.listeners) {
      try {
        cb({ event });
      } catch (e) {
        console.warn(e);
      }
    }
  }
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // ---------- Pembacaan (sinkron dari cache) ----------
  getFacilities(role) {
    return role === "employee" || role === "technician"
      ? this.cache.facilities.filter((f) => f.status === "active")
      : this.cache.facilities;
  }
  getFacilityById(id) {
    return this.cache.facilities.find((f) => f.id === id);
  }
  getReports() {
    return this.cache.reports;
  }
  getReportById(id) {
    return this.cache.reports.find((r) => r.id === id);
  }
  getAdminStats() {
    return (
      this.cache.stats || {
        totalReports: 0, reportedCount: 0, assignedCount: 0, processingCount: 0, repairedCount: 0,
        completedCount: 0, rejectedCount: 0, activeFacilitiesCount: 0, overdueCount: 0,
        priorityCounts: { low: 0, medium: 0, high: 0 },
      }
    );
  }
  getStats() {
    return this.getAdminStats();
  }
  async setStatsPeriod(period) {
    this.statsPeriod = period;
    await this.afterChange("stats_period");
  }
  getMaintenanceSchedules() {
    return this.cache.schedules;
  }
  getTechnicians() {
    return this.cache.technicians;
  }
  getVendors() {
    return this.cache.vendors;
  }
  getNotifications() {
    return { items: this.cache.notifications, unread: this.cache.unread };
  }

  // ---------- Fasilitas ----------
  async createFacility(data) {
    const res = await this.request("POST", "/facilities", data);
    await this.afterChange("facility_created");
    return res.data;
  }
  async updateFacility(id, data) {
    const res = await this.request("PATCH", `/facilities/${id}`, data);
    await this.afterChange("facility_updated");
    return res.data;
  }
  async toggleFacilityStatus(id) {
    const f = this.getFacilityById(id);
    if (!f) throw new Error("Fasilitas tidak ditemukan.");
    return this.updateFacility(id, { status: f.status === "active" ? "inactive" : "active" });
  }
  async getFacilityHistory(id) {
    return (await this.request("GET", `/facilities/${id}/history`)).data;
  }

  // ---------- Laporan ----------
  async uploadPhoto(file) {
    const fd = new FormData();
    fd.append("file", file);
    return (await this.request("POST", "/uploads", fd)).url;
  }
  async createReport(data) {
    const res = await this.request("POST", "/reports", data);
    await this.afterChange("report_created");
    return res.data;
  }
  async updateReport(id, data) {
    const res = await this.request("PATCH", `/reports/${id}`, data);
    await this.afterChange("report_updated");
    return res.data;
  }
  async deleteReport(id) {
    await this.request("DELETE", `/reports/${id}`);
    await this.afterChange("report_deleted");
  }
  /** Aksi alur kerja: assign, reject, start, decline, progress, finish, confirm, dispute, force_complete */
  async transition(id, action, payload = {}) {
    const res = await this.request("POST", `/reports/${id}/transition`, { action, ...payload });
    await this.afterChange("report_status_changed");
    return res.data;
  }
  async getComments(reportId) {
    return (await this.request("GET", `/reports/${reportId}/comments`)).data;
  }
  async addComment(reportId, body) {
    const res = await this.request("POST", `/reports/${reportId}/comments`, { body });
    await this.afterChange("comment_added");
    return res.data;
  }

  // ---------- Jadwal pemeliharaan ----------
  async createMaintenanceSchedule(data) {
    const res = await this.request("POST", "/maintenance", data);
    await this.afterChange("maintenance_change");
    return res.data;
  }
  async updateMaintenanceSchedule(id, data) {
    const res = await this.request("PATCH", `/maintenance/${id}`, data);
    await this.afterChange("maintenance_change");
    return res.data;
  }
  async deleteMaintenanceSchedule(id) {
    await this.request("DELETE", `/maintenance/${id}`);
    await this.afterChange("maintenance_change");
    return true;
  }
  async toggleMaintenanceStatus(id) {
    const res = await this.request("POST", `/maintenance/${id}/advance`);
    await this.afterChange("maintenance_change");
    return res.data;
  }

  // ---------- Notifikasi ----------
  async markNotificationRead(id) {
    await this.request("POST", `/notifications/${id}/read`);
    await this.afterChange("notifications");
  }
  async markAllNotificationsRead() {
    await this.request("POST", "/notifications/read-all");
    await this.afterChange("notifications");
  }

  // ---------- Admin: pengguna, vendor, audit ----------
  async getUsers() {
    return (await this.request("GET", "/users")).data;
  }
  async createUser(data) {
    const res = await this.request("POST", "/users", data);
    await this.afterChange("users");
    return res.data;
  }
  async updateUser(id, data) {
    const res = await this.request("PATCH", `/users/${id}`, data);
    await this.afterChange("users");
    return res.data;
  }
  async deleteUser(id) {
    await this.request("DELETE", `/users/${id}`);
    await this.afterChange("users");
  }
  async createVendor(data) {
    const res = await this.request("POST", "/vendors", data);
    await this.afterChange("vendors");
    return res.data;
  }
  async updateVendor(id, data) {
    const res = await this.request("PATCH", `/vendors/${id}`, data);
    await this.afterChange("vendors");
    return res.data;
  }
  async deleteVendor(id) {
    await this.request("DELETE", `/vendors/${id}`);
    await this.afterChange("vendors");
  }
  async getAuditLogs(limit = 100) {
    return (await this.request("GET", `/audit?limit=${limit}`)).data;
  }
}

export const dataService = new DataService();
