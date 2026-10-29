import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  FileText,
  LayoutGrid,
  PlusCircle,
  LogOut,
  Menu,
  X,
  Sliders,
  CalendarDays,
  BookOpenCheck,
  Users,
  Contact,
  ScrollText,
  ClipboardList,
  History,
  UserCog
} from "lucide-react";
export const Sidebar = ({
  currentTab,
  onSelectTab,
  onOpenCreateReport
}) => {
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  if (!user) return null;
  const isAdmin = user.role === "admin";
  const isTechnician = user.role === "technician";
  const handleNavClick = (tab) => {
    onSelectTab(tab);
    setIsMobileOpen(false);
  };
  const handleLogout = () => {
    setIsMobileOpen(false);
    logout();
  };
  const navButton = (tab, icon, label, before) => <button
    key={tab}
    onClick={() => {
      if (before) before();
      handleNavClick(tab);
    }}
    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${currentTab === tab ? "bg-teal-700 text-white shadow-xs [&_svg]:text-white" : "text-slate-600 dark:text-slate-300 hover:bg-teal-50/60 dark:hover:bg-slate-800/80 hover:text-teal-800 dark:hover:text-teal-300"}`}
  >
      {icon}
      <span>{label}</span>
    </button>;
  const sectionLabel = (text) => <div className="pt-2 pb-1">
      <div className="px-3 pb-1.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        {text}
      </div>
    </div>;
  const navContent = <div className="flex flex-col h-full min-h-0 bg-white dark:bg-slate-900 transition-colors">
      <div className="flex-1 min-h-0 overflow-y-auto fr-scroll pb-3">
        {
    /* Brand Logo with improved rich emerald/teal tone */
  }
        <div className="px-6 py-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/60 dark:to-emerald-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 flex items-center justify-center shadow-xs">
              <svg
    className="w-6 h-6"
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
            <div>
              <div className="text-base font-extrabold tracking-tight text-teal-800 dark:text-teal-400">
                FasiReport
              </div>
              <div className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-tight">
                Aplikasi Pelaporan Kerusakan Fasilitas
              </div>
            </div>
          </div>

          <button
    onClick={() => setIsMobileOpen(false)}
    className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 rounded-lg"
  >
            <X className="w-5 h-5" />
          </button>
        </div>

        {
    /* Navigation items */
  }
        <div className="px-3.5 space-y-1 mt-4">
          <div className="px-3 pb-1.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Menu Utama
          </div>

          {isAdmin && <>
              {navButton("dashboard", <LayoutDashboard className="w-4 h-4" />, "Dashboard Admin")}
              {navButton("all-reports", <FileText className="w-4 h-4" />, "Semua Laporan")}
              {navButton("facilities", <Sliders className="w-4 h-4" />, "Kelola Fasilitas")}
              {sectionLabel("Manajemen & SOP")}
              {navButton("maintenance-schedule", <CalendarDays className="w-4 h-4 text-teal-600 dark:text-teal-400" />, "Jadwal Servis Rutin")}
              {navButton("directory", <Contact className="w-4 h-4 text-teal-600 dark:text-teal-400" />, "Direktori Rekanan")}
              {navButton("users", <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />, "Kelola Pengguna")}
              {navButton("audit", <ScrollText className="w-4 h-4 text-teal-600 dark:text-teal-400" />, "Log Aktivitas")}
              {navButton("guides", <BookOpenCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />, "Panduan & SOP")}
            </>}

          {isTechnician && <>
              {navButton("dashboard", <LayoutDashboard className="w-4 h-4" />, "Dashboard Teknisi")}
              {navButton("my-tasks", <ClipboardList className="w-4 h-4" />, "Tugas Saya")}
              {navButton("task-history", <History className="w-4 h-4" />, "Riwayat Perbaikan")}
              {sectionLabel("Informasi & Layanan")}
              {navButton("maintenance-schedule", <CalendarDays className="w-4 h-4 text-teal-600 dark:text-teal-400" />, "Jadwal Perawatan Saya")}
              {navButton("directory", <Contact className="w-4 h-4 text-teal-600 dark:text-teal-400" />, "Direktori Rekanan")}
              {navButton("guides", <BookOpenCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />, "Panduan & SOP")}
            </>}

          {user.role === "employee" && <>
              {navButton("dashboard", <LayoutDashboard className="w-4 h-4" />, "Dashboard")}
              {navButton("my-reports", <FileText className="w-4 h-4" />, "Laporan Saya")}
              {navButton("create-report", <PlusCircle className="w-4 h-4 text-teal-600 dark:text-teal-400" />, "Buat Laporan", () => {
                if (onOpenCreateReport) onOpenCreateReport();
              })}
              {navButton("facilities", <LayoutGrid className="w-4 h-4" />, "Daftar Fasilitas")}
              {sectionLabel("Informasi & Layanan")}
              {navButton("maintenance-schedule", <CalendarDays className="w-4 h-4 text-teal-600 dark:text-teal-400" />, "Jadwal Servis Rutin")}
              {navButton("guides", <BookOpenCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />, "Panduan & SOP")}
            </>}

          {sectionLabel("Akun")}
          {navButton("profile", <UserCog className="w-4 h-4 text-teal-600 dark:text-teal-400" />, "Profil & Kata Sandi")}
        </div>
      </div>

      {
    /* Logout at bottom */
  }
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
        <button
    onClick={handleLogout}
    className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/80 dark:hover:bg-rose-950/30 transition-colors w-full px-3 py-2.5 rounded-xl"
  >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>;
  return <>
      {
    /* Mobile Top bar */
  }
      <div className="md:hidden sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg border border-teal-600 dark:border-teal-500 text-teal-700 dark:text-teal-400 flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-teal-800 dark:text-teal-400">FasiReport</span>
        </div>

        <button
    onClick={() => setIsMobileOpen(true)}
    className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
  >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {
    /* Mobile Backdrop */
  }
      {isMobileOpen && <div
    className="anim-overlay md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs"
    onClick={() => setIsMobileOpen(false)}
  />}

      {
    /* Mobile Drawer */
  }
      <div className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 transform ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {navContent}
      </div>

      {
    /* Desktop Persistent Sidebar */
  }
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 z-20 transition-colors">
        {navContent}
      </aside>
    </>;
};
