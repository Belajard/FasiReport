import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../services/dataService";
import { ROLE_LABEL } from "../types";
import { MessageSquare, Send } from "lucide-react";

export const ReportComments = ({ reportId }) => {
  const { showToast } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setComments(await dataService.getComments(reportId));
    } catch {
      /* diamkan, akan dicoba lagi saat sinkronisasi berikutnya */
    }
  };
  useEffect(() => {
    load();
    return dataService.subscribe(() => load());
  }, [reportId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      setBusy(true);
      setComments(await dataService.addComment(reportId, text.trim()));
      setText("");
    } catch (err) {
      showToast(err.message || "Gagal mengirim komentar.", "error");
    } finally {
      setBusy(false);
    }
  };

  return <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5" />
        Diskusi ({comments.length})
      </h4>
      {comments.length === 0 ? <p className="text-xs text-slate-400 dark:text-slate-500 italic mb-3">Belum ada komentar.</p> : <div className="space-y-2 mb-3">
          {comments.map((c) => <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {c.author.name} <span className="font-normal text-slate-400 dark:text-slate-500">({ROLE_LABEL[c.author.role]})</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                  {new Date(c.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">{c.body}</p>
            </div>)}
        </div>}
      <form onSubmit={submit} className="flex gap-2">
        <input
    type="text"
    value={text}
    onChange={(e) => setText(e.target.value)}
    maxLength={1000}
    placeholder="Tulis komentar atau pertanyaan..."
    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
  />
        <button type="submit" disabled={busy || !text.trim()} className="px-3 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg flex items-center gap-1.5 disabled:opacity-50">
          <Send className="w-3.5 h-3.5" />
          Kirim
        </button>
      </form>
    </div>;
};
