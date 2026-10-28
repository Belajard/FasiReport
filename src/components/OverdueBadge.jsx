import { AlertTriangle } from "lucide-react";

export const OverdueBadge = ({ report }) => report?.is_overdue ? <span
    title={`Batas waktu: ${new Date(report.due_at).toLocaleString("id-ID")}`}
    className="fr-pulse inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
  >
    <AlertTriangle className="w-3 h-3" />
    Terlambat
  </span> : null;
