import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Toast } from "./components/Toast";
import { LoginPage } from "./pages/LoginPage";
import { EmployeeView } from "./pages/EmployeeView";
import { AdminView } from "./pages/AdminView";
import { TechnicianView } from "./pages/TechnicianView";
import { ProfilePage } from "./pages/ProfilePage";
const MainLayout = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [isEmployeeCreateOpen, setIsEmployeeCreateOpen] = useState(false);
  const [focusReportId, setFocusReportId] = useState(null);
  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-teal-700 dark:border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Memuat FasiReport...</p>
        </div>
      </div>;
  }
  if (!user) {
    return <>
        <LoginPage />
        <Toast />
      </>;
  }
  const isAdmin = user.role === "admin";
  const isTechnician = user.role === "technician";
  const getPageTitle = () => {
    if (currentTab === "profile") return "Profil & Kata Sandi";
    if (isAdmin) {
      if (currentTab === "facilities") return "Kelola Fasilitas";
      if (currentTab === "all-reports") return "Semua Laporan";
      if (currentTab === "maintenance-schedule") return "Kelola Jadwal Servis & Pemeliharaan";
      if (currentTab === "directory") return "Direktori Teknisi & Vendor";
      if (currentTab === "users") return "Kelola Pengguna";
      if (currentTab === "audit") return "Log Aktivitas";
      if (currentTab === "guides") return "Panduan & SOP Fasilitas";
      return "Dashboard Admin";
    }
    if (isTechnician) {
      if (currentTab === "my-tasks") return "Tugas Saya";
      if (currentTab === "task-history") return "Riwayat Perbaikan";
      if (currentTab === "maintenance-schedule") return "Jadwal Perawatan Saya";
      if (currentTab === "directory") return "Direktori Rekanan";
      if (currentTab === "guides") return "Panduan & SOP Teknisi";
      return "Dashboard Teknisi";
    }
    if (currentTab === "facilities") return "Daftar Fasilitas Perusahaan";
    if (currentTab === "my-reports") return "Laporan Saya";
    if (currentTab === "create-report") return "Buat Laporan Kerusakan";
    if (currentTab === "maintenance-schedule") return "Jadwal Servis Rutin Gedung";
    if (currentTab === "guides") return "Panduan & SOP Pelaporan";
    return "Dashboard Karyawan";
  };
  const openReportFromNotification = (id) => {
    setFocusReportId(id);
  };
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors">
      {
    /* Left Persistent Sidebar */
  }
      <Sidebar
    currentTab={currentTab}
    onSelectTab={setCurrentTab}
    onOpenCreateReport={() => {
      setCurrentTab("create-report");
    }}
  />

      {
    /* Main Viewport Content with Top Bar */
  }
      <div className="md:pl-64 flex flex-col min-h-screen">
        <TopBar
    title={getPageTitle()}
    badge="FASIREPORT"
    onOpenReport={openReportFromNotification}
  />

        <main className="flex-1 p-5 sm:p-7 lg:p-8 max-w-7xl w-full mx-auto">
          <div key={`bar-${currentTab}`} className="fr-route-bar" />
          <div key={currentTab} className="anim-page">
          {currentTab === "profile" ? <ProfilePage /> : user.role === "employee" ? <EmployeeView
    currentTab={currentTab}
    onSelectTab={setCurrentTab}
    isCreateOpen={isEmployeeCreateOpen}
    setIsCreateOpen={setIsEmployeeCreateOpen}
    focusReportId={focusReportId}
    onFocusHandled={() => setFocusReportId(null)}
  /> : isTechnician ? <TechnicianView
    currentTab={currentTab}
    onSelectTab={setCurrentTab}
    focusReportId={focusReportId}
    onFocusHandled={() => setFocusReportId(null)}
  /> : <AdminView
    currentTab={currentTab}
    onSelectTab={setCurrentTab}
    focusReportId={focusReportId}
    onFocusHandled={() => setFocusReportId(null)}
  />}
          </div>
        </main>
      </div>

      {
    /* Global Notifications */
  }
      <Toast />
    </div>;
};
// MainLayout dipasang ulang (key) setiap akun berganti atau logout, sehingga menu/halaman terakhir
// dan semua state sementara akun sebelumnya hilang; akun baru selalu mulai dari Dashboard.
const KeyedLayout = () => {
  const { user } = useAuth();
  return <MainLayout key={user?.id ?? "guest"} />;
};
export default function App() {
  return <ThemeProvider>
      <AuthProvider>
        <KeyedLayout />
      </AuthProvider>
    </ThemeProvider>;
}
