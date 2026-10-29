import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../services/dataService";
import { ReportStatusBadge } from "../components/ReportStatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { ReportModal } from "../components/ReportModal";
import { FacilityModal } from "../components/FacilityModal";
import { MaintenanceModal } from "../components/MaintenanceModal";
import { Pagination, paginate } from "../components/Pagination";
import { OverdueBadge } from "../components/OverdueBadge";
import { ScheduleDueBadge } from "../components/ScheduleDueBadge";
import { FacilityHistoryModal } from "../components/FacilityHistoryModal";
import { AdminInsights } from "../components/AdminInsights";
import { DirectoryPage } from "./DirectoryPage";
import { UsersPage } from "./UsersPage";
import { AuditPage } from "./AuditPage";
import { ModalShell } from "../components/ui";
import { ReportDateFilter, inDateRange } from "../components/ReportDateFilter";
import {
  Plus,
  Clock,
  Search,
  MapPin,
  Eye,
  Pencil,
  ArrowUpRight,
  CheckCheck,
  Wrench,
  Inbox,
  Sparkles,
  Download,
  AlertTriangle,
  Building2,
  PieChart as PieIcon,
  RotateCcw,
  CalendarDays,
  BookOpenCheck,
  Trash2,
  PhoneCall,
  UserCheck,
  History
} from "lucide-react";
export const AdminView = ({ currentTab, onSelectTab, focusReportId, onFocusHandled }) => {
  const { user, showToast } = useAuth();
  const [stats, setStats] = useState({
    totalReports: 0,
    reportedCount: 0,
    assignedCount: 0,
    rejectedCount: 0,
    overdueCount: 0,
    processingCount: 0,
    repairedCount: 0,
    completedCount: 0,
    activeFacilitiesCount: 0,
    priorityCounts: { low: 0, medium: 0, high: 0 }
  });
  const [reports, setReports] = useState([]);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [period, setPeriod] = useState(dataService.statsPeriod);
  const [facilities, setFacilities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState("all");
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState("");
  const [hoveredPriority, setHoveredPriority] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [facilityModalOpen, setFacilityModalOpen] = useState(false);
  const [facilityToEdit, setFacilityToEdit] = useState(null);
  const [historyFacility, setHistoryFacility] = useState(null);
  const [maintenanceSchedules, setMaintenanceSchedules] = useState([]);
  const [maintenanceSearchQuery, setMaintenanceSearchQuery] = useState("");
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState("all");
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [maintenanceToEdit, setMaintenanceToEdit] = useState(null);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [isDeletingReport, setIsDeletingReport] = useState(false);
  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;
    try {
      setIsDeletingReport(true);
      await dataService.deleteReport(reportToDelete.id);
      showToast(`Laporan #${reportToDelete.id} berhasil dihapus permanen.`, "success");
      setReportToDelete(null);
      loadData();
    } catch (err) {
      showToast(err.message || "Gagal menghapus laporan.", "error");
    } finally {
      setIsDeletingReport(false);
    }
  };
  const loadData = () => {
    if (!user) return;
    const allReports = dataService.getReports(user);
    setReports(allReports);
    const allFacilities = dataService.getFacilities("admin");
    setFacilities(allFacilities);
    const adminStats = dataService.getAdminStats();
    setStats(adminStats);
    const schedules = dataService.getMaintenanceSchedules();
    setMaintenanceSchedules(schedules);
    if (selectedReport) {
      const refreshed = allReports.find((r) => r.id === selectedReport.id);
      setSelectedReport(refreshed || null);
    }
  };
  useEffect(() => {
    loadData();
    const unsubscribe = dataService.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [user]);
  useEffect(() => {
    if (!focusReportId) return;
    const r = reports.find((x) => x.id === focusReportId);
    if (r) {
      setSelectedReport(r);
      if (onFocusHandled) onFocusHandled();
    }
  }, [focusReportId, reports]);
  if (!user) return null;
  const handleToggleFacility = async (facilityId) => {
    try {
      const updated = await dataService.toggleFacilityStatus(facilityId);
      showToast(
        `Fasilitas '${updated.name}' kini berstatus ${updated.status === "active" ? "Aktif" : "Nonaktif"}.`,
        "success"
      );
      loadData();
    } catch (err) {
      showToast(err.message || "Gagal mengubah status fasilitas.", "error");
    }
  };
  const handleDeleteMaintenance = async (id, name) => {
    if (window.confirm(`Hapus agenda servis rutin untuk '${name}'?`)) {
      try {
        await dataService.deleteMaintenanceSchedule(id);
        showToast(`Jadwal servis '${name}' berhasil dihapus.`, "success");
        loadData();
      } catch (err) {
        showToast(err.message || "Gagal menghapus jadwal.", "error");
      }
    }
  };
  const handleToggleMaintenanceStatus = async (id) => {
    try {
      const updated = await dataService.toggleMaintenanceStatus(id);
      const label = updated.status === "done" ? "Selesai Dilakukan" : updated.status === "ongoing" ? "Sedang Berjalan" : "Mendatang";
      showToast(`Status servis '${updated.facility}' diubah: ${label}.`, "success");
      loadData();
    } catch (err) {
      showToast(err.message || "Gagal mengubah status agenda servis.", "error");
    }
  };
  const handleWorkflowCardClick = (status) => {
    if (dashboardStatusFilter === status) {
      setDashboardStatusFilter("all");
    } else {
      setDashboardStatusFilter(status);
    }
  };
  const handleExportCSV = () => {
    if (reports.length === 0) {
      showToast("Belum ada data laporan untuk diekspor.", "error");
      return;
    }
    const list = filteredReports.length ? filteredReports : reports;
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = ["ID", "Fasilitas", "Kategori", "Lokasi", "Pelapor", "Prioritas", "Status", "Penanggung Jawab", "Tanggal Lapor", "Batas SLA", "Tanggal Selesai", "Terlambat", "Biaya (Rp)", "Deskripsi Kerusakan", "Ringkasan Perbaikan"];
    const fmtDate = (d) => d ? new Date(d).toLocaleString("id-ID") : "";
    const rows = list.map((r) => [
      r.id,
      esc(r.facility?.name),
      esc(r.facility?.category),
      esc(r.facility?.location),
      esc(r.user?.name),
      r.priority,
      r.status,
      esc(r.technician?.name || (r.vendor ? `${r.vendor.name} (vendor)` : "")),
      esc(fmtDate(r.created_at)),
      esc(fmtDate(r.due_at)),
      esc(fmtDate(r.completed_at)),
      r.is_overdue ? "Ya" : "Tidak",
      Number(r.cost) || 0,
      esc(r.description),
      esc(r.repair_summary)
    ]);
    const csvContent = ["\ufeff" + headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `FasiReport_Laporan_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Data laporan berhasil diekspor ke format CSV.", "success");
  };
  const filteredReports = reports.filter((r) => {
    const matchesSearch = (r.facility?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || (r.user?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || r.description.toLowerCase().includes(searchQuery.toLowerCase()) || r.id.toString().includes(searchQuery);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || r.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority && inDateRange(r.created_at, dateFrom, dateTo);
  });
  const periodDays = { "7d": 7, "30d": 30, "90d": 90 }[period];
  const inPeriod = (r) => !periodDays || Date.now() - new Date(r.created_at).getTime() <= periodDays * 864e5;
  useEffect(() => setPage(1), [searchQuery, statusFilter, priorityFilter, dateFrom, dateTo]);
  const dashboardFilteredReports = reports.filter((r) => {
    const matchesStatus = dashboardStatusFilter === "all" || r.status === dashboardStatusFilter;
    const matchesSearch = (r.facility?.name || "").toLowerCase().includes(dashboardSearchQuery.toLowerCase()) || (r.user?.name || "").toLowerCase().includes(dashboardSearchQuery.toLowerCase()) || r.description.toLowerCase().includes(dashboardSearchQuery.toLowerCase()) || r.id.toString().includes(dashboardSearchQuery);
    const matchesPriority = priorityFilter === "all" || r.priority === priorityFilter;
    return matchesStatus && matchesSearch && matchesPriority && inPeriod(r);
  });
  const total = stats.totalReports;
  const highCount = stats.priorityCounts.high;
  const medCount = stats.priorityCounts.medium;
  const lowCount = stats.priorityCounts.low;
  const highPct = total > 0 ? highCount / total * 100 : 0;
  const medPct = total > 0 ? medCount / total * 100 : 0;
  const lowPct = total > 0 ? lowCount / total * 100 : 0;
  const R = 46;
  const CIRCLE_LENGTH = 2 * Math.PI * R;
  const highLen = total > 0 ? highCount / total * CIRCLE_LENGTH : 0;
  const medLen = total > 0 ? medCount / total * CIRCLE_LENGTH : 0;
  const lowLen = total > 0 ? lowCount / total * CIRCLE_LENGTH : 0;
  const urgentReportsCount = reports.filter((r) => r.priority === "high" && !["completed", "rejected"].includes(r.status)).length;
  return <div className="space-y-6">
      
      {
    /* 1. DASHBOARD TAB VIEW */
  }
      {currentTab === "dashboard" && <div className="space-y-6">
          
          {
    /* Top Greeting Banner - Exactly matches Employee View styling and teal colors */
  }
          <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-teal-500 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-teal-700/30 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-[11px] font-bold tracking-wider uppercase mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                  DASHBOARD ADMINISTRATOR
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
                  Pusat Kontrol Fasilitas
                </h1>
                <p className="text-xs sm:text-sm text-teal-100/80 mt-1.5 leading-relaxed">
                  Pantau seluruh sarana kerja, kelola tiket aduan karyawan secara tanggap, dan pastikan fasilitas operasional berfungsi prima.
                </p>
              </div>

              {
    /* Quick Action Buttons on Banner */
  }
              <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
                <button
    onClick={() => {
      setMaintenanceToEdit(null);
      setMaintenanceModalOpen(true);
    }}
    className="px-3.5 py-2.5 text-xs font-bold text-teal-100 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl flex items-center gap-1.5 transition-all shadow-xs backdrop-blur-xs"
    title="Tambah agenda pemeliharaan rutin fasilitas"
  >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>+ Jadwal Servis</span>
                </button>
                <button
    onClick={() => {
      setFacilityToEdit(null);
      setFacilityModalOpen(true);
    }}
    className="px-3.5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-xl flex items-center gap-1.5 transition-all shadow-xs border border-teal-400/30"
  >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Fasilitas</span>
                </button>
                <button
    onClick={() => onSelectTab("all-reports")}
    className="px-4 py-2.5 text-xs font-bold text-teal-950 bg-teal-300 hover:bg-teal-200 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
  >
                  <span>Buka Semua Laporan</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {
    /* Interactive Urgent Alert Notice (If any high priority report is pending) */
  }
          {urgentReportsCount > 0 && <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-rose-900 dark:text-rose-200">
                    Perhatian Khusus: Prioritas Tinggi
                  </div>
                  <p className="text-rose-700 dark:text-rose-300/90 text-xs mt-0.5">
                    Terdapat <strong>{urgentReportsCount} tiket aduan Prioritas Tinggi</strong> yang belum selesai dan memerlukan koordinasi teknisi segera.
                  </p>
                </div>
              </div>
              <button
    onClick={() => {
      setPriorityFilter("high");
      setStatusFilter("all");
      onSelectTab("all-reports");
    }}
    className="self-start sm:self-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shrink-0 transition-all flex items-center gap-1.5 shadow-xs"
  >
                <span>Tinjau Tiket Mendesak</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>}

          {(stats.overdueCount > 0 || stats.reportedCount > 0) && <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.reportedCount > 0 && <button
    onClick={() => { setStatusFilter("reported"); onSelectTab("all-reports"); }}
    className="text-left bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 flex items-center gap-3 hover:border-amber-400 transition-colors"
  >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="text-xs text-amber-900 dark:text-amber-200">
                    <div className="font-extrabold text-sm">Menunggu Verifikasi</div>
                    <strong>{stats.reportedCount} laporan baru</strong> perlu diverifikasi dan ditugaskan ke teknisi.
                  </div>
                </button>}
              {stats.overdueCount > 0 && <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="text-xs text-rose-900 dark:text-rose-200">
                    <div className="font-extrabold text-sm">Melewati Batas Waktu (SLA)</div>
                    <strong>{stats.overdueCount} tugas</strong> belum selesai melewati tenggat penanganan.
                  </div>
                </div>}
            </div>}

          {
    /* Top 4 Interactive Workflow Metrics: No number prefixes, matching employee theme */
  }
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Alur & Status Pengerjaan Laporan
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Klik kartu status di bawah untuk menyaring daftar laporan secara langsung
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs">
                  <span className="text-[11px] text-slate-400 font-semibold">Periode:</span>
                  <select
    value={period}
    onChange={async (e) => {
      setPeriod(e.target.value);
      try { await dataService.setStatsPeriod(e.target.value); } catch (err) { showToast(err.message, "error"); }
    }}
    className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
  >
                    <option value="all" className="dark:bg-slate-800">Semua Waktu</option>
                    <option value="7d" className="dark:bg-slate-800">7 Hari Terakhir</option>
                    <option value="30d" className="dark:bg-slate-800">30 Hari Terakhir</option>
                    <option value="90d" className="dark:bg-slate-800">90 Hari Terakhir</option>
                  </select>
                </div>
              {dashboardStatusFilter !== "all" && <button
    onClick={() => setDashboardStatusFilter("all")}
    className="px-2.5 py-1 text-xs font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 rounded-lg flex items-center gap-1 transition-colors"
  >
                  <RotateCcw className="w-3 h-3" />
                  <span>Tampilkan Semua Status</span>
                </button>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {
    /* Dilaporkan Card */
  }
              <div
    onClick={() => handleWorkflowCardClick("reported")}
    className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-xs transition-all cursor-pointer group text-left relative overflow-hidden ${dashboardStatusFilter === "reported" ? "border-amber-500 ring-2 ring-amber-400/40 bg-amber-50/20 dark:bg-amber-950/20" : "border-slate-200/90 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500"}`}
  >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Dilaporkan
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/40">
                    <Clock className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {stats.reportedCount}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Menunggu verifikasi admin
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Respons Awal</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>{dashboardStatusFilter === "reported" ? "Aktif Terfilter" : "Filter Tiket"}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {
    /* Ditugaskan Card */
  }
              <div
    onClick={() => handleWorkflowCardClick("assigned")}
    className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-xs transition-all cursor-pointer group text-left relative overflow-hidden ${dashboardStatusFilter === "assigned" ? "border-teal-500 ring-2 ring-teal-400/40 bg-teal-50/20 dark:bg-teal-950/20" : "border-slate-200/90 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-500"}`}
  >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    Ditugaskan
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-200/50 dark:border-teal-800/40">
                    <UserCheck className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {stats.assignedCount}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Menunggu teknisi/vendor memulai
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Penugasan</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>{dashboardStatusFilter === "assigned" ? "Aktif Terfilter" : "Filter Tiket"}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {
    /* Diproses Card */
  }
              <div
    onClick={() => handleWorkflowCardClick("processing")}
    className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-xs transition-all cursor-pointer group text-left relative overflow-hidden ${dashboardStatusFilter === "processing" ? "border-sky-500 ring-2 ring-sky-400/40 bg-sky-50/20 dark:bg-sky-950/20" : "border-slate-200/90 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500"}`}
  >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    Diproses
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200/50 dark:border-sky-800/40">
                    <Wrench className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {stats.processingCount}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Sedang dikerjakan di lapangan
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Pengerjaan</span>
                  <span className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>{dashboardStatusFilter === "processing" ? "Aktif Terfilter" : "Filter Tiket"}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {
    /* Diperbaiki Card */
  }
              <div
    onClick={() => handleWorkflowCardClick("repaired")}
    className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-xs transition-all cursor-pointer group text-left relative overflow-hidden ${dashboardStatusFilter === "repaired" ? "border-indigo-500 ring-2 ring-indigo-400/40 bg-indigo-50/20 dark:bg-indigo-950/20" : "border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500"}`}
  >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Diperbaiki
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/40">
                    <CheckCheck className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {stats.repairedCount}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Menunggu konfirmasi pelapor
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Konfirmasi</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>{dashboardStatusFilter === "repaired" ? "Aktif Terfilter" : "Filter Tiket"}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {
    /* Selesai Card */
  }
              <div
    onClick={() => handleWorkflowCardClick("completed")}
    className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-xs transition-all cursor-pointer group text-left relative overflow-hidden ${dashboardStatusFilter === "completed" ? "border-emerald-500 ring-2 ring-emerald-400/40 bg-emerald-50/20 dark:bg-emerald-950/20" : "border-slate-200/90 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500"}`}
  >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Selesai
                  </span>
                  <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/40">
                    <CheckCheck className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {stats.completedCount}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Tiket tuntas & sarana normal
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Tuntas</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>{dashboardStatusFilter === "completed" ? "Aktif Terfilter" : "Filter Tiket"}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

            </div>
          </div>

          <AdminInsights />

          {
    /* Secondary Grid: Donut Chart + Facility Summary (Left) & Recent Inbound Reports Table (Right) */
  }
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {
    /* Left Column: Diagram Bulat (Circular Donut Chart) & Inventaris (5 cols) */
  }
            <div className="lg:col-span-5 space-y-5">
              
              {
    /* DIAGRAM BULAT / DONUT CHART CARD */
  }
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs transition-colors">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center border border-teal-200/50 dark:border-teal-800/60">
                      <PieIcon className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Statistik Prioritas Aduan
                    </h3>
                  </div>

                  {priorityFilter !== "all" && <button
    onClick={() => setPriorityFilter("all")}
    className="text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:underline"
  >
                      Reset Filter
                    </button>}
                </div>

                {
    /* Donut Chart SVG & Hover Highlight */
  }
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                  <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                      {
    /* Background Ring */
  }
                      <circle
    cx="60"
    cy="60"
    r={R}
    fill="transparent"
    stroke="currentColor"
    strokeWidth="14"
    className="text-slate-100 dark:text-slate-800"
  />

                      {total === 0 ? <circle
    cx="60"
    cy="60"
    r={R}
    fill="transparent"
    stroke="currentColor"
    strokeWidth="14"
    className="text-slate-200 dark:text-slate-700"
  /> : <>
                          {
    /* High Priority Segment (Rose) */
  }
                          {highLen > 0 && <circle
    cx="60"
    cy="60"
    r={R}
    fill="transparent"
    stroke="#f43f5e"
    strokeWidth={hoveredPriority === "high" ? "18" : "14"}
    strokeDasharray={`${highLen} ${CIRCLE_LENGTH - highLen}`}
    strokeDashoffset={0}
    strokeLinecap="round"
    className="transition-all duration-300 cursor-pointer hover:opacity-90"
    onMouseEnter={() => setHoveredPriority("high")}
    onMouseLeave={() => setHoveredPriority(null)}
    onClick={() => {
      setPriorityFilter(priorityFilter === "high" ? "all" : "high");
    }}
  />}

                          {
    /* Medium Priority Segment (Amber) */
  }
                          {medLen > 0 && <circle
    cx="60"
    cy="60"
    r={R}
    fill="transparent"
    stroke="#f59e0b"
    strokeWidth={hoveredPriority === "medium" ? "18" : "14"}
    strokeDasharray={`${medLen} ${CIRCLE_LENGTH - medLen}`}
    strokeDashoffset={-highLen}
    strokeLinecap="round"
    className="transition-all duration-300 cursor-pointer hover:opacity-90"
    onMouseEnter={() => setHoveredPriority("medium")}
    onMouseLeave={() => setHoveredPriority(null)}
    onClick={() => {
      setPriorityFilter(priorityFilter === "medium" ? "all" : "medium");
    }}
  />}

                          {
    /* Low Priority Segment (Teal) */
  }
                          {lowLen > 0 && <circle
    cx="60"
    cy="60"
    r={R}
    fill="transparent"
    stroke="#0d9488"
    strokeWidth={hoveredPriority === "low" ? "18" : "14"}
    strokeDasharray={`${lowLen} ${CIRCLE_LENGTH - lowLen}`}
    strokeDashoffset={-(highLen + medLen)}
    strokeLinecap="round"
    className="transition-all duration-300 cursor-pointer hover:opacity-90"
    onMouseEnter={() => setHoveredPriority("low")}
    onMouseLeave={() => setHoveredPriority(null)}
    onClick={() => {
      setPriorityFilter(priorityFilter === "low" ? "all" : "low");
    }}
  />}
                        </>}
                    </svg>

                    {
    /* Dynamic Center Text */
  }
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
                      {hoveredPriority === "high" ? <>
                          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                            {highCount}
                          </span>
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                            Tinggi ({highPct.toFixed(0)}%)
                          </span>
                        </> : hoveredPriority === "medium" ? <>
                          <span className="text-2xl font-black text-amber-500 dark:text-amber-400 tabular-nums">
                            {medCount}
                          </span>
                          <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase">
                            Sedang ({medPct.toFixed(0)}%)
                          </span>
                        </> : hoveredPriority === "low" ? <>
                          <span className="text-2xl font-black text-teal-600 dark:text-teal-400 tabular-nums">
                            {lowCount}
                          </span>
                          <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase">
                            Rendah ({lowPct.toFixed(0)}%)
                          </span>
                        </> : <>
                          <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                            {total}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                            Total Aduan
                          </span>
                        </>}
                    </div>
                  </div>

                  {
    /* Circular Diagram Legend Cards */
  }
                  <div className="flex-1 w-full space-y-2.5">
                    
                    {
    /* Item: Tinggi */
  }
                    <div
    onMouseEnter={() => setHoveredPriority("high")}
    onMouseLeave={() => setHoveredPriority(null)}
    onClick={() => setPriorityFilter(priorityFilter === "high" ? "all" : "high")}
    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${priorityFilter === "high" ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/40 ring-1 ring-rose-400" : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
  >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200 dark:ring-rose-900/60 shrink-0" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Tinggi
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-rose-600 dark:text-rose-400 tabular-nums">
                          {highCount}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                          {highPct.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {
    /* Item: Sedang */
  }
                    <div
    onMouseEnter={() => setHoveredPriority("medium")}
    onMouseLeave={() => setHoveredPriority(null)}
    onClick={() => setPriorityFilter(priorityFilter === "medium" ? "all" : "medium")}
    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${priorityFilter === "medium" ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/40 ring-1 ring-amber-400" : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
  >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-900/60 shrink-0" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Sedang
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">
                          {medCount}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                          {medPct.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {
    /* Item: Rendah */
  }
                    <div
    onMouseEnter={() => setHoveredPriority("low")}
    onMouseLeave={() => setHoveredPriority(null)}
    onClick={() => setPriorityFilter(priorityFilter === "low" ? "all" : "low")}
    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${priorityFilter === "low" ? "border-teal-600 bg-teal-50/50 dark:bg-teal-950/40 ring-1 ring-teal-500" : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
  >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-600 ring-2 ring-teal-200 dark:ring-teal-900/60 shrink-0" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Rendah
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-teal-700 dark:text-teal-400 tabular-nums">
                          {lowCount}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300">
                          {lowPct.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
                  <span>Klik segmen bulat atau tombol untuk memfilter aduan</span>
                  <button
    onClick={() => onSelectTab("all-reports")}
    className="font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-0.5"
  >
                    <span>Detail</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {
    /* Facility Health / Inventory Summary Card */
  }
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center border border-teal-200/50 dark:border-teal-800/60">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Inventaris Fasilitas
                    </h3>
                  </div>

                  <button
    onClick={() => onSelectTab("facilities")}
    className="text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:text-teal-800 flex items-center gap-0.5"
  >
                    <span>Kelola Master</span>
                    <span>→</span>
                  </button>
                </div>

                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {stats.activeFacilitiesCount}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    aktif dari total {facilities.length} fasilitas terdaftar
                  </span>
                </div>

                {
    /* Progress bar ratio */
  }
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-3">
                  <div
    className="h-full bg-teal-600 dark:bg-teal-500 rounded-full transition-all duration-500"
    style={{
      width: facilities.length > 0 ? `${stats.activeFacilitiesCount / facilities.length * 100}%` : "0%"
    }}
  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400">Siap Operasi</div>
                    <div className="text-sm font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {stats.activeFacilitiesCount} Unit
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400">Nonaktif / Servis</div>
                    <div className="text-sm font-black text-slate-500 dark:text-slate-400 mt-0.5">
                      {facilities.length - stats.activeFacilitiesCount} Unit
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {
    /* Right Column: Interactive Recent Inbound Reports Table Widget (7 cols) */
  }
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-colors">
              <div>
                {
    /* Header & Inline Controls */
  }
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Laporan Fasilitas Terbaru
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Tiket aduan terbaru yang masuk ke sistem
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
    onClick={() => onSelectTab("all-reports")}
    className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:text-teal-800 flex items-center gap-1 transition-colors"
  >
                      <span>Lihat Semua</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {
    /* Inline Quick Search & Status Filter bar inside Recent Reports */
  }
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
    type="text"
    value={dashboardSearchQuery}
    onChange={(e) => setDashboardSearchQuery(e.target.value)}
    placeholder="Cari cepat nama fasilitas, pelapor, atau ID..."
    className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
  />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
    onClick={() => setDashboardStatusFilter("all")}
    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0 ${dashboardStatusFilter === "all" ? "bg-teal-700 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"}`}
  >
                      Semua
                    </button>
                    <button
    onClick={() => setDashboardStatusFilter("reported")}
    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0 ${dashboardStatusFilter === "reported" ? "bg-amber-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"}`}
  >
                      Dilaporkan
                    </button>
                    <button
    onClick={() => setDashboardStatusFilter("processing")}
    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0 ${dashboardStatusFilter === "processing" ? "bg-sky-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"}`}
  >
                      Diproses
                    </button>
                    <button
    onClick={() => setDashboardStatusFilter("completed")}
    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0 ${dashboardStatusFilter === "completed" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"}`}
  >
                      Selesai
                    </button>
                  </div>
                </div>

                {
    /* List of Recent Reports */
  }
                {dashboardFilteredReports.length === 0 ? <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <Inbox className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-semibold">Tidak ada laporan dengan kriteria ini.</p>
                    {(dashboardSearchQuery || dashboardStatusFilter !== "all" || priorityFilter !== "all") && <button
    onClick={() => {
      setDashboardSearchQuery("");
      setDashboardStatusFilter("all");
      setPriorityFilter("all");
    }}
    className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline mt-2 inline-block"
  >
                        Reset Filter Pencarian
                      </button>}
                  </div> : <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dashboardFilteredReports.slice(0, 5).map((rep) => <div
    key={rep.id}
    onClick={() => setSelectedReport(rep)}
    className="py-3 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center justify-between gap-3 cursor-pointer transition-colors group"
  >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
                              #{rep.id}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 truncate">
                              {rep.facility?.name}
                            </span>
                            <PriorityBadge priority={rep.priority} size="sm" />
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                            Pelapor: <span className="font-semibold text-slate-700 dark:text-slate-300">{rep.user?.name}</span> • {rep.description}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <ReportStatusBadge status={rep.status} />
                          <button
    type="button"
    className="p-1.5 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
    title="Tindak Lanjut Laporan"
  >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>)}
                  </div>}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mt-2">
                <span>Klik tiket untuk menindaklanjuti atau mengubah progres perbaikan.</span>
                <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400">
                  {dashboardFilteredReports.length} Laporan
                </span>
              </div>
            </div>

          </div>

        </div>}

      {
    /* 2. ALL REPORTS TAB VIEW */
  }
      {currentTab === "all-reports" && <div className="space-y-4 fill-page">
          
          {
    /* Header */
  }
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Semua Laporan Fasilitas
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kelola, investigasi, dan perbarui status tiket laporan kerusakan fasilitas secara menyeluruh.
              </p>
            </div>

            <button
    onClick={handleExportCSV}
    className="self-start sm:self-auto px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
  >
              <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Ekspor CSV</span>
            </button>
          </div>

          <div className="fill-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
            
            {
    /* Controls & Search Header */
  }
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-4">
              
              {
    /* Interactive Status Filter Pills */
  }
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 shrink-0">Status:</span>
                
                <button
    onClick={() => setStatusFilter("all")}
    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${statusFilter === "all" ? "bg-teal-700 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
  >
                  Semua ({reports.length})
                </button>

                <button
    onClick={() => setStatusFilter("reported")}
    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${statusFilter === "reported" ? "bg-amber-600 text-white shadow-xs" : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200/50 dark:border-amber-800/50"}`}
  >
                  <span>Dilaporkan</span>
                  <span className="w-4 h-4 rounded-full bg-white/20 dark:bg-black/20 text-[10px] flex items-center justify-center font-mono">
                    {stats.reportedCount}
                  </span>
                </button>

                <button
    onClick={() => setStatusFilter("assigned")}
    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${statusFilter === "assigned" ? "bg-teal-700 text-white shadow-xs" : "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/40 border border-teal-200/50 dark:border-teal-800/50"}`}
  >
                  <span>Ditugaskan</span>
                  <span className="w-4 h-4 rounded-full bg-white/20 dark:bg-black/20 text-[10px] flex items-center justify-center font-mono">
                    {stats.assignedCount}
                  </span>
                </button>

                <button
    onClick={() => setStatusFilter("processing")}
    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${statusFilter === "processing" ? "bg-sky-600 text-white shadow-xs" : "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-200/50 dark:border-sky-800/50"}`}
  >
                  <span>Diproses</span>
                  <span className="w-4 h-4 rounded-full bg-white/20 dark:bg-black/20 text-[10px] flex items-center justify-center font-mono">
                    {stats.processingCount}
                  </span>
                </button>

                <button
    onClick={() => setStatusFilter("repaired")}
    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${statusFilter === "repaired" ? "bg-indigo-600 text-white shadow-xs" : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/50 dark:border-indigo-800/50"}`}
  >
                  <span>Diperbaiki</span>
                  <span className="w-4 h-4 rounded-full bg-white/20 dark:bg-black/20 text-[10px] flex items-center justify-center font-mono">
                    {stats.repairedCount}
                  </span>
                </button>

                <button
    onClick={() => setStatusFilter("completed")}
    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${statusFilter === "completed" ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/50 dark:border-emerald-800/50"}`}
  >
                  <span>Selesai</span>
                  <span className="w-4 h-4 rounded-full bg-white/20 dark:bg-black/20 text-[10px] flex items-center justify-center font-mono">
                    {stats.completedCount}
                  </span>
                </button>

                <button
    onClick={() => setStatusFilter("rejected")}
    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${statusFilter === "rejected" ? "bg-rose-600 text-white shadow-xs" : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200/50 dark:border-rose-800/50"}`}
  >
                  <span>Ditolak</span>
                  <span className="w-4 h-4 rounded-full bg-white/20 dark:bg-black/20 text-[10px] flex items-center justify-center font-mono">
                    {stats.rejectedCount}
                  </span>
                </button>
              </div>

              {
    /* Search and Priority Filter Row */
  }
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Cari berdasarkan nama fasilitas, pelapor, atau deskripsi kerusakan..."
    className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs">
                    <span className="text-[11px] text-slate-400 font-semibold">Prioritas:</span>
                    <select
    value={priorityFilter}
    onChange={(e) => setPriorityFilter(e.target.value)}
    className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
  >
                      <option value="all" className="dark:bg-slate-800">Semua Prioritas</option>
                      <option value="high" className="dark:bg-slate-800">Tinggi</option>
                      <option value="medium" className="dark:bg-slate-800">Sedang</option>
                      <option value="low" className="dark:bg-slate-800">Rendah</option>
                    </select>
                  </div>

                  <ReportDateFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />

                  {(searchQuery || statusFilter !== "all" || priorityFilter !== "all" || dateFrom || dateTo) && <button
    onClick={() => {
      setSearchQuery("");
      setStatusFilter("all");
      setPriorityFilter("all");
      setDateFrom("");
      setDateTo("");
    }}
    className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline px-2"
  >
                      Reset
                    </button>}
                </div>
              </div>
            </div>

            {
    /* Table of Reports */
  }
            {filteredReports.length === 0 ? <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                <Inbox className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada laporan ditemukan</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau filter status.</p>
              </div> : <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Fasilitas</th>
                      <th className="py-3 px-4">Pelapor</th>
                      <th className="py-3 px-4">Prioritas</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Penanggung Jawab</th>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginate(filteredReports, page).map((rep) => {
    const dateFormatted = new Date(rep.created_at).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    return <tr key={rep.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-400 dark:text-slate-500">
                            #{rep.id}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{rep.facility?.name}</div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                              <span>{rep.facility?.location}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{rep.user?.name}</div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{rep.user?.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <PriorityBadge priority={rep.priority} />
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col items-start gap-1">
                              <ReportStatusBadge status={rep.status} />
                              <OverdueBadge report={rep} />
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            {rep.technician?.name || (rep.vendor ? `${rep.vendor.name} (vendor)` : <span className="text-slate-400">Belum ditunjuk</span>)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {dateFormatted}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
      onClick={() => setSelectedReport(rep)}
      className="px-3.5 py-1.5 text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-xl transition-colors inline-flex items-center gap-1.5 border border-teal-200 dark:border-teal-800"
    >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{rep.status === "reported" ? "Verifikasi" : "Tindak Lanjut"}</span>
                            </button>
                            <button
      onClick={() => setReportToDelete(rep)}
      className="ml-2 p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-900 align-middle"
      title={`Hapus laporan #${rep.id}`}
      aria-label={`Hapus laporan #${rep.id}`}
    >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>;
  })}
                  </tbody>
                </table>
              </div>}
            <Pagination page={page} total={filteredReports.length} onChange={setPage} />

          </div>
        </div>}

      {
    /* 3. FACILITIES TAB VIEW */
  }
      {currentTab === "facilities" && <div className="space-y-4 fill-page">
          
          {
    /* Header */
  }
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Kelola Fasilitas Perusahaan
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Master data fasilitas kantor yang aktif dan dapat dipilih oleh karyawan saat membuat laporan kendala.
              </p>
            </div>

            <button
    onClick={() => {
      setFacilityToEdit(null);
      setFacilityModalOpen(true);
    }}
    className="self-start sm:self-auto px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs flex items-center gap-2 transition-all"
  >
              <Plus className="w-4 h-4" />
              <span>Tambah Fasilitas</span>
            </button>
          </div>

          <div className="fill-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Nama Fasilitas</th>
                    <th className="py-3 px-4">Lokasi Gedung / Ruangan</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Riwayat Laporan</th>
                    <th className="py-3 px-4">Status Operasional</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {facilities.map((fac) => {
    const isActive = fac.status === "active";
    return <tr key={fac.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-400 dark:text-slate-500">
                          #{fac.id}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {fac.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            <span>{fac.location}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                          {fac.category}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-700 dark:text-slate-200 font-semibold">
                            {fac.report_count} laporan{fac.open_count > 0 && <span className="text-amber-600 dark:text-amber-400 font-bold"> · {fac.open_count} terbuka</span>}
                          </div>
                          {fac.is_recurring && <span
      title={`${fac.recent_count} laporan dalam 90 hari terakhir`}
      className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
    >
                              <AlertTriangle className="w-3 h-3" />
                              Kerusakan berulang
                            </span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
      onClick={() => handleToggleFacility(fac.id)}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${isActive ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"}`}
      title="Klik untuk mengubah status aktif atau nonaktif"
    >
                            <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                            <span>{isActive ? "Aktif" : "Nonaktif"}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
      onClick={() => setHistoryFacility(fac)}
      className="p-2 text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
      title="Lihat Riwayat Laporan"
    >
                            <History className="w-4 h-4" />
                          </button>
                          <button
      onClick={() => {
        setFacilityToEdit(fac);
        setFacilityModalOpen(true);
      }}
      className="p-2 text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
      title="Edit Fasilitas"
    >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>;
  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>}

      {
    /* 4. TAB: JADWAL PEMELIHARAAN & SERVIS RUTIN */
  }
      {currentTab === "maintenance-schedule" && <div className="space-y-6">
          {
    /* Header Banner */
  }
          <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-teal-500 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-teal-700/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-[11px] font-bold tracking-wider uppercase mb-2">
                <CalendarDays className="w-3.5 h-3.5 text-teal-300" />
                MANAJEMEN OPERASIONAL
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5">
                Kelola Jadwal Servis & Pemeliharaan
              </h2>
              <p className="text-xs sm:text-sm text-teal-100/80 mt-1.5 leading-relaxed max-w-2xl">
                Jadwalkan servis preventif, audit keselamatan berkala, dan penugasan teknisi/vendor untuk menjamin fasilitas selalu dalam kondisi optimal.
              </p>
            </div>

            <button
    onClick={() => {
      setMaintenanceToEdit(null);
      setMaintenanceModalOpen(true);
    }}
    className="px-4 py-2.5 text-xs font-bold text-teal-950 bg-teal-300 hover:bg-teal-200 rounded-xl flex items-center gap-2 transition-all shadow-sm shrink-0 self-start md:self-center"
  >
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal Servis</span>
            </button>
          </div>

          {
    /* Quick Metrics Cards */
  }
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Agenda</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {maintenanceSchedules.length}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Seluruh pemeliharaan</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Mendatang</div>
              <div className="text-2xl font-black text-teal-700 dark:text-teal-400 mt-1">
                {maintenanceSchedules.filter((m) => m.status === "upcoming").length}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Menunggu waktu servis</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Sedang Berjalan</div>
              <div className="text-2xl font-black text-sky-700 dark:text-sky-400 mt-1">
                {maintenanceSchedules.filter((m) => m.status === "ongoing").length}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Teknisi aktif bekerja</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Selesai</div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {maintenanceSchedules.filter((m) => m.status === "done").length}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Servis tuntas dilakukan</div>
            </div>
          </div>

          {
    /* Filter & Search Bar */
  }
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {
    /* Status Filter Tabs */
  }
            <div className="flex flex-wrap items-center gap-1.5">
              {[
    { id: "all", label: "Semua Agenda" },
    { id: "upcoming", label: "Mendatang" },
    { id: "ongoing", label: "Sedang Berjalan" },
    { id: "done", label: "Selesai" }
  ].map((tab) => <button
    key={tab.id}
    onClick={() => setMaintenanceStatusFilter(tab.id)}
    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${maintenanceStatusFilter === tab.id ? "bg-teal-700 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
  >
                  {tab.label}
                </button>)}
            </div>

            {
    /* Search Input */
  }
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
    type="text"
    value={maintenanceSearchQuery}
    onChange={(e) => setMaintenanceSearchQuery(e.target.value)}
    placeholder="Cari fasilitas, vendor, atau lokasi..."
    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 text-slate-900 dark:text-white"
  />
            </div>
          </div>

          {
    /* Schedules List */
  }
          <div className="space-y-3.5">
            {maintenanceSchedules.filter((item) => {
    const matchesSearch = item.facility.toLowerCase().includes(maintenanceSearchQuery.toLowerCase()) || item.location.toLowerCase().includes(maintenanceSearchQuery.toLowerCase()) || item.type.toLowerCase().includes(maintenanceSearchQuery.toLowerCase()) || item.pic.toLowerCase().includes(maintenanceSearchQuery.toLowerCase());
    const matchesStatus = maintenanceStatusFilter === "all" || item.status === maintenanceStatusFilter;
    return matchesSearch && matchesStatus;
  }).length === 0 ? <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
                  <CalendarDays className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Tidak ada jadwal pemeliharaan yang cocok.</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau filter status.</p>
                  <button
    onClick={() => {
      setMaintenanceSearchQuery("");
      setMaintenanceStatusFilter("all");
    }}
    className="mt-3 px-3 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors"
  >
                    Reset Filter
                  </button>
                </div> : maintenanceSchedules.filter((item) => {
    const matchesSearch = item.facility.toLowerCase().includes(maintenanceSearchQuery.toLowerCase()) || item.location.toLowerCase().includes(maintenanceSearchQuery.toLowerCase()) || item.type.toLowerCase().includes(maintenanceSearchQuery.toLowerCase()) || item.pic.toLowerCase().includes(maintenanceSearchQuery.toLowerCase());
    const matchesStatus = maintenanceStatusFilter === "all" || item.status === maintenanceStatusFilter;
    return matchesSearch && matchesStatus;
  }).map((item) => <div
    key={item.id}
    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
  >
                      {
    /* Left info */
  }
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.status === "done" ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : item.status === "ongoing" ? "bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800" : "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800"}`}>
                          <CalendarDays className="w-6 h-6" />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
                              #{item.id}
                            </span>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {item.facility}
                            </h4>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${item.status === "done" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" : item.status === "ongoing" ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800" : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"}`}>
                              {item.status === "done" ? "Selesai Dilakukan" : item.status === "ongoing" ? "Sedang Berjalan" : "Mendatang"}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                            {item.type}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                              {item.location}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-medium">
                              <Wrench className="w-3.5 h-3.5 text-slate-400" />
                              {item.pic}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                              <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                              {item.date}
                            </span>
                            <ScheduleDueBadge item={item} />
                          </div>
                        </div>
                      </div>

                      {
    /* Right Action buttons */
  }
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800 w-full md:w-auto justify-between md:justify-end">
                        {
    /* Quick Toggle Status */
  }
                        <button
    onClick={() => handleToggleMaintenanceStatus(item.id)}
    className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 text-slate-700 dark:text-slate-300 rounded-xl transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
    title="Klik untuk mengubah status: Mendatang -> Berjalan -> Selesai"
  >
                          <RotateCcw className="w-3 h-3" />
                          <span>Ubah Status</span>
                        </button>

                        {
    /* Edit */
  }
                        <button
    onClick={() => {
      setMaintenanceToEdit(item);
      setMaintenanceModalOpen(true);
    }}
    className="p-2 text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
    title="Edit Jadwal"
  >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {
    /* Delete */
  }
                        <button
    onClick={() => handleDeleteMaintenance(item.id, item.facility)}
    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
    title="Hapus Jadwal"
  >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>)}
          </div>
        </div>}

      {
    /* 5. TAB: PANDUAN & SOP FASILITAS */
  }
      {currentTab === "guides" && <div className="space-y-6">
          {
    /* Header Banner */
  }
          <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-teal-500 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-teal-700/30">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-[11px] font-bold tracking-wider uppercase mb-2">
              <BookOpenCheck className="w-3.5 h-3.5 text-teal-300" />
              TATA KELOLA & OPERASIONAL
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5">
              Panduan Manajemen & SOP Fasilitas
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/80 mt-1.5 leading-relaxed max-w-2xl">
              Prosedur resmi penanganan pengaduan fasilitas, standar waktu penyelesaian (SLA), dan direktori darurat untuk Administrator.
            </p>
          </div>

          {
    /* SLA Priority Matrix */
  }
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 space-y-4">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 dark:text-teal-400">
                STANDAR LAYANAN MAKSIMAL
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                Target Waktu Penyelesaian (SLA) Berdasarkan Prioritas
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                    Prioritas Tinggi
                  </span>
                  <span className="text-xs font-black text-rose-700 dark:text-rose-400">&lt; 2 Jam</span>
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Emergency / Bahaya Keselamatan</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Mati listrik total satu lantai, kebocoran pipa air utama, lift macet berisi penumpang, kebakaran/asap.
                </p>
                <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 mt-2">
                  Respons Awal: Max 15 Menit
                </div>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                    Prioritas Sedang
                  </span>
                  <span className="text-xs font-black text-amber-700 dark:text-amber-400">&lt; 24 Jam</span>
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Mengganggu Produktivitas</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  AC ruang kerja tidak dingin, toilet tersumbat satu bilik, proyektor ruang rapat error, lampu padam sebagian.
                </p>
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mt-2">
                  Respons Awal: Max 1 Jam
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    Prioritas Rendah
                  </span>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">&lt; 72 Jam</span>
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Kerusakan Minor / Estetika</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Engsel pintu decit, cat dinding mengelupas, karpet lepas, kursi kerja goyang, dispensernya berdecit.
                </p>
                <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-2">
                  Respons Awal: Max 4 Jam
                </div>
              </div>
            </div>
          </div>

          {
    /* 4 Steps Workflow Guide */
  }
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 space-y-4">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 dark:text-teal-400">
                ALUR TANGGAP TIKET
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                4 Tahap Pemrosesan Laporan oleh Administrator
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-black text-xs mb-2">
                  1
                </div>
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Verifikasi Awal</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Buka tiket aduan, cek foto kerusakan, lalu verifikasi. Tolak dengan alasan jika laporan tidak valid atau duplikat.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 flex items-center justify-center font-black text-xs mb-2">
                  2
                </div>
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Tunjuk Teknisi / Vendor</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Verifikasi laporan, lalu tugaskan ke teknisi internal atau vendor rekanan beserta batas waktu (SLA) penanganan.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-black text-xs mb-2">
                  3
                </div>
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Pengerjaan Fisik</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Teknisi menerima tugas, mengerjakan perbaikan, mencatat progres, material, dan biaya hingga status "Diperbaiki".
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-xs mb-2">
                  4
                </div>
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Konfirmasi Pelapor</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Pelapor menguji fasilitas dan mengonfirmasi "Selesai", atau menolak hasil sehingga kembali ke teknisi.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 dark:text-teal-400">
                DIREKTORI REKANAN
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                Kontak Vendor & Teknisi Pemeliharaan Resmi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Kini dikelola langsung dari database: tambah, ubah, dan pantau beban kerja teknisi.</p>
            </div>
            <button onClick={() => onSelectTab("directory")} className="px-4 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl flex items-center gap-1.5 self-start sm:self-auto">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Buka Direktori</span>
            </button>
          </div>
        </div>}

      {historyFacility && <FacilityHistoryModal facility={historyFacility} onClose={() => setHistoryFacility(null)} />}

      {currentTab === "directory" && <DirectoryPage />}
      {currentTab === "users" && <UsersPage />}
      {currentTab === "audit" && <AuditPage />}

      {
    /* Report Modal */
  }
      {selectedReport && <ReportModal
    report={selectedReport}
    isOpen={!!selectedReport}
    onClose={() => setSelectedReport(null)}
    onReportUpdated={loadData}
  />}

      {
    /* Facility Modal */
  }
      {facilityModalOpen && <FacilityModal
    isOpen={facilityModalOpen}
    onClose={() => {
      setFacilityModalOpen(false);
      setFacilityToEdit(null);
    }}
    onSuccess={loadData}
    facilityToEdit={facilityToEdit}
  />}

      {
    /* Maintenance Schedule Modal */
  }
      {maintenanceModalOpen && <MaintenanceModal
    isOpen={maintenanceModalOpen}
    onClose={() => {
      setMaintenanceModalOpen(false);
      setMaintenanceToEdit(null);
    }}
    onSuccess={loadData}
    itemToEdit={maintenanceToEdit}
    facilities={facilities}
  />}

      {reportToDelete && <ModalShell title="Hapus Laporan Permanen" subtitle={`Laporan #${reportToDelete.id} — ${reportToDelete.facility?.name || ""}`} onClose={() => !isDeletingReport && setReportToDelete(null)} maxW="max-w-md">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-800 dark:text-rose-200">
              <Trash2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                Laporan berstatus <strong>{({ reported: "Dilaporkan", assigned: "Ditugaskan", processing: "Diproses", repaired: "Diperbaiki", completed: "Selesai", rejected: "Ditolak" })[reportToDelete.status] || reportToDelete.status}</strong> dari <strong>{reportToDelete.user?.name}</strong> beserta riwayat, komentar, bahan, dan fotonya akan dihapus permanen dan tidak dapat dikembalikan. Tindakan ini tercatat di Log Aktivitas.
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button disabled={isDeletingReport} onClick={() => setReportToDelete(null)} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Batal</button>
              <button disabled={isDeletingReport} onClick={confirmDeleteReport} className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-60 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />{isDeletingReport ? "Menghapus..." : "Ya, Hapus Permanen"}
              </button>
            </div>
          </div>
        </ModalShell>}

    </div>;
};
