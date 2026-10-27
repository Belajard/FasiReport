import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ReportStatusBadge } from "./ReportStatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { ReportTimeline } from "./ReportTimeline";
import { ReportActions } from "./ReportActions";
import { ReportComments } from "./ReportComments";
import {
  X,
  MapPin,
  Tag,
  User,
  Mail,
  Calendar,
  MessageSquare,
  Wrench,
  Timer,
  Wallet
} from "lucide-react";
export const ReportModal = ({
  report,
  isOpen,
  onClose,
  onReportUpdated,
  onOpenEdit
}) => {
  const { user } = useAuth();
  const [selectedPhotoZoom, setSelectedPhotoZoom] = useState(null);
  if (!isOpen || !user) return null;
  const canSeeReporter = user.role === "admin" || user.role === "technician";
  const responsible = report.technician
    ? `${report.technician.name}${report.technician.specialty ? ` (${report.technician.specialty})` : ""}`
    : report.vendor ? `${report.vendor.name} (Vendor)` : null;
  const fmt = (d) => new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const dateCreated = new Date(report.created_at).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  return <div className="anim-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 transition-colors">
        
        {
    /* Header */
  }
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                #{report.id}
              </span>
              <ReportStatusBadge status={report.status} />
              <PriorityBadge priority={report.priority} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
              {report.facility?.name || "Fasilitas Tidak Diketahui"}
            </h3>
          </div>
          <button
    onClick={onClose}
    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
  >
            <X className="w-5 h-5" />
          </button>
        </div>

        {
    /* Content Body */
  }
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {
    /* Metadata Grid */
  }
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Lokasi Fasilitas</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">{report.facility?.location || "-"}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Tag className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Kategori Fasilitas</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">{report.facility?.category || "-"}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Waktu Dilaporkan</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">{dateCreated}</div>
              </div>
            </div>

            {canSeeReporter && <>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 sm:col-span-2">
                  <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Identitas Pelapor</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {report.user?.name || "Pelapor Tidak Diketahui"}
                      <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">
                        ({report.user?.email || "-"})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Role Pelapor</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-[11px]">
                      {report.user?.role || "employee"}
                    </div>
                  </div>
                </div>
              </>}

            {responsible && <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Wrench className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Penanggung Jawab</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{responsible}</div>
                </div>
              </div>}

            {report.due_at && <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Timer className={`w-4 h-4 shrink-0 ${report.is_overdue ? "text-rose-600" : "text-amber-600 dark:text-amber-400"}`} />
                <div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Batas Waktu (SLA)</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {fmt(report.due_at)}
                    {report.is_overdue && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">Terlambat</span>}
                  </div>
                </div>
              </div>}

            {report.vendor_ticket && <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Tag className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Tiket Vendor</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{report.vendor_ticket}</div>
                </div>
              </div>}

            {Number(report.cost) > 0 && canSeeReporter && <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Biaya Perbaikan</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Rp {Number(report.cost).toLocaleString("id-ID")}</div>
                </div>
              </div>}
          </div>

          {
    /* Description */
  }
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Deskripsi Kerusakan
            </h4>
            <div className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
              {report.description}
            </div>
          </div>

          {
    /* Photo */
  }
          {report.photo && <div>
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Foto Dokumentasi Kerusakan
              </h4>
              <div className="relative inline-block border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden group">
                <img
    src={report.photo}
    alt="Dokumentasi Kerusakan"
    className="max-h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
    onClick={() => setSelectedPhotoZoom(report.photo)}
  />
                <button
    type="button"
    onClick={() => setSelectedPhotoZoom(report.photo)}
    className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[11px] px-2.5 py-1 rounded-md backdrop-blur-xs hover:bg-slate-900 transition-colors"
  >
                  Perbesar Foto
                </button>
              </div>
            </div>}

          {
    /* Admin Note If Any */
  }
          {report.admin_note && <div className="p-4 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-900 dark:text-sky-300 mb-1">
                <MessageSquare className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                Catatan Terkini
              </div>
              <p className="text-sm text-sky-950 dark:text-sky-200">{report.admin_note}</p>
            </div>}

          {
    /* Timeline & Histories */
  }
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <ReportTimeline
    currentStatus={report.status}
    histories={report.status_histories}
  />
          </div>

          {report.materials?.length > 0 && <div>
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Material Terpakai
              </h4>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {report.materials.map((m) => <div key={m.id} className="flex items-center justify-between px-3 py-2 text-slate-700 dark:text-slate-300">
                    <span>{m.name} <span className="text-slate-400">× {Number(m.qty)}</span></span>
                    <span className="font-mono">Rp {(Number(m.qty) * Number(m.unit_cost)).toLocaleString("id-ID")}</span>
                  </div>)}
              </div>
            </div>}

          <ReportComments reportId={report.id} />

          <ReportActions report={report} onChanged={onReportUpdated} onOpenEdit={onOpenEdit} onClose={onClose} />
        </div>

        {
    /* Footer */
  }
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70">
          <button
    onClick={onClose}
    className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
  >
            Tutup
          </button>
        </div>
      </div>


      {
    /* Photo Zoom Modal */
  }
      {selectedPhotoZoom && <div
    className="anim-overlay fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm cursor-pointer"
    onClick={() => setSelectedPhotoZoom(null)}
  >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
    src={selectedPhotoZoom}
    alt="Foto Diperbesar"
    className="max-h-[85vh] max-w-full rounded-lg shadow-2xl object-contain"
  />
            <p className="text-center text-white text-xs mt-2 opacity-80">
              Klik di mana saja untuk menutup
            </p>
          </div>
        </div>}
    </div>;
};
