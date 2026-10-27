import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../services/dataService";
import { PhoneCall, MessageCircle, Mail, Plus, Pencil, Trash2, Users, Building2, AlertTriangle } from "lucide-react";
import { SectionHeader, ModalShell, inputCls, labelCls, primaryBtn, ghostBtn, cardCls, phoneHref, waHref, formatRupiah } from "../components/ui";

const EMPTY = { name: "", category: "", pic_name: "", phone: "", email: "", contract_end: "", notes: "" };

const VendorForm = ({ vendor, onClose, onSaved }) => {
  const { showToast } = useAuth();
  const [form, setForm] = useState(vendor ? { ...EMPTY, ...vendor, contract_end: vendor.contract_end?.slice(0, 10) || "", email: vendor.email || "", pic_name: vendor.pic_name || "", phone: vendor.phone || "", notes: vendor.notes || "" } : EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setBusy(true);
      const payload = {
        name: form.name, category: form.category, pic_name: form.pic_name || null, phone: form.phone || null,
        email: form.email || "", contract_end: form.contract_end || "", notes: form.notes || null
      };
      if (vendor) await dataService.updateVendor(vendor.id, payload);
      else await dataService.createVendor(payload);
      showToast(`Vendor '${form.name}' berhasil disimpan.`, "success");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return <ModalShell title={vendor ? "Edit Vendor Rekanan" : "Tambah Vendor Rekanan"} subtitle="Data kontak dan masa kontrak vendor pemeliharaan" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 text-xs">
        {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-800 dark:text-rose-300">{error}</div>}
        <div><label className={labelCls}>Nama Vendor *</label><input className={inputCls} value={form.name} onChange={set("name")} required /></div>
        <div><label className={labelCls}>Bidang / Kategori Layanan *</label><input className={inputCls} value={form.category} onChange={set("category")} placeholder="Contoh: HVAC & Tata Udara (AC Sentral)" required /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Nama PIC</label><input className={inputCls} value={form.pic_name} onChange={set("pic_name")} /></div>
          <div><label className={labelCls}>Telepon / WhatsApp</label><input className={inputCls} value={form.phone} onChange={set("phone")} placeholder="0812-3456-7890" /></div>
          <div><label className={labelCls}>Email</label><input type="email" className={inputCls} value={form.email} onChange={set("email")} /></div>
          <div><label className={labelCls}>Kontrak Berakhir</label><input type="date" className={inputCls} value={form.contract_end} onChange={set("contract_end")} /></div>
        </div>
        <div><label className={labelCls}>Catatan</label><textarea rows={2} className={`${inputCls} resize-none`} value={form.notes} onChange={set("notes")} /></div>
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Batal</button>
          <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Menyimpan..." : "Simpan"}</button>
        </div>
      </form>
    </ModalShell>;
};

const ContactButtons = ({ phone, email }) => <div className="flex items-center gap-1.5 mt-3">
    {phone && <a href={phoneHref(phone)} className={`${ghostBtn} !py-1.5 !px-2.5`} title="Telepon"><PhoneCall className="w-3.5 h-3.5" />Telepon</a>}
    {phone && <a href={waHref(phone)} target="_blank" rel="noreferrer" className={`${ghostBtn} !py-1.5 !px-2.5`} title="WhatsApp"><MessageCircle className="w-3.5 h-3.5" />WhatsApp</a>}
    {email && <a href={`mailto:${email}`} className={`${ghostBtn} !py-1.5 !px-2.5`} title="Email"><Mail className="w-3.5 h-3.5" /></a>}
  </div>;

export const DirectoryPage = () => {
  const { user, showToast } = useAuth();
  const isAdmin = user.role === "admin";
  const [tab, setTab] = useState(isAdmin ? "technicians" : "vendors");
  const [technicians, setTechnicians] = useState(dataService.getTechnicians());
  const [vendors, setVendors] = useState(dataService.getVendors());
  const [editing, setEditing] = useState(undefined); // undefined = tertutup, null = baru, objek = edit
  const [historyFor, setHistoryFor] = useState(null);

  useEffect(() => dataService.subscribe(() => {
    setTechnicians(dataService.getTechnicians());
    setVendors(dataService.getVendors());
  }), []);

  const removeVendor = async (v) => {
    if (!window.confirm(`Hapus vendor '${v.name}'?`)) return;
    try {
      await dataService.deleteVendor(v.id);
      showToast("Vendor dihapus.", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };
  const toggleVendor = async (v) => {
    try {
      await dataService.updateVendor(v.id, { is_active: !v.is_active });
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return <div className="space-y-6">
      <SectionHeader
    eyebrow="DIREKTORI REKANAN"
    title="Direktori Teknisi & Vendor Pemeliharaan"
    subtitle="Kontak tim teknisi internal dan vendor rekanan resmi. Dipakai juga saat penugasan laporan dan penjadwalan servis."
    action={isAdmin && tab === "vendors" && <button onClick={() => setEditing(null)} className={primaryBtn}><Plus className="w-3.5 h-3.5" />Tambah Vendor</button>}
  />

      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl max-w-md text-xs font-bold">
        {[...(isAdmin ? [["technicians", "Tim Teknisi Internal", Users]] : []), ["vendors", "Vendor Rekanan", Building2]].map(([key, label, Icon]) => <button
    key={key}
    onClick={() => setTab(key)}
    className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${tab === key ? "bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-400 shadow-xs" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
  >
            <Icon className="w-3.5 h-3.5" />{label}
          </button>)}
      </div>

      {tab === "technicians" && isAdmin && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {technicians.length === 0 && <p className="text-xs text-slate-400">Belum ada akun teknisi. Tambahkan lewat menu Kelola Pengguna.</p>}
          {technicians.map((t) => <div key={t.id} className={`${cardCls} !p-5 ${!t.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-teal-700 text-white flex items-center justify-center font-bold text-sm shrink-0">{t.name.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{t.name}</div>
                    <div className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold truncate">{t.specialty || "Teknisi Umum"}</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${t.availability === "busy" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                  {!t.is_active ? "Nonaktif" : t.availability === "busy" ? "Sibuk" : "Tersedia"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                {[["Tugas aktif", t.active_tasks], ["Selesai bulan ini", t.completed_this_month], ["Rata² perbaikan", t.avg_repair_hours === null ? "-" : `${t.avg_repair_hours} j`]].map(([l, v]) => <div key={l} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{v}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">{l}</div>
                  </div>)}
              </div>
              {t.disputed_total > 0 && <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{t.disputed_total} perbaikan pernah ditolak pelapor</div>}
              <ContactButtons phone={t.phone} email={t.email} />
            </div>)}
        </div>}

      {tab === "vendors" && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.length === 0 && <p className="text-xs text-slate-400">Belum ada vendor terdaftar.</p>}
          {vendors.map((v) => <div key={v.id} className={`${cardCls} !p-5 hover:border-teal-300 dark:hover:border-teal-700 transition-colors ${!v.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-900 dark:text-white">{v.category}</div>
                  <div className="text-xs text-teal-700 dark:text-teal-400 font-semibold mt-1">{v.name}</div>
                </div>
                {!v.is_active && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 text-slate-500 border-slate-200">Nonaktif</span>}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                <span>{v.phone || "-"}{v.pic_name ? ` (${v.pic_name})` : ""}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                {v.contract_end && <span className={`px-2 py-0.5 rounded-full border font-bold ${v.contract_expired ? "bg-rose-50 text-rose-700 border-rose-200" : v.contract_expiring ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"}`}>
                    {v.contract_expired ? "Kontrak berakhir " : v.contract_expiring ? "Kontrak segera berakhir " : "Kontrak s.d. "}
                    {new Date(`${v.contract_end.slice(0, 10)}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </span>}
                {isAdmin && <span className="text-slate-400">{v.active_tasks} tugas aktif · {formatRupiah(v.total_cost)}</span>}
              </div>
              <ContactButtons phone={v.phone} email={v.email} />
              {isAdmin && <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={() => setEditing(v)} className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-teal-700 flex items-center gap-1"><Pencil className="w-3 h-3" />Edit</button>
                  <button onClick={() => toggleVendor(v)} className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-amber-600">{v.is_active ? "Nonaktifkan" : "Aktifkan"}</button>
                  <button onClick={() => removeVendor(v)} className="ml-auto text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"><Trash2 className="w-3 h-3" />Hapus</button>
                </div>}
            </div>)}
        </div>}

      <div className={`${cardCls} !p-5`}>
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 dark:text-teal-400">LAYANAN DARURAT PUBLIK</div>
        <div className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 flex items-center gap-1.5"><PhoneCall className="w-3.5 h-3.5 text-slate-400" />Damkar: 113 • PLN: 123</div>
      </div>

      {editing !== undefined && <VendorForm vendor={editing} onClose={() => setEditing(undefined)} onSaved={() => setEditing(undefined)} />}
    </div>;
};
