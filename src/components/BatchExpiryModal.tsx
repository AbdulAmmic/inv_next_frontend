"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { X, CalendarClock, Plus, Trash2, Loader2, Save, WifiOff } from "lucide-react";
import { api } from "@/apiCalls";

type Batch = {
  id: string;
  batch_number: string | null;
  expiry_date: string | null;
  manufacture_date: string | null;
  quantity: number;
  cost_price: number;
  is_expired: boolean;
};

type Draft = { batch_number: string; expiry_date: string; quantity: string };

interface Props {
  stockId: string;
  productName: string;
  currentStock?: number;
  canEdit?: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

const toDraft = (b: Batch): Draft => ({
  batch_number: b.batch_number || "",
  expiry_date: b.expiry_date || "",
  quantity: String(b.quantity ?? 0),
});

function expiryBadge(date: string | null) {
  if (!date) return { text: "No expiry", cls: "bg-slate-100 text-slate-500" };
  const days = Math.ceil((new Date(date + "T00:00:00").getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: `Expired ${-days}d ago`, cls: "bg-rose-50 text-rose-600" };
  if (days <= 30) return { text: `${days}d left`, cls: "bg-amber-50 text-amber-700" };
  return { text: `${days}d left`, cls: "bg-emerald-50 text-emerald-700" };
}

export default function BatchExpiryModal({ stockId, productName, currentStock, canEdit = true, onClose, onChanged }: Props) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newBatch, setNewBatch] = useState<Draft>({ batch_number: "", expiry_date: "", quantity: String(Math.floor(currentStock ?? 0)) });
  const [offline, setOffline] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/stocks/${stockId}/batches`);
      const list: Batch[] = res.data || [];
      setBatches(list);
      setDrafts(Object.fromEntries(list.map((b) => [b.id, toDraft(b)])));
      setOffline(false);
      if (!list.length) setAdding(true);
    } catch (e: any) {
      if (!e?.response) setOffline(true);
      else toast.error("Couldn't load batches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockId]);

  const dirty = (b: Batch) => {
    const d = drafts[b.id];
    return d && (d.batch_number !== (b.batch_number || "") || d.expiry_date !== (b.expiry_date || "") || d.quantity !== String(b.quantity ?? 0));
  };

  const save = async (b: Batch) => {
    const d = drafts[b.id];
    setSavingId(b.id);
    try {
      await api.put(`/batches/${b.id}`, {
        batch_number: d.batch_number,
        expiry_date: d.expiry_date || null,
        quantity: d.quantity === "" ? 0 : Number(d.quantity),
      });
      toast.success("Batch updated");
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.replace(/_/g, " ") || "Couldn't save");
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (b: Batch) => {
    if (!confirm(`Delete batch ${b.batch_number || ""} (expiry ${b.expiry_date || "none"})?`)) return;
    setSavingId(b.id);
    try {
      await api.delete(`/batches/${b.id}`);
      toast.success("Batch removed");
      await load();
      onChanged?.();
    } catch {
      toast.error("Couldn't delete batch");
    } finally {
      setSavingId(null);
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatch.expiry_date) {
      toast.error("Pick an expiry date");
      return;
    }
    setSavingId("new");
    try {
      await api.post(`/stocks/${stockId}/batches`, {
        batch_number: newBatch.batch_number,
        expiry_date: newBatch.expiry_date,
        quantity: newBatch.quantity === "" ? undefined : Number(newBatch.quantity),
      });
      toast.success("Expiry date added");
      setAdding(false);
      setNewBatch({ batch_number: "", expiry_date: "", quantity: "0" });
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.replace(/_/g, " ") || "Couldn't add batch");
    } finally {
      setSavingId(null);
    }
  };

  const input = "w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-sm bg-white disabled:bg-slate-50";

  return (
    <div className="modal-overlay fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[3px]">
      <div className="bg-white w-full max-w-2xl max-h-[88vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 truncate">Expiry &amp; batches</h2>
              <p className="text-xs text-slate-500 truncate">
                {productName}
                {currentStock !== undefined && <> · {Number(currentStock).toLocaleString()} in stock</>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 text-amber-500 animate-spin" /></div>
          ) : offline ? (
            <div className="py-10 text-center text-sm text-slate-500">
              <WifiOff className="w-6 h-6 mx-auto mb-2 text-slate-400" />
              Expiry dates are managed online. Connect to the internet and try again.
            </div>
          ) : (
            <>
              {batches.length > 0 && (
                <div className="hidden sm:grid grid-cols-[1fr_1fr_90px_auto] gap-2 px-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  <span>Expiry date</span><span>Batch no.</span><span>Qty</span><span className="w-[120px]" />
                </div>
              )}
              {batches.map((b) => {
                const d = drafts[b.id] || toDraft(b);
                const badge = expiryBadge(d.expiry_date || null);
                const set = (patch: Partial<Draft>) => setDrafts((prev) => ({ ...prev, [b.id]: { ...d, ...patch } }));
                return (
                  <div key={b.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_90px_auto] gap-2 items-center p-2 rounded-lg border border-slate-100 hover:border-slate-200">
                    <div className="space-y-1">
                      <input type="date" value={d.expiry_date} disabled={!canEdit} onChange={(e) => set({ expiry_date: e.target.value })} className={input} />
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${badge.cls}`}>{badge.text}</span>
                    </div>
                    <input value={d.batch_number} placeholder="—" disabled={!canEdit} onChange={(e) => set({ batch_number: e.target.value })} className={`${input} self-start`} />
                    <input type="number" min={0} value={d.quantity} disabled={!canEdit} onChange={(e) => set({ quantity: e.target.value })} className={`${input} self-start tabular-nums`} />
                    {canEdit && (
                      <div className="flex items-center gap-1 self-start w-[120px] justify-end">
                        <button
                          onClick={() => save(b)}
                          disabled={!dirty(b) || savingId === b.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold disabled:opacity-40"
                        >
                          {savingId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Save
                        </button>
                        <button
                          onClick={() => remove(b)}
                          disabled={savingId === b.id}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          aria-label="Delete batch"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {!batches.length && !adding && (
                <p className="py-6 text-center text-sm text-slate-500">No expiry dates recorded for this product yet.</p>
              )}

              {canEdit && adding && (
                <form onSubmit={create} className="p-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/40 space-y-2">
                  <p className="text-xs font-semibold text-amber-800">New expiry date / batch</p>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_90px] gap-2">
                    <input type="date" required value={newBatch.expiry_date} onChange={(e) => setNewBatch({ ...newBatch, expiry_date: e.target.value })} className={input} autoFocus />
                    <input value={newBatch.batch_number} placeholder="Batch no. (optional)" onChange={(e) => setNewBatch({ ...newBatch, batch_number: e.target.value })} className={input} />
                    <input type="number" min={0} value={newBatch.quantity} title="Units in this batch" onChange={(e) => setNewBatch({ ...newBatch, quantity: e.target.value })} className={`${input} tabular-nums`} />
                  </div>
                  <div className="flex justify-end gap-2">
                    {batches.length > 0 && (
                      <button type="button" onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-white">Cancel</button>
                    )}
                    <button type="submit" disabled={savingId === "new"} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold disabled:opacity-50">
                      {savingId === "new" && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[11px] text-slate-400">The soonest expiry on a batch with stock drives the alerts.</p>
          <div className="flex gap-2">
            {canEdit && !adding && !offline && !loading && (
              <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Plus className="w-4 h-4" /> Add batch
              </button>
            )}
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold">Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
