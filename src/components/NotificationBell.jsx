import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { dataService } from "../services/dataService";

const timeAgo = (iso) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
};

export const NotificationBell = ({ onOpenReport }) => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(dataService.getNotifications());
  const ref = useRef(null);

  useEffect(() => dataService.subscribe(() => setState(dataService.getNotifications())), []);
  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const click = async (n) => {
    setOpen(false);
    try {
      if (!n.is_read) await dataService.markNotificationRead(n.id);
    } catch {
      /* abaikan */
    }
    if (n.report_id && onOpenReport) onOpenReport(n.report_id);
  };

  // Di HP, wadah tidak "relative" sehingga panel menempel ke header (selebar layar); mulai layar sm panel menempel ke lonceng.
  return <div className="sm:relative" ref={ref}>
      <button
    onClick={() => setOpen(!open)}
    aria-label="Notifikasi"
    title="Notifikasi"
    className={`relative ${state.unread > 0 ? "fr-ring" : ""} p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 transition-all border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shadow-2xs`}
  >
        <Bell className="w-4 h-4" />
        {state.unread > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900">
            {state.unread > 9 ? "9+" : state.unread}
          </span>}
      </button>

      {open && <div className="absolute left-3 right-3 top-full mt-2 sm:left-auto sm:right-0 sm:top-auto sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">Notifikasi</span>
            {state.unread > 0 && <button onClick={() => dataService.markAllNotificationsRead()} className="text-[11px] font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1 hover:underline">
                <CheckCheck className="w-3 h-3" />Tandai semua dibaca
              </button>}
          </div>
          <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {state.items.length === 0 && <p className="p-6 text-center text-xs text-slate-400">Belum ada notifikasi.</p>}
            {state.items.map((n) => <button
    key={n.id}
    onClick={() => click(n)}
    className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex gap-2.5 ${n.is_read ? "" : "bg-teal-50/40 dark:bg-teal-950/20"}`}
  >
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.is_read ? "bg-transparent" : "bg-teal-600"}`} />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">{n.title}</span>
                  {n.body && <span className="block text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{n.body}</span>}
                  <span className="block text-[10px] text-slate-400 mt-0.5">{timeAgo(n.created_at)}</span>
                </span>
              </button>)}
          </div>
        </div>}
    </div>;
};
