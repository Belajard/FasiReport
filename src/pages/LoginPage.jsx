import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Wrench, User } from "lucide-react";
export const LoginPage = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const handleRoleChange = (role) => {
    setSelectedRole(role);
    if (role !== "employee") setIsRegister(false);
    setErrorMsg(null);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg("Harap isi alamat email dan kata sandi.");
      return;
    }
    try {
      setIsLoading(true);
      if (isRegister) {
        if (name.trim().length < 2) throw new Error("Nama lengkap minimal 2 karakter.");
        if (password.length < 8) throw new Error("Kata sandi minimal 8 karakter.");
        if (password !== confirmPassword) throw new Error("Konfirmasi kata sandi tidak sama.");
        await register(name, email, password);
      } else {
        await login(email, password, selectedRole);
      }
    } catch (err) {
      setErrorMsg(err.message || "Gagal masuk. Periksa kembali email dan kata sandi Anda.");
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="relative overflow-hidden min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 transition-colors">
      <div className="fr-blob w-72 h-72 bg-teal-300 -top-16 -left-16" />
      <div className="fr-blob w-80 h-80 bg-amber-200 -bottom-20 -right-10" style={{ animationDelay: "-5s" }} />
      <div className="fr-blob w-56 h-56 bg-sky-200 top-1/3 right-1/4" style={{ animationDelay: "-9s" }} />
      <div className="relative z-10 w-full max-w-md anim-enter">
        
        {
    /* Brand Header */
  }
        <div className="text-center mb-8">
          <div className="fr-float inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 shadow-xs mb-3">
            <svg
    className="w-8 h-8"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <path d="M7 8h10" />
              <path d="M7 12h7" />
              <path d="M7 16h4" />
              <circle cx="16" cy="15" r="2.5" />
              <path d="m18 17 2 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-teal-800 dark:text-teal-400">
            FasiReport
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wide mt-0.5">
            Aplikasi Pelaporan Kerusakan Fasilitas & Pemeliharaan
          </p>
        </div>

        {
    /* Login Card */
  }
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-slate-950/40 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 transition-colors">
          
          {
    /* Role Selector Tabs */
  }
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-6">
            <button
    type="button"
    onClick={() => handleRoleChange("employee")}
    className={`flex-1 min-w-0 py-2.5 px-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center justify-center gap-1.5 ${selectedRole === "employee" ? "bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-400 shadow-xs" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
  >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Karyawan</span>
            </button>
            <button
    type="button"
    onClick={() => handleRoleChange("admin")}
    className={`flex-1 min-w-0 py-2.5 px-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center justify-center gap-1.5 ${selectedRole === "admin" ? "bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-400 shadow-xs" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
  >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
            <button
    type="button"
    onClick={() => handleRoleChange("technician")}
    className={`flex-1 min-w-0 py-2.5 px-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center justify-center gap-1.5 ${selectedRole === "technician" ? "bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-400 shadow-xs" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
  >
              <Wrench className="w-3.5 h-3.5" />
              <span>Teknisi</span>
            </button>
          </div>

          <div key={selectedRole + isRegister} className="mb-5 text-center anim-enter">
            <h2 className="text-base font-extrabold text-slate-800 dark:text-white">
              {isRegister ? "Daftar Akun Karyawan" : selectedRole === "admin" ? "Login Administrator" : selectedRole === "technician" ? "Login Teknisi" : "Login Karyawan"}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {isRegister ? "Buat akun karyawan untuk mulai melaporkan kerusakan fasilitas." : selectedRole === "admin" ? "Gunakan akun administrator untuk memantau fasilitas dan tiket aduan." : selectedRole === "technician" ? "Masuk dengan akun teknisi untuk menerima tugas dan memperbarui hasil perbaikan." : "Masuk dengan akun karyawan untuk membuat dan memantau aduan Anda."}
            </p>
          </div>

          {errorMsg && <div key={errorMsg} className="anim-shake mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 mt-1" />
              <span>{errorMsg}</span>
            </div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama sesuai identitas karyawan"
                  className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedRole === "admin" ? "admin.test@example.com" : selectedRole === "technician" ? "teknisi.test@example.com" : "karyawan.test@example.com"}
                  className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="Masukkan kata sandi..."
    className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
    required
  />
              </div>
            </div>

            {isRegister && <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Konfirmasi Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi..."
                  className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>}

            <button
    type="submit"
    disabled={isLoading}
    className="w-full py-3 px-4 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-md shadow-teal-900/10 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 mt-2"
  >
              <span>{isLoading ? "Memproses..." : isRegister ? "Daftar Sekarang" : "Masuk ke Sistem"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {selectedRole === "employee" && <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-5">
            {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setErrorMsg(null); }}
              className="font-bold text-teal-700 dark:text-teal-400 hover:underline"
            >
              {isRegister ? "Masuk di sini" : "Daftar di sini"}
            </button>
          </p>}

        </div>

        {
    /* Footer info */
  }
        <div className="text-center mt-6 text-xs text-slate-400 dark:text-slate-500">
          FasiReport © {(/* @__PURE__ */ new Date()).getFullYear()} — Dilindungi hak cipta
        </div>

      </div>
    </div>;
};
