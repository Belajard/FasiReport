import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../services/dataService";
import { STATUS_CONFIG } from "../types";
import {
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Pencil,
  Trash2,
  Wrench,
  Upload,
  Plus,
  X,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  Building2
} from "lucide-react";

const inputCls =
  "w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500";
const labelCls = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5";
const primaryBtn =
  "px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 rounded-lg shadow-sm shadow-teal-600/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50";
const dangerBtn =
  "px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50";
const ghostBtn =
  "px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50";
const cardCls = "space-y-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs";

const Panel = ({ title, hint, children }) => <div className="pt-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 -mx-6 -mb-6 p-6 space-y-3">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
      {hint && <span className="text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </div>
    {children}
  </div>;

const Notice = ({ tone = "slate", icon: Icon = AlertCircle, children }) => {
  const tones = {
    slate: "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400",
    amber: "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200",
    emerald: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300",
    rose: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
  };
  return <div className={`flex items-start gap-2 p-3 border rounded-xl text-xs ${tones[tone]}`}>
      <Icon className="w-4 h-4 shrink-0 mt-px" />
      <span>{children}</span>
    </div>;
};

const PhotoPicker = ({ label, value, onChange, showToast }) => {
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBusy(true);
      onChange(await dataService.uploadPhoto(file));
    } catch (err) {
      showToast(err.message || "Gagal mengunggah foto.", "error");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };
  return <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-3">
        <label className={`${ghostBtn} cursor-pointer`}>
          <Upload className="w-3.5 h-3.5" />
          <span>{busy ? "Mengunggah..." : value ? "Ganti Foto" : "Unggah Foto"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={pick} disabled={busy} />
        </label>
        {value && <div className="relative">
            <img src={value} alt="Pratinjau" className="h-12 rounded-lg border border-slate-200 dark:border-slate-700 object-cover" />
            <button type="button" onClick={() => onChange(null)} className="absolute -top-2 -right-2 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center">
              <X className="w-3 h-3" />
            </button>
          </div>}
      </div>
    </div>;
};

const toLocalInput = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const SLA_HOURS = { high: 24, medium: 72, low: 168 };

// ---------------------------------------------------------------- ADMIN
const AssignForm = ({ report, run, busy }) => {
  const technicians = dataService.getTechnicians().filter((t) => t.is_active);
  const vendors = dataService.getVendors().filter((v) => v.is_active);
  const [mode, setMode] = useState(report.vendor_id ? "vendor" : "technician");
  const [technicianId, setTechnicianId] = useState(report.technician_id || "");
  const [vendorId, setVendorId] = useState(report.vendor_id || "");
  const [ticket, setTicket] = useState(report.vendor_ticket || "");
  const [due, setDue] = useState(toLocalInput(new Date(Date.now() + SLA_HOURS[report.priority] * 3600 * 1000)));
  const [note, setNote] = useState("");
  const submit = () => {
    const body = { note: note || undefined, due_at: due ? new Date(due).toISOString() : undefined };
    if (mode === "technician") body.technician_id = Number(technicianId);
    else {
      body.vendor_id = Number(vendorId);
      body.vendor_ticket = ticket || undefined;
    }
    run("assign", body, "Laporan diverifikasi dan ditugaskan.");
  };
  const valid = mode === "technician" ? !!technicianId : !!vendorId;
  return <div className={cardCls}>
      <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs font-bold">
        {[["technician", "Teknisi Internal", UserCheck], ["vendor", "Vendor Rekanan", Building2]].map(([key, text, Icon]) => <button
    key={key}
    type="button"
    onClick={() => setMode(key)}
    className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${mode === key ? "bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-400 shadow-xs" : "text-slate-500 dark:text-slate-400"}`}
  >
            <Icon className="w-3.5 h-3.5" />
            {text}
          </button>)}
      </div>

      {mode === "technician" ? <div>
          <label className={labelCls}>Pilih Teknisi</label>
          <select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} className={inputCls}>
            <option value="">-- Pilih teknisi --</option>
            {technicians.map((t) => <option key={t.id} value={t.id}>
                {t.name}{t.specialty ? ` — ${t.specialty}` : ""} ({t.active_tasks} tugas aktif)
              </option>)}
          </select>
        </div> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Pilih Vendor</label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputCls}>
              <option value="">-- Pilih vendor --</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name} — {v.category}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Nomor Tiket Vendor (opsional)</label>
            <input type="text" value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="Contoh: TKT-2026-0142" className={inputCls} />
          </div>
        </div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Batas Waktu Penanganan (SLA)</label>
          <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Catatan untuk Penanggung Jawab</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Instruksi atau catatan verifikasi..." className={inputCls} />
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={submit} disabled={busy || !valid} className={primaryBtn}>
          <span>{report.status === "assigned" ? "Tugaskan Ulang" : "Verifikasi & Tugaskan"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>;
};

const ReasonForm = ({ label, placeholder, buttonText, onSubmit, busy, icon: Icon, danger }) => {
  const [text, setText] = useState("");
  return <div className={cardCls}>
      <div>
        <label className={labelCls}>{label}</label>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className={inputCls} />
      </div>
      <div className="flex justify-end">
        <button onClick={() => onSubmit(text)} disabled={busy || text.trim().length < 3} className={danger ? dangerBtn : primaryBtn}>
          {Icon && <Icon className="w-3.5 h-3.5" />}
          <span>{buttonText}</span>
        </button>
      </div>
    </div>;
};

// ------------------------------------------------------------ PENGERJAAN
const WorkForm = ({ report, run, busy, showToast }) => {
  const [mode, setMode] = useState("progress");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState(null);
  const [summary, setSummary] = useState("");
  const [cost, setCost] = useState("");
  const [materials, setMaterials] = useState([]);
  const matTotal = materials.reduce((s, m) => s + (Number(m.qty) || 0) * (Number(m.unit_cost) || 0), 0);
  const setMat = (i, patch) => setMaterials(materials.map((m, idx) => idx === i ? { ...m, ...patch } : m));
  const submitFinish = () => run("finish", {
    summary,
    after_photo: photo || undefined,
    cost: cost !== "" ? Number(cost) : void 0,
    materials: materials.filter((m) => m.name.trim()).map((m) => ({ name: m.name.trim(), qty: Number(m.qty) || 1, unit_cost: Number(m.unit_cost) || 0 }))
  }, "Perbaikan ditandai selesai. Menunggu konfirmasi pelapor.");
  return <div className={cardCls}>
      <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs font-bold">
        {[["progress", "Catatan Progres"], ["finish", "Tandai Selesai Diperbaiki"]].map(([key, text]) => <button
    key={key}
    type="button"
    onClick={() => setMode(key)}
    className={`flex-1 py-2 rounded-lg transition-all ${mode === key ? "bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-400 shadow-xs" : "text-slate-500 dark:text-slate-400"}`}
  >
            {text}
          </button>)}
      </div>

      {mode === "progress" ? <>
          <div>
            <label className={labelCls}>Update Pengerjaan</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: Menunggu suku cadang kompresor tiba besok..." className={inputCls} />
          </div>
          <PhotoPicker label="Foto Progres (opsional)" value={photo} onChange={setPhoto} showToast={showToast} />
          <div className="flex justify-end">
            <button disabled={busy || note.trim().length < 3} className={primaryBtn} onClick={() => run("progress", { note, photo: photo || undefined }, "Catatan progres disimpan.")}>
              <span>Simpan Progres</span>
            </button>
          </div>
        </> : <>
          <div>
            <label className={labelCls}>Ringkasan Perbaikan <span className="text-rose-500">*</span></label>
            <textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Jelaskan penyebab kerusakan dan tindakan perbaikan yang dilakukan..." className={inputCls} />
          </div>
          <PhotoPicker label="Foto Hasil Perbaikan (opsional)" value={photo} onChange={setPhoto} showToast={showToast} />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Suku Cadang / Material Terpakai</label>
              <button type="button" onClick={() => setMaterials([...materials, { name: "", qty: 1, unit_cost: 0 }])} className="text-xs font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            </div>
            {materials.length === 0 && <p className="text-[11px] text-slate-400 dark:text-slate-500">Belum ada material dicatat.</p>}
            <div className="space-y-2">
              {materials.map((m, i) => <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input className={`${inputCls} col-span-6`} placeholder="Nama material" value={m.name} onChange={(e) => setMat(i, { name: e.target.value })} />
                  <input className={`${inputCls} col-span-2`} type="number" min="0" step="any" placeholder="Qty" value={m.qty} onChange={(e) => setMat(i, { qty: e.target.value })} />
                  <input className={`${inputCls} col-span-3`} type="number" min="0" placeholder="Harga satuan" value={m.unit_cost} onChange={(e) => setMat(i, { unit_cost: e.target.value })} />
                  <button type="button" onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))} className="col-span-1 text-slate-400 hover:text-rose-600 flex justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>)}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className={labelCls}>Total Biaya (Rp)</label>
              <input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} placeholder={matTotal ? `Otomatis dari material: ${matTotal.toLocaleString("id-ID")}` : "0"} className={inputCls} />
            </div>
            <div className="flex justify-end">
              <button disabled={busy || summary.trim().length < 3} className={primaryBtn} onClick={submitFinish}>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Kirim untuk Konfirmasi</span>
              </button>
            </div>
          </div>
        </>}
    </div>;
};

// ------------------------------------------------------------------ MAIN
export const ReportActions = ({ report, onChanged, onOpenEdit, onClose }) => {
  const { user, showToast } = useAuth();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setConfirmDelete(false), [report.id, report.status]);

  const run = async (action, body, successMsg) => {
    try {
      setBusy(true);
      await dataService.transition(report.id, action, body);
      showToast(successMsg, "success");
      if (onChanged) onChanged();
    } catch (err) {
      showToast(err.message || "Aksi gagal dilakukan.", "error");
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    try {
      setBusy(true);
      await dataService.deleteReport(report.id);
      showToast("Laporan berhasil dihapus.", "success");
      if (onChanged) onChanged();
      onClose();
    } catch (err) {
      showToast(err.message || "Gagal menghapus laporan", "error");
    } finally {
      setBusy(false);
    }
  };

  const st = report.status;
  const isVendorJob = !!report.vendor_id;
  const closedInfo = st === "completed" ? <Notice tone="emerald" icon={CheckCircle}>
        Laporan ini telah mencapai status <strong>Selesai</strong>. Seluruh proses perbaikan telah tuntas dan laporan terkunci.
      </Notice> : null;

  // ---------------- ADMIN
  if (user.role === "admin") {
    return <Panel title="Tindakan Admin & Alur Penanganan" hint="Dilaporkan → Ditugaskan → Diproses → Diperbaiki → Selesai">
        {st === "completed" && closedInfo}
        {st === "rejected" && <>
            <Notice tone="rose">Laporan ditolak: {report.rejection_reason}</Notice>
            <div className="flex justify-end">
              {confirmDelete ? <button onClick={remove} disabled={busy} className={dangerBtn}><Trash2 className="w-3.5 h-3.5" />Ya, hapus permanen</button> : <button onClick={() => setConfirmDelete(true)} className={dangerBtn}><Trash2 className="w-3.5 h-3.5" />Hapus Laporan</button>}
            </div>
          </>}
        {(st === "reported" || st === "assigned") && <>
            {st === "reported" && <Notice tone="amber">Verifikasi laporan ini: tugaskan ke teknisi/vendor, atau tolak jika tidak valid.</Notice>}
            {st === "assigned" && <Notice tone="slate">Menunggu penanggung jawab memulai pengerjaan. Anda dapat menugaskan ulang bila perlu.</Notice>}
            <AssignForm report={report} run={run} busy={busy} />
            {st === "assigned" && isVendorJob && <div className="flex justify-end">
                <button disabled={busy} onClick={() => run("start", { note: "Vendor mulai mengerjakan perbaikan." }, "Pengerjaan vendor dimulai.")} className={primaryBtn}>
                  <Wrench className="w-3.5 h-3.5" /><span>Catat: Vendor Mulai Bekerja</span>
                </button>
              </div>}
            {st === "reported" && <ReasonForm label="Atau tolak laporan ini" placeholder="Alasan penolakan (mis. duplikat / bukan kerusakan fasilitas)..." buttonText="Tolak Laporan" onSubmit={(t) => run("reject", { note: t }, "Laporan ditolak.")} busy={busy} icon={ThumbsDown} danger />}
          </>}
        {st === "processing" && (isVendorJob ? <>
            <Notice tone="slate">Ditangani vendor <strong>{report.vendor?.name}</strong>{report.vendor_ticket ? ` (tiket ${report.vendor_ticket})` : ""}. Perbarui progres atas nama vendor.</Notice>
            <WorkForm report={report} run={run} busy={busy} showToast={showToast} />
          </> : <Notice tone="slate" icon={Wrench}>Sedang dikerjakan oleh teknisi <strong>{report.technician?.name}</strong>. Admin dapat memantau progres pada riwayat di atas.</Notice>)}
        {st === "repaired" && <>
            <Notice tone="amber">Perbaikan selesai dan menunggu konfirmasi pelapor. Jika pelapor tidak merespons, admin dapat menutup laporan.</Notice>
            <ReasonForm label="Tutup laporan sebagai admin" placeholder="Catatan penutupan (mis. sudah diverifikasi langsung di lokasi)..." buttonText="Tutup & Selesaikan" onSubmit={(t) => run("force_complete", { note: t }, "Laporan ditutup oleh admin.")} busy={busy} icon={CheckCircle} />
          </>}
        {st !== "rejected" && <div className="pt-3 mt-1 border-t border-dashed border-rose-200 dark:border-rose-900/50 flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Data salah atau uji coba? Admin dapat menghapus laporan ini secara permanen.</p>
            {confirmDelete ? <button onClick={remove} disabled={busy} className={dangerBtn}><Trash2 className="w-3.5 h-3.5" />Ya, hapus permanen</button> : <button onClick={() => setConfirmDelete(true)} className={dangerBtn}><Trash2 className="w-3.5 h-3.5" />Hapus Laporan</button>}
          </div>}
      </Panel>;
  }

  // ---------------- TEKNISI
  if (user.role === "technician") {
    return <Panel title="Tindakan Teknisi" hint="Terima tugas → kerjakan → kirim hasil perbaikan">
        {st === "assigned" && <>
            <Notice tone="amber">Tugas baru untuk Anda. Mulai kerjakan, atau tolak bila tidak dapat ditangani.</Notice>
            <div className={cardCls}>
              <div className="flex justify-end">
                <button disabled={busy} onClick={() => run("start", {}, "Pengerjaan dimulai.")} className={primaryBtn}>
                  <Wrench className="w-3.5 h-3.5" /><span>Terima & Mulai Kerjakan</span>
                </button>
              </div>
            </div>
            <ReasonForm label="Tidak dapat menangani tugas ini?" placeholder="Alasan (mis. butuh vendor khusus / di luar keahlian)..." buttonText="Tolak Tugas" onSubmit={(t) => run("decline", { note: t }, "Tugas dikembalikan ke admin.")} busy={busy} icon={ThumbsDown} danger />
          </>}
        {st === "processing" && <WorkForm report={report} run={run} busy={busy} showToast={showToast} />}
        {st === "repaired" && <Notice tone="amber" icon={CheckCircle}>Hasil perbaikan sudah dikirim dan menunggu konfirmasi pelapor.</Notice>}
        {st === "completed" && closedInfo}
      </Panel>;
  }

  // ---------------- KARYAWAN
  const isOwner = report.user_id === user.id;
  if (!isOwner) return null;
  return <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
      {st === "reported" && <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Laporan berstatus <strong>Dilaporkan</strong> masih dapat diedit atau dibatalkan.</span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenEdit && <button onClick={() => { onClose(); onOpenEdit(report); }} className={ghostBtn}>
                <Pencil className="w-3.5 h-3.5" />Edit Laporan
              </button>}
            <button onClick={remove} disabled={busy} className={dangerBtn}>
              <Trash2 className="w-3.5 h-3.5" />Hapus
            </button>
          </div>
        </div>}
      {st === "repaired" && <ConfirmRepair report={report} run={run} busy={busy} />}
      {(st === "assigned" || st === "processing") && <Notice tone="slate" icon={Wrench}>
          Laporan sedang ditangani{report.technician ? ` oleh ${report.technician.name}` : report.vendor ? ` oleh ${report.vendor.name}` : ""}
          {" "}(status: <strong>{STATUS_CONFIG[st].label}</strong>). Laporan tidak dapat diedit atau dihapus sesuai aturan sistem.
        </Notice>}
      {st === "completed" && closedInfo}
      {st === "rejected" && <Notice tone="rose">Laporan ditolak admin{report.rejection_reason ? `: ${report.rejection_reason}` : "."}</Notice>}
    </div>;
};

const ConfirmRepair = ({ report, run, busy }) => {
  const [disputing, setDisputing] = useState(false);
  return <div className="space-y-3">
      <Notice tone="amber" icon={CheckCircle}>
        Teknisi menyatakan perbaikan sudah selesai. Periksa fasilitas, lalu konfirmasi apakah sudah berfungsi dengan baik.
      </Notice>
      {report.repair_summary && <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-950 dark:text-indigo-200">
          <div className="font-bold mb-0.5">Ringkasan perbaikan</div>
          {report.repair_summary}
        </div>}
      {report.after_photo && <a href={report.after_photo} target="_blank" rel="noreferrer">
          <img src={report.after_photo} alt="Hasil perbaikan" className="max-h-40 rounded-xl border border-slate-200 dark:border-slate-700 object-cover" />
        </a>}
      {!disputing ? <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button onClick={() => setDisputing(true)} disabled={busy} className={dangerBtn}>
            <ThumbsDown className="w-3.5 h-3.5" />Belum Sesuai
          </button>
          <button onClick={() => run("confirm", {}, "Terima kasih! Laporan dinyatakan selesai.")} disabled={busy} className={primaryBtn}>
            <ThumbsUp className="w-3.5 h-3.5" />Sudah Baik, Selesaikan
          </button>
        </div> : <ReasonForm label="Apa yang masih bermasalah?" placeholder="Jelaskan kendala yang masih terjadi..." buttonText="Kirim ke Teknisi" onSubmit={(t) => run("dispute", { note: t }, "Laporan dikembalikan ke teknisi.")} busy={busy} icon={ThumbsDown} danger />}
    </div>;
};
