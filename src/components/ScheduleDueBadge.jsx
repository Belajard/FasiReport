/** Penanda jatuh tempo jadwal servis: lewat jadwal, hari ini, atau H-n (maks. 3 hari). */
export const ScheduleDueBadge = ({ item }) => {
  if (!item || item.status === "done") return null;
  let text = null;
  let cls = "bg-amber-50 text-amber-700 border-amber-200";
  if (item.is_overdue) {
    text = "Lewat jadwal";
    cls = "bg-rose-50 text-rose-700 border-rose-200";
  } else if (item.days_left === 0) {
    text = "Hari ini";
  } else if (item.days_left > 0 && item.days_left <= 3) {
    text = `H-${item.days_left}`;
  }
  if (!text) return null;
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>{text}</span>;
};
