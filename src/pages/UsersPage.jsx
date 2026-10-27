import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../services/dataService";
import { ROLE_LABEL } from "../types";
import { Plus, Pencil, Trash2, Search, KeyRound } from "lucide-react";
import { SectionHeader, ModalShell, inputCls, labelCls, primaryBtn, ghostBtn } from "../components/ui";
import { Pagination, paginate } from "../components/Pagination";

const ROLE_STYLE = {
  admin: "bg-teal-50 text-teal-700 border-teal-200",
  technician: "bg-sky-50 text-sky-700 border-sky-200",
  employee: "bg-slate-100 text-slate-700 border-slate-200"
};

const UserForm = ({ target, onClose, onSaved }) => {
  const { showToast } = useAuth();
  const [form, setForm] = useState({
    name: target?.name || "", email: target?.email || "", role: target?.role || "employee",
    phone: target?.phone || "", specialty: target?.specialty || "", password: ""
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setBusy(true);
      const payload = { name: form.name, email: form.email, role: form.role, phone: form.phone || null, specialty: form.role === "technician" ? form.specialty || null : null };
      if (target) {
        if (form.password) payload.password = form.password;
        await dataService.updateUser(target.id, payload);
      } else {
        await dataService.createUser({ ...payload, password: form.password });
      }
      showToast(`Pengguna '${form.name}' berhasil disimpan.`, "success");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return <ModalShell title={target ? "Edit Pengguna" : "Tambah Pengguna"} subtitle="Kelola akun karyawan, admin, dan teknisi" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 text-xs">
        {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-800 dark:text-rose-300">{error}</div>}
        <div><label className={labelCls}>Nama Lengkap *</label><input className={inputCls} value={form.name} onChange={set("name")} required /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Email *</label><input type="email" className={inputCls} value={form.email} onChange={set("email")} required /></div>
          <div><label className={labelCls}>Peran *</label>
            <select className={inputCls} value={form.role} onChange={set("role")}>
              <option value="employee">Karyawan</option>
              <option value="technician">Teknisi</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div><label className={labelCls}>Telepon</label><input className={inputCls} value={form.phone} onChange={set("phone")} placeholder="0812-xxxx-xxxx" /></div>
          {form.role === "technician" && <div><label className={labelCls}>Keahlian</label><input className={inputCls} value={form.specialty} onChange={set("specialty")} placeholder="Contoh: Kelistrikan & Plumbing" /></div>}
        </div>
        <div>
          <label className={labelCls}>{target ? "Reset Kata Sandi (kosongkan jika tidak diubah)" : "Kata Sandi Awal *"}</label>
          <input type="password" className={inputCls} value={form.password} onChange={set("password")} minLength={form.password || !target ? 8 : undefined} required={!target} placeholder="Minimal 8 karakter" />
        </div>
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Batal</button>
          <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Menyimpan..." : "Simpan"}</button>
        </div>
      </form>
    </ModalShell>;
};

export const UsersPage = () => {
  const { user, showToast } = useAuth();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(undefined);

  const load = async () => {
    try {
      setUsers(await dataService.getUsers());
    } catch (err) {
      showToast(err.message, "error");
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => setPage(1), [q, roleFilter]);

  const filtered = users.filter((u) => (roleFilter === "all" || u.role === roleFilter) && `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  const toggleActive = async (u) => {
    try {
      await dataService.updateUser(u.id, { is_active: !u.is_active });
      showToast(`Akun ${u.name} ${u.is_active ? "dinonaktifkan" : "diaktifkan"}.`, "success");
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };
  const remove = async (u) => {
    if (!window.confirm(`Hapus pengguna '${u.name}' secara permanen?`)) return;
    try {
      await dataService.deleteUser(u.id);
      showToast("Pengguna dihapus.", "success");
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return <div className="space-y-4">
      <SectionHeader
    eyebrow="MANAJEMEN AKUN"
    title="Kelola Pengguna"
    subtitle="Tambah akun teknisi/admin, ubah peran, reset kata sandi, dan nonaktifkan akun."
    action={<button onClick={() => setEditing(null)} className={primaryBtn}><Plus className="w-3.5 h-3.5" />Tambah Pengguna</button>}
  />
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-slate-200 dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau email..." className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200">
            <option value="all">Semua Peran</option>
            <option value="employee">Karyawan</option>
            <option value="technician">Teknisi</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <tr><th className="py-3 px-4">Pengguna</th><th className="py-3 px-4">Peran</th><th className="py-3 px-4">Telepon</th><th className="py-3 px-4">Status</th><th className="py-3 px-4 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginate(filtered, page).map((u) => <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                  <td className="py-3 px-4"><div className="font-bold text-slate-900 dark:text-white">{u.name}</div><div className="text-[11px] text-slate-400 font-mono">{u.email}</div></td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${ROLE_STYLE[u.role]}`}>{ROLE_LABEL[u.role]}</span>{u.specialty && <div className="text-[11px] text-slate-400 mt-0.5">{u.specialty}</div>}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{u.phone || "-"}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${u.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>{u.is_active ? "Aktif" : "Nonaktif"}</span></td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setEditing(u)} className={`${ghostBtn} !py-1.5 !px-2.5`} title="Edit / reset kata sandi"><Pencil className="w-3 h-3" /><KeyRound className="w-3 h-3" /></button>
                      {u.id !== user.id && <>
                          <button onClick={() => toggleActive(u)} className={`${ghostBtn} !py-1.5 !px-2.5`}>{u.is_active ? "Nonaktifkan" : "Aktifkan"}</button>
                          <button onClick={() => remove(u)} className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>}
                    </div>
                  </td>
                </tr>)}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-8 text-center text-xs text-slate-400">Tidak ada pengguna ditemukan.</p>}
        </div>
        <Pagination page={page} total={filtered.length} onChange={setPage} />
      </div>
      {editing !== undefined && <UserForm target={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />}
    </div>;
};
