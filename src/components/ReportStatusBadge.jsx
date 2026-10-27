import { STATUS_CONFIG } from "../types";
export const ReportStatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.reported;
  return <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${config.bg} ${config.text} ${config.border} dark:bg-opacity-20 dark:border-current/30`}
  >
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      <span>{config.label}</span>
    </span>;
};
