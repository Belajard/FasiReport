import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 10;

/** Potong data untuk halaman aktif. */
export const paginate = (items, page, size = PAGE_SIZE) => items.slice((page - 1) * size, page * size);

export const Pagination = ({ page, total, size = PAGE_SIZE, onChange }) => {
  const pages = Math.max(1, Math.ceil(total / size));
  if (total <= size) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  const btn = "p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";
  return <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
      <span>Menampilkan {from}–{to} dari {total} data</span>
      <div className="flex items-center gap-2">
        <button className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Halaman sebelumnya">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-bold text-slate-700 dark:text-slate-200">Hal. {page} / {pages}</span>
        <button className={btn} disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Halaman berikutnya">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>;
};
