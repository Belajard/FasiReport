import { STATUS_CONFIG, ROLE_LABEL } from "../types";
import { CheckCircle2, Clock, Wrench, CheckCheck } from "lucide-react";
const STEPS = [
  { status: "reported", label: "Dilaporkan", icon: Clock },
  { status: "assigned", label: "Ditugaskan", icon: Clock },
  { status: "processing", label: "Diproses", icon: Wrench },
  { status: "repaired", label: "Diperbaiki", icon: Wrench },
  { status: "completed", label: "Selesai", icon: CheckCheck }
];
export const ReportTimeline = ({ currentStatus, histories = [] }) => {
  const currentStepNumber = STATUS_CONFIG[currentStatus]?.step || 1;
  const isRejected = currentStatus === "rejected";
  return <div className="space-y-6">
      {
    /* Visual Stepper Tracker */
  }
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Tahapan Penanganan
        </h4>
        {isRejected && <div className="mb-3 p-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900/60 text-xs font-bold text-rose-700 dark:text-rose-300">
            Laporan ini ditolak setelah verifikasi admin dan tidak dilanjutkan.
          </div>}
        {!isRejected && <div className="relative flex items-center justify-between">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 w-full z-0" />
          <div
    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-teal-500 to-sky-500 transition-all duration-500 z-0"
    style={{ width: `${(currentStepNumber - 1) / 4 * 100}%` }}
  />

          {STEPS.map((step) => {
    const stepNum = STATUS_CONFIG[step.status]?.step || 1;
    const isCompleted = stepNum < currentStepNumber;
    const isCurrent = stepNum === currentStepNumber;
    const StepIcon = step.icon;
    return <div key={step.status} className="relative z-10 flex flex-col items-center">
                <div
      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${isCompleted ? "bg-teal-600 text-white shadow-teal-500/20" : isCurrent ? "bg-teal-600 text-white ring-4 ring-teal-100 dark:ring-teal-900/40 shadow-md scale-110" : "bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500"}`}
    >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-4 h-4" />}
                </div>
                <div className="mt-2 text-center">
                  <span
      className={`text-xs font-bold whitespace-nowrap block ${isCurrent ? "text-teal-700 dark:text-teal-300 font-extrabold" : isCompleted ? "text-teal-800 dark:text-teal-400 font-semibold" : "text-slate-400 dark:text-slate-500 font-medium"}`}
    >
                    {step.label}
                  </span>
                </div>
              </div>;
  })}
        </div>}
      </div>

      {
    /* Audit Log / History Entries */
  }
      <div>
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Riwayat Perubahan Status
        </h4>
        {histories.length === 0 ? <p className="text-xs text-slate-400 dark:text-slate-500 italic">Belum ada riwayat tercatat.</p> : <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-4">
            {histories.map((h, index) => {
    const statusCfg = STATUS_CONFIG[h.status];
    const dateFormatted = new Date(h.created_at).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    return <div key={h.id || index} className="relative group">
                  {
      /* Dot */
    }
                  <div
      className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${h.status === "completed" ? "bg-emerald-500" : h.status === "repaired" ? "bg-indigo-500" : h.status === "processing" ? "bg-sky-500" : h.status === "assigned" ? "bg-teal-500" : h.status === "rejected" ? "bg-rose-500" : "bg-amber-500"}`}
    />
                  <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                      <span className={`font-semibold ${statusCfg?.text}`}>
                        {statusCfg?.label || h.status}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                        {dateFormatted}
                      </span>
                    </div>

                    <div className="text-slate-700 dark:text-slate-200 mt-0.5">
                      {h.note || "Tidak ada catatan tambahan."}
                    </div>
                    {h.photo && <a href={h.photo} target="_blank" rel="noreferrer">
                        <img src={h.photo} alt="Foto perbaikan" className="mt-2 h-24 rounded-lg border border-slate-200 dark:border-slate-700 object-cover" />
                      </a>}

                    <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 border-t border-slate-200/60 dark:border-slate-700 pt-1.5">
                      <span>Diubah oleh:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {h.changed_by_user?.name || `Pengguna #${h.changed_by}`}
                      </span>
                      {h.changed_by_user?.role && <span className="text-slate-400 dark:text-slate-500">
                          ({ROLE_LABEL[h.changed_by_user.role] || h.changed_by_user.role})
                        </span>}
                    </div>
                  </div>
                </div>;
  })}
          </div>}
      </div>

    </div>;
};
