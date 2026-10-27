import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../services/dataService";
import { ROLE_LABEL } from "../types";
import { KeyRound, UserCog } from "lucide-react";
import { SectionHeader, inputCls, labelCls, primaryBtn, cardCls } from "../components/ui";

export const ProfilePage = () => {
  const { user, showToast, refreshUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");
  const [busyProfile, setBusyProfile] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busyPw, setBusyPw] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      setBusyProfile(true);
      await dataService.updateProfile({ name, phone: phone || null });
      refreshUser();
      showToast("Profil berhasil diperbarui.", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusyProfile(false);
    }
  };
  const savePassword = async (e) => {
    e.preventDefault();
    if (next.length < 8) return showToast("Kata sandi baru minimal 8 karakter.", "error");
    if (next !== confirm) return showToast("Konfirmasi kata sandi tidak sama.", "error");
    try {
      setBusyPw(true);
      await dataService.changePassword(current, next);
      showToast("Kata sandi berhasil diganti.", "success");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusyPw(false);
    }
  };

  return <div className="space-y-6 max-w-3xl">
      <SectionHeader eyebrow="AKUN SAYA" title="Profil & Kata Sandi" subtitle={`${user.email} · ${ROLE_LABEL[user.role]}`} />
      <form onSubmit={saveProfile} className={`${cardCls} space-y-4 text-xs`}>
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><UserCog className="w-4 h-4 text-teal-600" />Data Profil</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Nama Lengkap</label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></div>
          <div><label className={labelCls}>Telepon</label><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812-xxxx-xxxx" /></div>
        </div>
        <div className="flex justify-end"><button className={primaryBtn} disabled={busyProfile}>{busyProfile ? "Menyimpan..." : "Simpan Profil"}</button></div>
      </form>
      <form onSubmit={savePassword} className={`${cardCls} space-y-4 text-xs`}>
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><KeyRound className="w-4 h-4 text-teal-600" />Ganti Kata Sandi</h3>
        <div><label className={labelCls}>Kata Sandi Saat Ini</label><input type="password" className={inputCls} value={current} onChange={(e) => setCurrent(e.target.value)} required /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Kata Sandi Baru</label><input type="password" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} /></div>
          <div><label className={labelCls}>Konfirmasi Kata Sandi Baru</label><input type="password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
        </div>
        <div className="flex justify-end"><button className={primaryBtn} disabled={busyPw}>{busyPw ? "Menyimpan..." : "Ganti Kata Sandi"}</button></div>
      </form>
    </div>;
};
