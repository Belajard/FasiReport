import { CalendarRange } from "lucide-react";

/** true bila tanggal (ISO) berada dalam rentang [from, to] (format YYYY-MM-DD, inklusif, zona waktu lokal). */
export const inDateRange = (iso, from, to) => {
  if (!from && !to) return true;
  const t = new Date(iso).getTime();
  if (from && t < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && t > new Date(`${to}T23:59:59.999`).getTime()) return false;
  return true;
};

export const ReportDateFilter = ({ from, to, onFrom, onTo }) => {
  const cls = "bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer";
  return <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs">
      <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
      <input type="date" value={from} max={to || undefined} onChange={(e) => onFrom(e.target.value)} className={cls} aria-label="Dari tanggal" />
      <span className="text-slate-400">–</span>
      <input type="date" value={to} min={from || undefined} onChange={(e) => onTo(e.target.value)} className={cls} aria-label="Sampai tanggal" />
    </div>;
};
