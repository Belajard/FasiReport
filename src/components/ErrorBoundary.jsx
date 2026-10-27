import { Component } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
export class ErrorBoundary extends Component {
  state = {
    hasError: false,
    error: null,
    errorInfo: null
  };
  static getDerivedStateFromError(error) {
    return { hasError: true, error, errorInfo: null };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error in FasiReport:", error, errorInfo);
    this.setState({ errorInfo });
  }
  handleReset = () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.clear();
        localStorage.clear();
      }
    } catch (e) {
      console.warn("Failed to clear storage:", e);
    }
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-slate-900 dark:text-white">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Terjadi Kendala Memuat Aplikasi
            </h2>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Browser mendeteksi kendala pada cache lokal atau komponen antarmuka. Anda dapat memuat ulang aplikasi atau menyetel ulang penyimpanan lokal.
            </p>

            {this.state.error && <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-left">
                <p className="text-[11px] font-mono font-bold text-rose-800 dark:text-rose-300 break-words">
                  {this.state.error.toString()}
                </p>
              </div>}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
        onClick={() => window.location.reload()}
        className="flex-1 py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
      >
                <RotateCcw className="w-4 h-4" />
                <span>Muat Ulang Halaman</span>
              </button>
              <button
        onClick={this.handleReset}
        className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-200 dark:border-slate-700"
      >
                <Home className="w-4 h-4" />
                <span>Reset Cache & Data</span>
              </button>
            </div>
          </div>
        </div>;
    }
    return this.props.children;
  }
}
