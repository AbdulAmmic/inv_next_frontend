"use client";

// Header sync pill: the one place sync state is shown (online/offline,
// syncing, pending, failed, synced). Clicking it pushes now; when changes
// are stuck it retries them. The automatic background sync itself runs in
// SyncBanner's useSyncStatus hook, mounted once by DashboardLayout.

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, CloudUpload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { pushChanges, pullUpdates } from "../syncEngine";
import { toast } from "react-hot-toast";

export default function SyncStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);       // user-triggered sync
  const [bgActive, setBgActive] = useState(false); // engine pull/push in progress
  const bgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pendingCount = useLiveQuery(() => db.sync_queue.where("status").equals("pending").count()) ?? 0;
  const stuckCount =
    useLiveQuery(() => db.sync_queue.where("status").anyOf(["failed", "rate_limited", "conflict_detected"]).count()) ?? 0;

  useEffect(() => {
    setLastSync(localStorage.getItem("last_push_at"));
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);

    const start = () => {
      setBgActive(true);
      // Safety: a pull that exits early never fires "complete"
      if (bgTimer.current) clearTimeout(bgTimer.current);
      bgTimer.current = setTimeout(() => setBgActive(false), 60000);
    };
    const done = () => {
      setBgActive(false);
      if (bgTimer.current) clearTimeout(bgTimer.current);
      setLastSync(localStorage.getItem("last_push_at") || new Date().toISOString());
    };

    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("tuhanas:pull-start", start);
    window.addEventListener("tuhanas:pull-complete", done);
    window.addEventListener("tuhanas:push-complete", done);
    window.addEventListener("tuhanas:bg-sync-complete", done);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("tuhanas:pull-start", start);
      window.removeEventListener("tuhanas:pull-complete", done);
      window.removeEventListener("tuhanas:push-complete", done);
      window.removeEventListener("tuhanas:bg-sync-complete", done);
      if (bgTimer.current) clearTimeout(bgTimer.current);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline) {
      toast.error("You're offline. Changes will sync when you reconnect.");
      return;
    }
    if (busy) return;
    setBusy(true);
    const retry = stuckCount > 0;
    const id = toast.loading(retry ? "Retrying failed changes..." : "Syncing...");
    try {
      const result = await pushChanges(retry);
      await pullUpdates().catch(() => {});
      const now = new Date().toISOString();
      localStorage.setItem("last_push_at", now);
      setLastSync(now);
      if (result.failed > 0) toast.error(`${result.failed} change${result.failed === 1 ? "" : "s"} couldn't sync`, { id });
      else toast.success(result.pushed > 0 ? `Synced ${result.pushed} change${result.pushed === 1 ? "" : "s"}` : "Up to date", { id });
    } catch {
      toast.error("Sync failed. Check your connection.", { id });
    } finally {
      setBusy(false);
    }
  };

  const syncing = busy || bgActive;
  const state = !isOnline ? "offline" : syncing ? "syncing" : stuckCount > 0 ? "error" : pendingCount > 0 ? "pending" : "synced";

  const view = {
    offline: { icon: <CloudUpload className="w-3.5 h-3.5 text-slate-400" />, text: pendingCount ? `${pendingCount} waiting` : "Saved offline", cls: "text-slate-500" },
    syncing: { icon: <RefreshCw className="w-3.5 h-3.5 text-sky-500 animate-spin" />, text: "Syncing...", cls: "text-sky-700" },
    error: { icon: <AlertCircle className="w-3.5 h-3.5 text-rose-500" />, text: `${stuckCount} failed · retry`, cls: "text-rose-600" },
    pending: { icon: <CloudUpload className="w-3.5 h-3.5 text-amber-500" />, text: `${pendingCount} pending`, cls: "text-amber-700" },
    synced: { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />, text: "Synced", cls: "text-slate-600" },
  }[state];

  const title =
    state === "error"
      ? "Some changes were rejected by the server. Click to retry."
      : lastSync
        ? `Last synced ${new Date(lastSync).toLocaleString()}. Click to sync now.`
        : "Click to sync now.";

  return (
    <div className="flex items-center h-9 bg-white rounded-full border border-slate-200 overflow-hidden">
      <div className={`flex items-center gap-1.5 pl-3 pr-2.5 text-xs font-semibold ${isOnline ? "text-emerald-700" : "text-rose-600"}`}>
        {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
        {isOnline ? "Online" : "Offline"}
      </div>
      <div className="h-4 w-px bg-slate-200" />
      <button
        onClick={handleSync}
        disabled={busy}
        title={title}
        className={`flex items-center gap-1.5 h-full pl-2.5 pr-3 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-70 ${view.cls}`}
      >
        {view.icon}
        <span className="whitespace-nowrap">{view.text}</span>
      </button>
    </div>
  );
}
