import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../services/dataService";
import { ROLE_LABEL } from "../types";
import { SectionHeader } from "../components/ui";
import { Pagination, paginate } from "../components/Pagination";

const ACTION_LABEL = {
  login: "Masuk ke sistem", register: "Mendaftar akun", change_password: "Mengganti kata sandi",
  create: "Membuat", update: "Mengubah", delete: "Menghapus", advance: "Mengubah status",
  assign: "Menugaskan", reject: "Menolak", start: "Memulai pengerjaan", decline: "Menolak tugas",
  progress: "Memperbarui progres", finish: "Menandai selesai diperbaiki", confirm: "Mengonfirmasi perbaikan",
  dispute: "Menolak hasil perbaikan", force_complete: "Menutup laporan"
};
const ENTITY_LABEL = { user: "pengguna", facility: "fasilitas", report: "laporan", vendor: "vendor", maintenance: "jadwal servis" };

export const AuditPage = () => {
  const { showToast } = useAuth();
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  useEffect(() => {
    dataService.getAuditLogs(500).then(setLogs).catch((e) => showToast(e.message, "error"));
  }, []);
  useEffect(() => setPage(1), [q]);

  const text = (l) => `${l.user_name || "Sistem"} ${ACTION_LABEL[l.action] || l.action} ${["login", "register", "change_password"].includes(l.action) ? "" : `${ENTITY_LABEL[l.entity] || l.entity}${l.entity_id ? ` #${l.entity_id}` : ""}`}`.trim();
  const filtered = logs.filter((l) => text(l).toLowerCase().includes(q.toLowerCase()));

  return <div className="space-y-4">
      <SectionHeader eyebrow="AUDIT TRAIL" title="Log Aktivitas" subtitle="Catatan siapa melakukan apa dan kapan. Hanya dapat dilihat admin." />
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari aktivitas atau nama pengguna..." className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {paginate(filtered, page).map((l) => <li key={l.id} className="px-4 py-3 flex items-start justify-between gap-3 text-xs">
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">{text(l)}</div>
                <div className="text-[11px] text-slate-400">{l.user_role ? ROLE_LABEL[l.user_role] : "Sistem"}</div>
              </div>
              <time className="text-[11px] font-mono text-slate-400 shrink-0">{new Date(l.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
            </li>)}
        </ul>
        {filtered.length === 0 && <p className="p-8 text-center text-xs text-slate-400">Belum ada aktivitas.</p>}
        <Pagination page={page} total={filtered.length} onChange={setPage} />
      </div>
    </div>;
};
