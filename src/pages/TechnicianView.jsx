import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../services/dataService";
import { ReportStatusBadge } from "../components/ReportStatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { OverdueBadge } from "../components/OverdueBadge";
import { ReportModal } from "../components/ReportModal";
import { Pagination, paginate } from "../components/Pagination";
import { DirectoryPage } from "./DirectoryPage";
import { SectionHeader, formatRupiah } from "../components/ui";
import {
  Sparkles, ClipboardList, Wrench, CheckCheck, Clock, AlertTriangle, ChevronRight, Inbox, Search,
  CalendarDays, RotateCcw, BookOpenCheck, MapPin
} from "lucide-react";

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const MAINT_LABEL = { upcoming: "Mendatang", ongoing: "Sedang Berjalan", done: "Selesai" };
const MAINT_STYLE = {
  upcoming: "bg-amber-50 text-amber-700 border-amber-200",
  ongoing: "bg-sky-50 text-sky-700 border-sky-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200"
};

const MetricCard = ({ label, value, hint, icon: Icon, tone }) => {
  const tones = {
    teal: "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 border-teal-200/40 dark:border-teal-800/40",
    amber: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200/40 dark:border-amber-800/40",
    indigo: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200/40 dark:border-indigo-800/40",
    emerald: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200/40 dark:border-emerald-800/40",
    rose: "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200/40 dark:border-rose-800/40"
  };
  return <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:border-teal-400 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${tones[tone]}`}><Icon className="w-4 h-4" /></div>
      </div>
      <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-2 tabular-nums">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">{hint}</div>
    </div>;
};

const TaskRow = ({ rep, onOpen }) => <div
    onClick={() => onOpen(rep)}
    className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-800 hover:bg-teal-50/20 dark:hover:bg-slate-800/60 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
  >
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">#{rep.id}</span>
        <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate group-hover:text-teal-700 dark:group-hover:text-teal-400">{rep.facility?.name}</span>
        <PriorityBadge priority={rep.priority} />
        <OverdueBadge report={rep} />
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mt-1">{rep.description}</p>
      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
        <MapPin className="w-3 h-3" />{rep.facility?.location}
        {rep.due_at && <span> • Tenggat {new Date(rep.due_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <ReportStatusBadge status={rep.status} />
      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 dark:group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
    </div>
  </div>;

export const TechnicianView = ({ currentTab, onSelectTab, focusReportId, onFocusHandled }) => {
  const { user, showToast } = useAuth();
  const [reports, setReports] = useState(dataService.getReports());
  const [schedules, setSchedules] = useState(dataService.getMaintenanceSchedules());
  const [selected, setSelected] = useState(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const load = () => {
    const all = dataService.getReports();
    setReports(all);
    setSchedules(dataService.getMaintenanceSchedules());
    setSelected((cur) => cur ? all.find((r) => r.id === cur.id) || null : cur);
  };
  useEffect(() => {
    load();
    return dataService.subscribe(load);
  }, []);
  useEffect(() => {
    if (!focusReportId) return;
    const r = reports.find((x) => x.id === focusReportId);
    if (r) {
      setSelected(r);
      onFocusHandled?.();
    }
  }, [focusReportId, reports]);
  useEffect(() => setPage(1), [q, statusFilter, currentTab]);

  const active = reports.filter((r) => ["assigned", "processing"].includes(r.status));
  const sortedActive = [...active].sort((a, b) => Number(b.is_overdue) - Number(a.is_overdue) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || new Date(a.due_at || 0) - new Date(b.due_at || 0));
  const newTasks = reports.filter((r) => r.status === "assigned");
  const waiting = reports.filter((r) => r.status === "repaired");
  const doneMonth = reports.filter((r) => r.status === "completed" && r.completed_at && new Date(r.completed_at).getMonth() === new Date().getMonth() && new Date(r.completed_at).getFullYear() === new Date().getFullYear());
  const overdue = reports.filter((r) => r.is_overdue);

  const taskList = reports.filter((r) => {
    if (currentTab === "task-history" ? !["repaired", "completed", "rejected"].includes(r.status) : !["assigned", "processing"].includes(r.status)) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    const t = q.toLowerCase();
    return !t || `${r.facility?.name} ${r.description} ${r.id}`.toLowerCase().includes(t);
  });
  const orderedTasks = currentTab === "task-history" ? taskList : [...taskList].sort((a, b) => Number(b.is_overdue) - Number(a.is_overdue) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

  const advance = async (id) => {
    try {
      const u = await dataService.toggleMaintenanceStatus(id);
      showToast(`Status servis '${u.facility}' diubah: ${MAINT_LABEL[u.status]}.`, "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return <div className="space-y-6">
      {currentTab === "dashboard" && <div className="space-y-6">
          <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-teal-500 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-teal-700/30">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-[11px] font-bold tracking-wider uppercase mb-2">
                <Sparkles className="w-3.5 h-3.5 text-teal-300" />DASHBOARD TEKNISI
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">Halo, {user.name}</h1>
              <p className="text-xs sm:text-sm text-teal-100/80 mt-1.5 leading-relaxed">
                Terima tugas dari admin, kerjakan perbaikan fasilitas, dan perbarui hasilnya agar pelapor dapat mengonfirmasi.
              </p>
            </div>
          </div>

          {newTasks.length > 0 && <button onClick={() => onSelectTab("my-tasks")} className="w-full text-left bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 flex items-center gap-3 hover:border-amber-400 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800"><ClipboardList className="w-5 h-5" /></div>
              <div className="text-xs text-amber-900 dark:text-amber-200"><div className="font-extrabold text-sm">Tugas Baru Menunggu</div><strong>{newTasks.length} tugas</strong> belum Anda terima. Buka dan mulai pengerjaan.</div>
            </button>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Tugas Aktif" value={`${active.length} Tugas`} hint={`${newTasks.length} belum dimulai`} icon={Wrench} tone="teal" />
            <MetricCard label="Menunggu Konfirmasi" value={`${waiting.length} Laporan`} hint="Menunggu pelapor mengecek" icon={Clock} tone="indigo" />
            <MetricCard label="Selesai Bulan Ini" value={`${doneMonth.length} Laporan`} hint="Dikonfirmasi pelapor" icon={CheckCheck} tone="emerald" />
            <MetricCard label="Terlambat (SLA)" value={`${overdue.length} Tugas`} hint={overdue.length ? "Segera tindak lanjuti" : "Semua sesuai tenggat"} icon={AlertTriangle} tone={overdue.length ? "rose" : "amber"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 dark:text-teal-400">ANTREAN KERJA</div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">Tugas Prioritas Saya</h3>
                </div>
                <button onClick={() => onSelectTab("my-tasks")} className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:text-teal-900 flex items-center gap-1">
                  <span>Semua Tugas</span><ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {sortedActive.length === 0 ? <div className="py-10 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Inbox className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada tugas aktif.</p>
                  <p className="text-[11px] mt-0.5">Tugas baru dari admin akan muncul di sini.</p>
                </div> : <div className="space-y-3">{sortedActive.slice(0, 4).map((r) => <TaskRow key={r.id} rep={r} onOpen={setSelected} />)}</div>}
            </div>

            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 dark:text-teal-400">AGENDA SAYA</div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5 mb-4">Perawatan Terdekat</h3>
              {schedules.filter((s) => s.status !== "done").length === 0 ? <p className="text-xs text-slate-400 py-6 text-center">Tidak ada jadwal perawatan.</p> : <div className="space-y-2.5">
                  {schedules.filter((s) => s.status !== "done").slice(0, 3).map((s) => <div key={s.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                      <div className="font-bold text-slate-900 dark:text-white">{s.facility}</div>
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{s.type}</div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className={`font-mono text-[11px] ${s.is_overdue ? "text-rose-600 font-bold" : "text-slate-400"}`}>{s.date}{s.is_overdue ? " · lewat jadwal" : ""}</span>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${MAINT_STYLE[s.status]}`}>{MAINT_LABEL[s.status]}</span>
                      </div>
                    </div>)}
                </div>}
            </div>
          </div>
        </div>}

      {(currentTab === "my-tasks" || currentTab === "task-history") && <div className="space-y-4 fill-page">
          <SectionHeader
    eyebrow={currentTab === "my-tasks" ? "TUGAS SAYA" : "RIWAYAT"}
    title={currentTab === "my-tasks" ? "Tugas Perbaikan Saya" : "Riwayat Perbaikan"}
    subtitle={currentTab === "my-tasks" ? "Diurutkan berdasarkan keterlambatan dan prioritas." : "Perbaikan yang sudah Anda kirim, termasuk hasil konfirmasi pelapor."}
  />
          <div className="fill-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-slate-200 dark:border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari fasilitas atau deskripsi..." className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200">
                <option value="all">Semua Status</option>
                {(currentTab === "my-tasks" ? ["assigned", "processing"] : ["repaired", "completed"]).map((s) => <option key={s} value={s}>{{ assigned: "Ditugaskan", processing: "Diproses", repaired: "Menunggu Konfirmasi", completed: "Selesai" }[s]}</option>)}
              </select>
            </div>
            <div className="p-4 space-y-3">
              {orderedTasks.length === 0 ? <div className="py-12 text-center text-slate-400 text-xs"><Inbox className="w-8 h-8 mx-auto text-slate-300 mb-2" />Tidak ada data.</div> : paginate(orderedTasks, page).map((r) => <div key={r.id}>
                    <TaskRow rep={r} onOpen={setSelected} />
                    {currentTab === "task-history" && (Number(r.cost) > 0 || r.reopen_count > 0) && <div className="px-4 pt-1.5 text-[11px] text-slate-400 flex gap-3">
                        {Number(r.cost) > 0 && <span>Biaya {formatRupiah(r.cost)}</span>}
                        {r.reopen_count > 0 && <span className="text-amber-600">Pernah ditolak pelapor ×{r.reopen_count}</span>}
                      </div>}
                  </div>)}
            </div>
            <Pagination page={page} total={orderedTasks.length} onChange={setPage} />
          </div>
        </div>}

      {currentTab === "maintenance-schedule" && <div className="space-y-4">
          <SectionHeader eyebrow="AGENDA FASILITAS" title="Jadwal Perawatan Saya" subtitle="Agenda servis berkala yang ditugaskan kepada Anda." />
          {schedules.length === 0 ? <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400"><CalendarDays className="w-8 h-8 mx-auto text-slate-300 mb-2" />Belum ada jadwal untuk Anda.</div> : <div className="space-y-3">
              {schedules.map((s) => <div key={s.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="text-xs">
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white">{s.facility}</div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5">{s.location}</div>
                    <p className="text-slate-700 dark:text-slate-300 mt-1.5">{s.type}</p>
                    <div className={`font-mono text-[11px] mt-1 ${s.is_overdue ? "text-rose-600 font-bold" : "text-slate-400"}`}>{s.date}{s.is_overdue ? " · lewat jadwal" : s.days_left >= 0 && s.status !== "done" ? ` · ${s.days_left === 0 ? "hari ini" : `${s.days_left} hari lagi`}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${MAINT_STYLE[s.status]}`}>{MAINT_LABEL[s.status]}</span>
                    <button onClick={() => advance(s.id)} className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                      <RotateCcw className="w-3 h-3" /><span>Ubah Status</span>
                    </button>
                  </div>
                </div>)}
            </div>}
        </div>}

      {currentTab === "directory" && <DirectoryPage />}

      {currentTab === "guides" && <div className="space-y-4 max-w-3xl">
          <SectionHeader eyebrow="PANDUAN" title="SOP Penanganan Perbaikan" subtitle="Langkah kerja standar bagi teknisi FasiReport." />
          {[
            ["1. Terima atau tolak tugas", "Periksa deskripsi, foto, dan tenggat. Jika di luar keahlian atau butuh vendor khusus, tolak tugas dengan alasan jelas agar admin dapat menugaskan ulang."],
            ["2. Mulai pengerjaan", "Tekan Terima & Mulai Kerjakan sebelum bekerja di lokasi sehingga pelapor tahu perbaikan sedang berjalan."],
            ["3. Catat progres", "Tambahkan catatan (dan foto bila perlu) setiap ada perkembangan penting, misalnya menunggu suku cadang."],
            ["4. Selesaikan dengan bukti", "Isi ringkasan penyebab dan tindakan, lampirkan foto hasil, serta catat material dan biaya. Uji fungsi fasilitas bersama pelapor bila memungkinkan."],
            ["5. Tunggu konfirmasi", "Pelapor akan mengonfirmasi. Jika belum sesuai, tugas kembali ke Anda dengan alasan dari pelapor dan tenggat 24 jam."]
          ].map(([t, d]) => <div key={t} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white"><BookOpenCheck className="w-4 h-4 text-teal-600" />{t}</div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">{d}</p>
            </div>)}
        </div>}

      {selected && <ReportModal report={selected} isOpen onClose={() => setSelected(null)} onReportUpdated={load} />}
    </div>;
};
