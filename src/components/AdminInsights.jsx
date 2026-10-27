import { useEffect, useState } from "react";
import { dataService } from "../services/dataService";
import { formatRupiah } from "./ui";
import { Wallet, Timer, ThumbsDown } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const monthLabel = (ym) => MONTHS[Number(ym.slice(5, 7)) - 1];
const fmtHours = (h) => h === null || h === undefined ? "-" : h >= 48 ? `${(h / 24).toFixed(1)} hari` : `${h} jam`;

const Card = ({ eyebrow, title, children }) => <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-6 transition-colors">
    <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 dark:text-teal-400">{eyebrow}</div>
    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5 mb-4">{title}</h3>
    {children}
  </div>;

const Tile = ({ icon: Icon, label, value, hint }) => <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</span>
      <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 flex items-center justify-center border border-teal-200/40 dark:border-teal-800/40"><Icon className="w-4 h-4" /></div>
    </div>
    <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-2 tabular-nums">{value}</div>
    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</div>
  </div>;

export const AdminInsights = () => {
  const [stats, setStats] = useState(dataService.getAdminStats());
  const [techs, setTechs] = useState(dataService.getTechnicians());
  useEffect(() => dataService.subscribe(() => {
    setStats(dataService.getAdminStats());
    setTechs(dataService.getTechnicians());
  }), []);

  const trend = stats.trend || [];
  const maxTrend = Math.max(1, ...trend.map((t) => t.reports));
  const cats = stats.byCategory || [];
  const maxCat = Math.max(1, ...cats.map((c) => c.count));
  const tops = stats.topFacilities || [];
  const maxTop = Math.max(1, ...tops.map((c) => c.count));

  return <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tile icon={Wallet} label="Total Biaya Perbaikan" value={formatRupiah(stats.totalCost)} hint="Dari perbaikan yang sudah dikerjakan" />
        <Tile icon={Timer} label="Rata-rata Waktu Selesai" value={fmtHours(stats.avgResolutionHours)} hint="Dari laporan masuk hingga dikonfirmasi" />
        <Tile icon={ThumbsDown} label="Hasil Ditolak Pelapor" value={`${stats.disputedCount || 0} Laporan`} hint="Perbaikan yang dikembalikan ke teknisi" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card eyebrow="TREN" title="Laporan 6 Bulan Terakhir">
          <div className="flex items-end gap-3 h-40" role="img" aria-label="Grafik batang jumlah laporan dan laporan selesai per bulan">
            {trend.map((t) => <div key={t.month} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">{t.reports}</div>
                <div className="w-full flex items-end justify-center gap-1 flex-1">
                  <div className="w-1/2 max-w-[18px] rounded-t-md bg-teal-600" style={{ height: `${t.reports / maxTrend * 100}%`, minHeight: t.reports ? 4 : 2 }} title={`${t.reports} laporan`} />
                  <div className="w-1/2 max-w-[18px] rounded-t-md bg-emerald-400" style={{ height: `${t.completed / maxTrend * 100}%`, minHeight: t.completed ? 4 : 2 }} title={`${t.completed} selesai`} />
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{monthLabel(t.month)}</div>
              </div>)}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-teal-600" />Masuk</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />Selesai</span>
          </div>
        </Card>

        <Card eyebrow="SEBARAN" title="Laporan per Kategori Fasilitas">
          {cats.length === 0 ? <p className="text-xs text-slate-400">Belum ada data.</p> : <div className="space-y-3">
              {cats.map((c) => <div key={c.category}>
                  <div className="flex justify-between text-xs mb-1"><span className="font-semibold text-slate-700 dark:text-slate-200">{c.category}</span><span className="font-mono text-slate-500">{c.count}</span></div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-teal-600" style={{ width: `${c.count / maxCat * 100}%` }} /></div>
                </div>)}
            </div>}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card eyebrow="PERHATIAN" title="Fasilitas Paling Sering Dilaporkan">
          {tops.length === 0 ? <p className="text-xs text-slate-400">Belum ada data.</p> : <div className="space-y-3">
              {tops.map((f, i) => <div key={f.id}>
                  <div className="flex justify-between text-xs mb-1"><span className="font-semibold text-slate-700 dark:text-slate-200">{i + 1}. {f.name} <span className="font-normal text-slate-400">· {f.location}</span></span><span className="font-mono text-slate-500">{f.count}×</span></div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-amber-500" style={{ width: `${f.count / maxTop * 100}%` }} /></div>
                </div>)}
            </div>}
        </Card>

        <Card eyebrow="KINERJA" title="Kinerja Teknisi">
          {techs.length === 0 ? <p className="text-xs text-slate-400">Belum ada teknisi.</p> : <div className="overflow-x-auto -mx-2">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr><th className="py-2 px-2">Teknisi</th><th className="py-2 px-2 text-right">Aktif</th><th className="py-2 px-2 text-right">Ditangani</th><th className="py-2 px-2 text-right">Rata²</th><th className="py-2 px-2 text-right">Ditolak</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {techs.map((t) => <tr key={t.id}>
                      <td className="py-2 px-2 font-semibold text-slate-800 dark:text-slate-200">{t.name}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{t.active_tasks}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{t.handled_total}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{fmtHours(t.avg_repair_hours)}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{t.disputed_total}</td>
                    </tr>)}
                </tbody>
              </table>
            </div>}
        </Card>
      </div>
    </div>;
};
