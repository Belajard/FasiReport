import { useAuth } from "../context/AuthContext";
import { CheckCircle, AlertCircle, Info } from "lucide-react";
export const Toast = () => {
  const { toast } = useAuth();
  if (!toast) return null;
  const isSuccess = toast.type === "success";
  const isError = toast.type === "error";
  return <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div
    className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium max-w-md ${isSuccess ? "bg-slate-900 text-white border-slate-800" : isError ? "bg-rose-900 text-white border-rose-800" : "bg-slate-800 text-white border-slate-700"}`}
  >
        {isSuccess ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : isError ? <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" /> : <Info className="w-4 h-4 text-sky-400 shrink-0" />}
        <span className="leading-snug">{toast.message}</span>
      </div>
    </div>;
};
