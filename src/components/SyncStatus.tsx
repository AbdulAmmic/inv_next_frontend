"use client";

// SyncStatus.tsx — legacy component kept for header compatibility
// Now delegates to the new SyncBanner approach via syncEngine (no startSync timer)

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { pushChanges, pullUpdates } from "../syncEngine";
import { toast } from "react-hot-toast";

export default function SyncStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const pendingCount = useLiveQuery(() =>
    db.sync_queue.where("status").anyOf(["pending", "failed"]).count()
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLastSync(localStorage.getItem("last_push_at"));
    }
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleForceSync = async () => {
    if (!isOnline) {
      toast.error("Cannot sync while offline");
      return;
    }
    setIsSyncing(true);
    const loadingToast = toast.loading("Pushing changes to server...");
    try {
      await pushChanges();
      const nowISO = new Date().toISOString();
      if (typeof window !== 'undefined') {
        localStorage.setItem("last_push_at", nowISO);
        setLastSync(nowISO);
      }
      toast.success("All changes pushed!", { id: loadingToast });
    } catch (error) {
      console.error(error);
      toast.error("Sync failed. Check connection.", { id: loadingToast });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100">
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-emerald-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-rose-500" />
        )}
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>

      <div className="h-4 w-px bg-slate-200" />

      <button
        onClick={handleForceSync}
        disabled={isSyncing || !isOnline}
        title="Push changes to server"
        className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded transition-colors disabled:opacity-50"
      >
        {isSyncing ? (
          <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
        ) : (pendingCount ?? 0) > 0 ? (
          <RefreshCw className="w-4 h-4 text-amber-500" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        )}
        <span className="text-xs font-bold text-slate-600">
          {isSyncing ? "Syncing..." : (pendingCount ?? 0) === 0 ? "Synced" : `${pendingCount} Pending`}
        </span>
      </button>

      {lastSync && (
        <>
          <div className="h-4 w-px bg-slate-200" />
          <span className="text-[10px] text-slate-400 font-medium">
            Last: {new Date(lastSync).toLocaleTimeString()}
          </span>
        </>
      )}
    </div>
  );
}
