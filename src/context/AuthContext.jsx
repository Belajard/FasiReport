import { createContext, useContext, useState, useEffect } from "react";
import { dataService } from "../services/dataService";
const AuthContext = createContext(void 0);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  useEffect(() => {
    let cancelled = false;
    dataService.onUnauthorized = (msg) => {
      dataService.clearSession();
      setUser(null);
      setToken(null);
      showToast(msg || "Sesi berakhir. Silakan login kembali.", "error");
    };
    (async () => {
      try {
        const restored = await dataService.restoreSession();
        if (!cancelled && restored) {
          setUser(restored);
          setToken(dataService.getToken());
        }
      } catch (err) {
        console.warn("Gagal memulihkan sesi:", err);
        if (!cancelled) showToast(err.message, "error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => prev?.message === message ? null : prev);
    }, 4e3);
  };
  const login = async (email, password, role) => {
    try {
      const res = await dataService.login(email, password, role);
      setUser(res.user);
      setToken(res.token);
      showToast(`Selamat datang kembali, ${res.user.name}!`, "success");
    } catch (err) {
      showToast(err.message || "Gagal masuk", "error");
      throw err;
    }
  };
  const register = async (name, email, password) => {
    try {
      const res = await dataService.register(name, email, password);
      setUser(res.user);
      setToken(res.token);
      showToast(`Akun berhasil dibuat. Selamat datang, ${res.user.name}!`, "success");
    } catch (err) {
      showToast(err.message || "Gagal mendaftar", "error");
      throw err;
    }
  };
  const refreshUser = () => setUser(dataService.getCurrentUser());
  const logout = () => {
    dataService.logout();
    setUser(null);
    setToken(null);
    showToast("Anda telah berhasil keluar dari sistem.", "info");
  };
  return <AuthContext.Provider
    value={{
      user,
      token,
      isLoading,
      toast,
      showToast,
      login,
      register,
      refreshUser,
      logout
    }}
  >
      {children}
    </AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
