import { useEffect, useState } from "react";
import { dataService } from "../services/dataService";
import { ModalShell, formatRupiah } from "./ui";
import { ReportStatusBadge } from "./ReportStatusBadge";
import { PriorityBadge } from "./PriorityBadge";

export const FacilityHistoryModal = ({ facility, onClose }) => {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    dataService.getFacilityHistory(facility.id).then(setRows).catch((e) => setError(e.message));
  }, [facility.id]);
  return <ModalShell title={`Riwayat: ${facility.name}`} subtitle={`${facility.location} · ${facility.category}`} onClose={onClose} maxW="max-w-2xl">
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {!rows && !error && <p className="text-xs text-slate-400">Memuat riwayat...</p>}
      {rows && rows.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Belum ada laporan untuk fasilitas ini.</p>}
      {rows && rows.length > 0 && <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {rows.map((r) => <div key={r.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-slate-400">#{r.id}</span>
                <PriorityBadge priority={r.priority} />
                <ReportStatusBadge status={r.status} />
                <span className="ml-auto text-[11px] text-slate-400 font-mono">{new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 mt-1.5 line-clamp-2">{r.description}</p>
              <div className="text-[11px] text-slate-400 mt-1 flex gap-3">
                {r.technician_name && <span>Teknisi: {r.technician_name}</span>}
                {Number(r.cost) > 0 && <span>Biaya {formatRupiah(r.cost)}</span>}
              </div>
            </div>)}
        </div>}
    </ModalShell>;
};
