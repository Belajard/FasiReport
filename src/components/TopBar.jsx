import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { ROLE_LABEL } from "../types";
export const TopBar = ({ title, badge = "FASIREPORT", onOpenReport }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  if (!user) return null;
  const initial = user.name.charAt(0).toUpperCase();
  return <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-5 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-10 transition-colors">
      {
    /* Left side title */
  }
      <div>
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 dark:text-teal-400">
          {badge}
        </div>
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          {title}
        </h2>
      </div>

      {
    /* Right side: Dark Mode Toggle & User Profile */
  }
      <div className="flex items-center gap-3">
        <NotificationBell onOpenReport={onOpenReport} />

        {
    /* Dark Theme Toggle Button */
  }
        <button
    onClick={toggleTheme}
    aria-label={theme === "dark" ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
    className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-amber-300 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 transition-all border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shadow-2xs"
    title={theme === "dark" ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
  >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" /> : <Moon className="w-4 h-4 text-slate-600 transition-transform hover:-rotate-12" />}
        </button>

        <span className="w-px h-6 bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {
    /* User Profile Card */
  }
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-600 to-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-xs border border-teal-500/30">
            {initial}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {user.name}
            </div>
            <div className="text-[10px] font-medium text-slate-400 dark:text-slate-400 capitalize">
              {user.role === "admin" ? "Administrator" : ROLE_LABEL[user.role]}
            </div>
          </div>
        </div>
      </div>
    </header>;
};
