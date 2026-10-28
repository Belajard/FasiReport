import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../services/dataService";
import { ReportStatusBadge } from "../components/ReportStatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { ReportModal } from "../components/ReportModal";
import { STATUS_CONFIG } from "../types";
import { ScheduleDueBadge } from "../components/ScheduleDueBadge";
import { Pagination, paginate } from "../components/Pagination";
import { ReportDateFilter, inDateRange } from "../components/ReportDateFilter";
import { CreateEditReportModal } from "../components/CreateEditReportModal";
import {
  FileText,
  Building2,
  ChevronRight,
  Upload,
  Search,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  Inbox,
  AlertCircle,
  CalendarDays,
  BookOpenCheck,
  Send,
  Wrench,
  Sparkles,
  ArrowUpRight,
  Pencil
} from "lucide-react";
export const EmployeeView = ({
  currentTab,
  onSelectTab,
  focusReportId,
  onFocusHandled
}) => {
  const { user, showToast } = useAuth();
  const [reports, setReports] = useState([]);
  const [activeFacilities, setActiveFacilities] = useState([]);
  const [maintenanceSchedules, setMaintenanceSchedules] = useState([]);
  const [createFacilityId, setCreateFacilityId] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPriority, setCreatePriority] = useState("medium");
  const [createPhotoPreview, setCreatePhotoPreview] = useState(null);
  const [createPhotoFile, setCreatePhotoFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const fileInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState(null);
  const [editReport, setEditReport] = useState(null);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  useEffect(() => setPage(1), [searchQuery, statusFilter, priorityFilter, dateFrom, dateTo]);
  const loadData = () => {
    if (!user) return;
    const myReports = dataService.getReports(user);
    setReports(myReports);
    const facilities = dataService.getFacilities("employee");
    setActiveFacilities(facilities);
    const schedules = dataService.getMaintenanceSchedules();
    setMaintenanceSchedules(schedules);
    if (selectedReport) {
      const refreshed = myReports.find((r) => r.id === selectedReport.id);
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
  const latestReport = reports.length > 0 ? reports[0] : null;
  const inProgressReports = reports.filter((r) => ["reported", "assigned", "processing"].includes(r.status));
  const awaitingConfirm = reports.filter((r) => r.status === "repaired");
  const completedReports = reports.filter((r) => r.status === "completed" || r.status === "repaired");
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Ukuran foto maksimal 5 MB.", "error");
      return;
    }
    setCreatePhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setCreatePhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!createFacilityId) {
      setFormError("Harap pilih fasilitas yang mengalami kendala.");
      return;
    }
    if (!createDescription.trim()) {
      setFormError("Deskripsi kerusakan fasilitas wajib diisi secara jelas.");
      return;
    }
    try {
      setIsSubmitting(true);
      const photoUrl = createPhotoFile ? await dataService.uploadPhoto(createPhotoFile) : void 0;
      await dataService.createReport({
        facility_id: parseInt(createFacilityId, 10),
        description: createDescription.trim(),
        priority: createPriority,
        photo: photoUrl
      });
      showToast("Laporan kerusakan fasilitas berhasil dikirim ke tim Admin!", "success");
      setCreateFacilityId("");
      setCreateDescription("");
      setCreatePriority("medium");
      setCreatePhotoPreview(null);
      setCreatePhotoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadData();
      onSelectTab("my-reports");
    } catch (err) {
      setFormError(err.message || "Gagal mengirim laporan.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const filteredReports = reports.filter((r) => {
    const matchesSearch = (r.facility?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || r.description.toLowerCase().includes(searchQuery.toLowerCase()) || r.id.toString().includes(searchQuery);
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || r.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority && inDateRange(r.created_at, dateFrom, dateTo);
  });
  const handleDelete = async (report) => {
    if (report.status !== "reported") {
      showToast("Laporan yang sudah diproses tidak dapat dihapus.", "error");
      return;
    }
    try {
      await dataService.deleteReport(report.id);
      showToast("Laporan berhasil dibatalkan dan dihapus.", "success");
      loadData();
    } catch (err) {
      showToast(err.message || "Gagal menghapus laporan.", "error");
    }
  };
  return <div className="space-y-6">
      
      {
    /* 1. DASHBOARD VIEW */
  }
      {currentTab === "dashboard" && <div className="space-y-6">
          
          {
    /* Top Greeting Banner */
  }
          <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-teal-500 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-teal-700/30">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-[11px] font-bold tracking-wider uppercase mb-2">
                <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                DASHBOARD KARYAWAN
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
                Halo, {user.name}
              </h1>
              <p className="text-xs sm:text-sm text-teal-100/80 mt-1.5 leading-relaxed">
                Pantau status perbaikan fasilitas kantor, cek jadwal servis berkala, dan sampaikan kendala sarana kerja Anda dengan mudah.
              </p>
            </div>
          </div>

          {awaitingConfirm.length > 0 && <button
    onClick={() => setSelectedReport(awaitingConfirm[0])}
    className="w-full text-left bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-4 flex items-center gap-3 hover:border-indigo-400 transition-colors"
  >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs text-indigo-900 dark:text-indigo-200">
                <div className="font-extrabold text-sm">Perbaikan Menunggu Konfirmasi Anda</div>
                <strong>{awaitingConfirm.length} laporan</strong> sudah diperbaiki teknisi. Periksa fasilitas lalu konfirmasi apakah sudah baik.
              </div>
            </button>}

          {
    /* Metric Cards Row */
  }
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {
    /* Card 1: Status Terkini */
  }
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:border-teal-400 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Status Terkini
                </span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 flex items-center justify-center border border-teal-200/40 dark:border-teal-800/40">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-2 truncate capitalize">
                {latestReport ? STATUS_CONFIG[latestReport.status]?.label || "Dilaporkan" : "Belum Ada"}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                {latestReport?.facility?.name || "Tidak ada aduan aktif"}
              </div>
            </div>

            {
    /* Card 2: Fasilitas Aktif */
  }
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:border-teal-400 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Fasilitas Kantor
                </span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 flex items-center justify-center border border-teal-200/40 dark:border-teal-800/40">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                {activeFacilities.length} Fasilitas
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                Terdata siap dilaporkan
              </div>
            </div>

            {
    /* Card 3: Dalam Penanganan */
  }
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:border-teal-400 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Sedang Diproses
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/40 dark:border-amber-800/40">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                {inProgressReports.length} Laporan
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                Dalam antrean perbaikan
              </div>
            </div>

            {
    /* Card 4: Selesai Diperbaiki */
  }
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:border-teal-400 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Tuntas Diperbaiki
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/40 dark:border-emerald-800/40">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                {completedReports.length} Laporan
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                Fasilitas kembali normal
              </div>
            </div>

          </div>

          {
    /* Main Dashboard Body: 2 Balanced Columns */
  }
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {
    /* Left Column (7 cols): Laporan Berjalan & Jadwal Servis Rutin */
  }
            <div className="lg:col-span-7 space-y-6">
              
              {
    /* Box 1: Laporan Berjalan Saya */
  }
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 dark:text-teal-400">
                      STATUS PENANGANAN
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                      Laporan Saya Saat Ini
                    </h3>
                  </div>
                  <button
    onClick={() => onSelectTab("my-reports")}
    className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 flex items-center gap-1 transition-colors"
  >
                    <span>Semua Laporan</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {reports.length === 0 ? <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <Inbox className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Belum ada laporan kerusakan diajukan.</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Gunakan menu <strong>Buat Laporan</strong> di sidebar jika ada kendala fasilitas.
                    </p>
                  </div> : <div className="space-y-3">
                    {reports.slice(0, 3).map((rep) => <div
    key={rep.id}
    onClick={() => setSelectedReport(rep)}
    className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-800 hover:bg-teal-50/20 dark:hover:bg-slate-800/60 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
  >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">#{rep.id}</span>
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate group-hover:text-teal-700 dark:group-hover:text-teal-400">
                              {rep.facility?.name}
                            </span>
                            <PriorityBadge priority={rep.priority} />
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mt-1">
                            {rep.description}
                          </p>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                            Lokasi: {rep.facility?.location} • {new Date(rep.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <ReportStatusBadge status={rep.status} />
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 dark:group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>)}
                  </div>}
              </div>

              {
    /* Box 2: Jadwal Servis Rutin Gedung */
  }
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 dark:text-teal-400">
                      AGENDA FASILITAS
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                      Jadwal Servis Rutin Terdekat
                    </h3>
                  </div>
                  <button
    onClick={() => onSelectTab("maintenance-schedule")}
    className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 flex items-center gap-1 transition-colors"
  >
                    <span>Lihat Jadwal Lengkap</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {maintenanceSchedules.length === 0 ? <div className="text-center py-6 text-slate-400 text-xs">
                      Belum ada jadwal servis terdekat.
                    </div> : maintenanceSchedules.slice(0, 3).map((item) => <div
    key={item.id}
    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-start justify-between gap-3"
  >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-teal-100/80 dark:bg-teal-950/60 text-teal-800 dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Wrench className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">#{item.id}</span>
                              <span className="truncate">{item.facility}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.type}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                              Lokasi: {item.location}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/80">
                            {item.date}
                          </span>
                          <div className="mt-1"><ScheduleDueBadge item={item} /></div>
                        </div>
                      </div>)}
                </div>
              </div>

            </div>

            {
    /* Right Column (5 cols): Fasilitas & Panduan Bantuan */
  }
            <div className="lg:col-span-5 space-y-6">
              
              {
    /* Box 3: Daftar Fasilitas Kantor */
  }
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      INVENTARIS KANTOR
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                      Fasilitas Perusahaan
                    </h4>
                  </div>
                  <button
    onClick={() => onSelectTab("facilities")}
    className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 transition-colors"
  >
                    Lihat Semua
                  </button>
                </div>

                <div className="space-y-2.5">
                  {activeFacilities.slice(0, 4).map((fac) => <div
    key={fac.id}
    onClick={() => {
      setCreateFacilityId(fac.id.toString());
      onSelectTab("create-report");
    }}
    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/30 dark:hover:bg-slate-800/60 flex items-center justify-between gap-3 cursor-pointer transition-all group"
    title="Klik untuk melaporkan kerusakan fasilitas ini"
  >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-teal-700 dark:group-hover:text-teal-400">
                            {fac.name}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                            {fac.location}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold group-hover:underline">Laporkan</span>
                        <ChevronRight className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>)}
                </div>
              </div>

              {
    /* Box 4: Panduan Singkat Pelaporan */
  }
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50/50 dark:from-teal-950/30 dark:to-emerald-950/20 rounded-2xl border border-teal-200/80 dark:border-teal-800/50 p-5 shadow-xs transition-colors">
                <div className="flex items-center gap-2.5 text-teal-800 dark:text-teal-300 font-extrabold text-sm mb-2">
                  <BookOpenCheck className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <span>SOP & Bantuan Fasilitas</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  Apabila menemukan fasilitas rusak, segera laporkan agar operasional kerja tetap aman dan nyaman.
                </p>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0 mt-1.5" />
                    <span>Lengkapi foto bukti kerusakan agar investigasi teknisi lebih cepat.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0 mt-1.5" />
                    <span>Pilih prioritas <strong>Tinggi</strong> untuk kendala darurat (listrik korslet, bocor parah).</span>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-teal-200/60 dark:border-teal-800/60 flex items-center justify-between">
                  <button
    onClick={() => onSelectTab("guides")}
    className="text-xs font-bold text-teal-800 dark:text-teal-300 hover:text-teal-950 dark:hover:text-white flex items-center gap-1 transition-colors"
  >
                    <span>Baca Panduan Lengkap</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-400">Helpdesk GA: Ext 104</span>
                </div>
              </div>

            </div>

          </div>

        </div>}

      {
    /* 2. DEDICATED BUAT LAPORAN PAGE */
  }
      {currentTab === "create-report" && <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <div className="bg-gradient-to-r from-teal-700 to-teal-500 text-white p-6">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-200">
              FORMULIR PENGADUAN
            </div>
            <h2 className="text-xl font-extrabold mt-1">Buat Laporan Kerusakan Fasilitas</h2>
            <p className="text-xs text-teal-100/90 mt-1">
              Sampaikan kendala fasilitas kerja Anda. Laporan akan langsung masuk ke antrean investigasi tim teknisi secara realtime.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {formError && <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>}

            <form onSubmit={handleSubmitReport} className="space-y-5">
              {
    /* Fasilitas */
  }
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Fasilitas Yang Mengalami Masalah <span className="text-rose-500">*</span>
                </label>
                <select
    value={createFacilityId}
    onChange={(e) => setCreateFacilityId(e.target.value)}
    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
    required
  >
                  <option value="">-- Pilih salah satu fasilitas --</option>
                  {activeFacilities.map((f) => <option key={f.id} value={f.id}>
                      {f.name} — {f.location} ({f.category})
                    </option>)}
                </select>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Pilih inventaris yang relevan dengan lokasi kendala.
                </p>
              </div>

              {
    /* Deskripsi */
  }
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Deskripsi Masalah / Kerusakan <span className="text-rose-500">*</span>
                </label>
                <textarea
    value={createDescription}
    onChange={(e) => setCreateDescription(e.target.value)}
    rows={4}
    placeholder="Contoh: AC tidak dingin dan mengeluarkan air menetes di atas meja kerja sejak pagi..."
    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
    required
  />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Semakin spesifik kronologi dan gejala kerusakan, semakin cepat teknisi membawa alat perbaikan yang tepat.
                </p>
              </div>

              {
    /* Prioritas & Foto */
  }
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Tingkat Prioritas <span className="text-rose-500">*</span>
                  </label>
                  <select
    value={createPriority}
    onChange={(e) => setCreatePriority(e.target.value)}
    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
  >
                    <option value="low">Rendah (Dapat menunggu, tidak mengganggu operasional vital)</option>
                    <option value="medium">Sedang (Perlu ditangani dalam waktu wajar)</option>
                    <option value="high">Tinggi (Darurat / Mengancam keselamatan / Menghentikan kerja)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Foto Bukti Kerusakan (Opsional)
                  </label>
                  <input
    type="file"
    ref={fileInputRef}
    onChange={handlePhotoUpload}
    accept="image/*"
    className="hidden"
  />
                  <div
    onClick={() => fileInputRef.current?.click()}
    className="w-full h-[42px] border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-600 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-slate-500 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors px-3 bg-slate-50/50 dark:bg-slate-800/50"
  >
                    <Upload className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-semibold truncate">
                      {createPhotoPreview ? "Ganti Foto" : "Unggah Foto Bukti"}
                    </span>
                  </div>
                </div>
              </div>

              {
    /* Preview Foto */
  }
              {createPhotoPreview && <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">Pratinjau Foto Bukti:</div>
                  <div className="relative inline-block">
                    <img
    src={createPhotoPreview}
    alt="Preview"
    className="w-36 h-28 object-cover rounded-lg border border-slate-300 dark:border-slate-700 shadow-xs"
  />
                    <button
    type="button"
    onClick={() => { setCreatePhotoPreview(null); setCreatePhotoFile(null); }}
    className="absolute -top-2 -right-2 w-6 h-6 bg-rose-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-xs"
  >
                      ×
                    </button>
                  </div>
                </div>}

              {
    /* Actions */
  }
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
    type="button"
    onClick={() => onSelectTab("dashboard")}
    className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
  >
                  Batal
                </button>
                <button
    type="submit"
    disabled={isSubmitting}
    className="px-6 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-md shadow-teal-900/10 flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50"
  >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Mengirim..." : "Kirim Laporan Kerusakan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>}

      {
    /* 3. MY REPORTS TAB VIEW */
  }
      {currentTab === "my-reports" && <div className="fill-page fill-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="p-6 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 dark:text-teal-400">
                LAPORAN SAYA
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                Riwayat Seluruh Aduan Fasilitas
              </h3>
            </div>

            <button
    onClick={() => onSelectTab("create-report")}
    className="px-4 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
  >
              <span>+ Buat Laporan Baru</span>
            </button>
          </div>

          {
    /* Filter search */
  }
          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Cari fasilitas atau deskripsi kerusakan..."
    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
  />
            </div>

            <div className="flex items-center gap-2">
              <select
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
    className="px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
  >
                <option value="all">Semua Status</option>
                <option value="reported">Dilaporkan</option>
                <option value="assigned">Ditugaskan</option>
                <option value="processing">Diproses</option>
                <option value="repaired">Diperbaiki</option>
                <option value="completed">Selesai</option>
                <option value="rejected">Ditolak</option>
              </select>

              <ReportDateFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />

              <select
    value={priorityFilter}
    onChange={(e) => setPriorityFilter(e.target.value)}
    className="px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
  >
                <option value="all">Semua Prioritas</option>
                <option value="low">Rendah</option>
                <option value="medium">Sedang</option>
                <option value="high">Tinggi</option>
              </select>
            </div>
          </div>

          {filteredReports.length === 0 ? <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              <Inbox className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <div className="font-bold text-slate-700 dark:text-slate-300">Tidak ada laporan yang sesuai filter.</div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Coba ubah kata kunci pencarian atau filter status.</p>
            </div> : <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Fasilitas & Lokasi</th>
                    <th className="py-3 px-4">Deskripsi</th>
                    <th className="py-3 px-4">Prioritas</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Tanggal Masuk</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginate(filteredReports, page).map((rep) => <tr key={rep.id} className="hover:bg-teal-50/20 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-400 dark:text-slate-500">#{rep.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{rep.facility?.name}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">{rep.facility?.location}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                        {rep.description}
                      </td>
                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={rep.priority} />
                      </td>
                      <td className="py-3.5 px-4">
                        <ReportStatusBadge status={rep.status} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                        {new Date(rep.created_at).toLocaleDateString("id-ID")}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
    onClick={() => setSelectedReport(rep)}
    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
    title="Detail"
  >
                            <Eye className="w-4 h-4" />
                          </button>
                          {rep.status === "reported" && <button
    onClick={() => setEditReport(rep)}
    className="p-1.5 text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
    title="Edit Laporan"
  >
                              <Pencil className="w-4 h-4" />
                            </button>}
                          {rep.status === "reported" && <button
    onClick={() => handleDelete(rep)}
    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
    title="Batalkan & Hapus"
  >
                              <Trash2 className="w-4 h-4" />
                            </button>}
                        </div>
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>}
          <Pagination page={page} total={filteredReports.length} onChange={setPage} />
        </div>}

      {
    /* 4. FACILITIES TAB VIEW */
  }
      {currentTab === "facilities" && <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 space-y-4 transition-colors">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 dark:text-teal-400">
              INVENTARIS KANTOR
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
              Daftar Fasilitas & Sarana Perusahaan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Fasilitas aktif yang dapat Anda pilih untuk dilaporkan apabila terjadi kerusakan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {activeFacilities.map((fac) => <div
    key={fac.id}
    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-600 bg-white dark:bg-slate-800 transition-all flex flex-col justify-between hover:shadow-xs group"
  >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400">
                      {fac.name}
                    </h4>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      Aktif
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <div>Lokasi: <span className="font-semibold text-slate-700 dark:text-slate-300">{fac.location}</span></div>
                    <div>Kategori: <span className="font-semibold text-slate-700 dark:text-slate-300">{fac.category}</span></div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
    onClick={() => {
      setCreateFacilityId(fac.id.toString());
      onSelectTab("create-report");
    }}
    className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 flex items-center gap-1.5 transition-colors"
  >
                    <span>Buat Aduan Kerusakan</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>)}
          </div>
        </div>}

      {
    /* 5. NEW FEATURE: JADWAL PEMELIHARAAN */
  }
      {currentTab === "maintenance-schedule" && <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 space-y-6 transition-colors">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 dark:text-teal-400">
              AGENDA SERVIS RUTIN
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
              Jadwal Pemeliharaan Fasilitas Kantor
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Transparansi jadwal servis preventif dan perbaikan berkala oleh vendor & tim teknisi gedung.
            </p>
          </div>

          <div className="space-y-4">
            {maintenanceSchedules.length === 0 ? <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <CalendarDays className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Belum ada agenda pemeliharaan terjadwal.</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Admin akan mempublikasikan jadwal servis fasilitas di sini.</p>
              </div> : maintenanceSchedules.map((item) => <div
    key={item.id}
    className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 bg-white dark:bg-slate-800 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
  >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.status === "done" ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" : item.status === "ongoing" ? "bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400" : "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400"}`}>
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{item.facility}</h4>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${item.status === "done" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" : item.status === "ongoing" ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800" : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"}`}>
                          {item.status === "done" ? "Selesai Dilakukan" : item.status === "ongoing" ? "Sedang Berjalan" : "Mendatang"}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">{item.type}</p>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                        Lokasi: {item.location} • Pelaksana: {item.pic}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{item.date}</div>
                    <ScheduleDueBadge item={item} />
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">Jadwal Pelaksanaan</div>
                  </div>
                </div>)}
          </div>
        </div>}

      {
    /* 6. NEW FEATURE: PANDUAN & SOP PELAPORAN */
  }
      {currentTab === "guides" && <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 transition-colors">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 dark:text-teal-400">
              STANDAR OPERASIONAL PROSEDUR
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              Panduan Pelaporan & Standar Layanan (SLA)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Prosedur resmi penanganan sarana kerja perusahaan agar perbaikan dapat diproses secara cepat dan terarah.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {
    /* Step 1 */
  }
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs transition-colors">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 font-extrabold flex items-center justify-center mb-3">
                1
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Periksa & Dokumentasi</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Pastikan identitas nama alat atau ruangan sesuai. Ambil foto yang jelas memperlihatkan bagian yang rusak atau bocor.
              </p>
            </div>

            {
    /* Step 2 */
  }
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs transition-colors">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 font-extrabold flex items-center justify-center mb-3">
                2
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Pilih Prioritas Sesuai Dampak</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Gunakan prioritas <strong>Tinggi</strong> untuk kendala yang membahayakan keselamatan atau menghentikan jam kerja kantor.
              </p>
            </div>

            {
    /* Step 3 */
  }
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs transition-colors">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 font-extrabold flex items-center justify-center mb-3">
                3
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Pantau Linimasa Status</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Laporan akan bergerak berurutan dari <em>Dilaporkan → Diproses → Diperbaiki → Selesai</em> disertai catatan teknisi.
              </p>
            </div>
          </div>

          {
    /* Contact Box */
  }
          <div className="bg-gradient-to-r from-teal-700 to-teal-500 text-white rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold text-teal-300">Butuh Bantuan Mendesak?</div>
              <p className="text-xs text-slate-300 mt-0.5">
                Hubungi PIC Facility Management & General Affair untuk eskalasi cepat fasilitas darurat.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                <span className="text-slate-400">Hotline GA:</span> <strong>ext. 104 / 105</strong>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                <span className="text-slate-400">Email:</span> <strong>ga-facilities@company.com</strong>
              </div>
            </div>
          </div>
        </div>}

      {
    /* Detail Modal */
  }
      {selectedReport && <ReportModal
    report={selectedReport}
    isOpen={!!selectedReport}
    onClose={() => setSelectedReport(null)}
    onReportUpdated={loadData}
    onOpenEdit={(r) => setEditReport(r)}
  />}

      {editReport && <CreateEditReportModal
    isOpen
    reportToEdit={editReport}
    onClose={() => setEditReport(null)}
    onSuccess={loadData}
  />}

    </div>;
};
