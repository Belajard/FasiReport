export const STATUS_CONFIG = {
  reported: {
    label: "Dilaporkan",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    step: 1,
    description: "Laporan telah diterima sistem dan menunggu ditinjau admin."
  },
  assigned: {
    label: "Ditugaskan",
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    step: 2,
    description: "Laporan telah diverifikasi admin dan ditugaskan kepada teknisi atau vendor."
  },
  processing: {
    label: "Diproses",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    step: 3,
    description: "Teknisi sedang mengerjakan perbaikan fasilitas."
  },
  repaired: {
    label: "Diperbaiki",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    step: 4,
    description: "Perbaikan selesai dikerjakan teknisi dan menunggu konfirmasi pelapor."
  },
  completed: {
    label: "Selesai",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    step: 5,
    description: "Pelapor telah mengonfirmasi perbaikan dan laporan resmi ditutup."
  },
  rejected: {
    label: "Ditolak",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    step: 0,
    description: "Laporan tidak dapat ditindaklanjuti setelah diverifikasi admin."
  }
};
export const ROLE_LABEL = {
  employee: "Karyawan",
  admin: "Admin",
  technician: "Teknisi"
};
export const PRIORITY_CONFIG = {
  low: {
    label: "Rendah",
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-400"
  },
  medium: {
    label: "Sedang",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500"
  },
  high: {
    label: "Tinggi",
    bg: "bg-rose-50",
    text: "text-rose-700",
    dot: "bg-rose-600"
  }
};
