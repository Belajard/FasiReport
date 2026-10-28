import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../services/dataService";
import { X, Building2, AlertCircle } from "lucide-react";
export const FacilityModal = ({
  isOpen,
  onClose,
  onSuccess,
  facilityToEdit
}) => {
  const { user, showToast } = useAuth();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("active");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  useEffect(() => {
    if (isOpen) {
      if (facilityToEdit) {
        setName(facilityToEdit.name);
        setLocation(facilityToEdit.location);
        setCategory(facilityToEdit.category);
        setStatus(facilityToEdit.status);
      } else {
        setName("");
        setLocation("");
        setCategory("");
        setStatus("active");
      }
      setErrorMsg(null);
    }
  }, [isOpen, facilityToEdit?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!isOpen || !user) return null;
  const isEditing = !!facilityToEdit;
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim() || !location.trim() || !category.trim()) {
      setErrorMsg("Semua kolom data fasilitas wajib diisi.");
      return;
    }
    try {
      setIsSubmitting(true);
      if (isEditing) {
        await dataService.updateFacility(
          facilityToEdit.id,
          {
            name: name.trim(),
            location: location.trim(),
            category: category.trim(),
            status
          }
        );
        showToast(`Fasilitas '${name}' berhasil diperbarui.`, "success");
      } else {
        await dataService.createFacility(
          {
            name: name.trim(),
            location: location.trim(),
            category: category.trim(),
            status
          }
        );
        showToast(`Fasilitas baru '${name}' berhasil ditambahkan.`, "success");
      }
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Gagal menyimpan fasilitas.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className="anim-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95 transition-colors">
        
        {
    /* Header */
  }
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center border border-teal-200 dark:border-teal-800/80">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEditing ? "Edit Fasilitas" : "Tambah Fasilitas Perusahaan"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Kelola inventaris fasilitas kerja.</p>
            </div>
          </div>
          <button
    onClick={onClose}
    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
  >
            <X className="w-5 h-5" />
          </button>
        </div>

        {
    /* Form */
  }
        <form onSubmit={handleSubmit} className="p-7 space-y-5">
          {errorMsg && <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>}

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Nama Fasilitas <span className="text-rose-500">*</span>
            </label>
            <input
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="Contoh: AC Ruang Produksi"
    className="w-full px-4 py-3 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
    required
  />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Lokasi Fasilitas <span className="text-rose-500">*</span>
            </label>
            <input
    type="text"
    value={location}
    onChange={(e) => setLocation(e.target.value)}
    placeholder="Contoh: Gedung A Lantai 1"
    className="w-full px-4 py-3 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
    required
  />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Kategori <span className="text-rose-500">*</span>
            </label>
            <input
    type="text"
    value={category}
    onChange={(e) => setCategory(e.target.value)}
    placeholder="Contoh: Pendingin, Penerangan, Elektronik"
    className="w-full px-4 py-3 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
    required
  />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Status Operasional <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <button
    type="button"
    onClick={() => setStatus("active")}
    className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${status === "active" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-200 dark:ring-emerald-800" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
  >
                Aktif (Bisa Dilaporkan)
              </button>
              <button
    type="button"
    onClick={() => setStatus("inactive")}
    className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${status === "inactive" ? "border-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 ring-2 ring-slate-300 dark:ring-slate-700" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
  >
                Nonaktif (Ditutup)
              </button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Fasilitas nonaktif tidak akan muncul di daftar pilihan pelaporan karyawan.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
    type="button"
    onClick={onClose}
    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
  >
              Batal
            </button>
            <button
    type="submit"
    disabled={isSubmitting}
    className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition-all disabled:opacity-50"
  >
              {isSubmitting ? "Menyimpan..." : isEditing ? "Perbarui Fasilitas" : "Simpan Fasilitas"}
            </button>
          </div>
        </form>
      </div>
    </div>;
};
