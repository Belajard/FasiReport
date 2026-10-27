import { PRIORITY_CONFIG } from "../types";
export const PriorityBadge = ({ priority, size = "md" }) => {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.low;
  const sizeClasses = size === "sm" ? "px-2.5 py-0.5 text-[11px] gap-1.5" : "px-3 py-1 text-xs gap-1.5";
  return <span
    className={`inline-flex items-center rounded-full font-bold border shadow-2xs transition-colors ${sizeClasses} ${config.bg} ${config.text} border-current/20 dark:bg-opacity-20 dark:border-current/30`}
  >
      <span className={`w-2 h-2 rounded-full shrink-0 ${config.dot} ring-2 ring-white dark:ring-slate-900 shadow-2xs`} />
      <span>Prioritas {config.label}</span>
    </span>;
};
