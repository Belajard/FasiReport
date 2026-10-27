// Potongan UI kecil yang dipakai ulang oleh halaman baru (gaya sama dengan halaman lama).
export const inputCls =
  "w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 text-slate-900 dark:text-white";
export const labelCls = "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1";
export const primaryBtn =
  "px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5";
export const ghostBtn =
  "px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 rounded-xl flex items-center justify-center gap-1.5 transition-colors";
export const cardCls =
  "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6";

export const SectionHeader = ({ eyebrow, title, subtitle, action }) => <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
    <div>
      {eyebrow && <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 dark:text-teal-400">{eyebrow}</div>}
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
      {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>;

export const ModalShell = ({ title, subtitle, onClose, children, maxW = "max-w-lg" }) => <div className="anim-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
    <div className={`relative w-full ${maxW} bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 transition-colors`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors" aria-label="Tutup">
          ✕
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>;

export const formatRupiah = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
export const phoneHref = (p) => `tel:${String(p || "").replace(/[^\d+]/g, "")}`;
export const waHref = (p) => {
  let d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = `62${d.slice(1)}`;
  return `https://wa.me/${d}`;
};
