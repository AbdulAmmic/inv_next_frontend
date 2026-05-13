"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/db";
import { motion, AnimatePresence } from "framer-motion";
import { CloudOff, CloudUpload, CheckCircle2, AlertCircle, X } from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type SyncState = "synced" | "unsynced" | "syncing" | "error";

interface SyncBannerState {
  state: SyncState;
  pendingCount: number;
  progress: number;       // 0-100 during sync
  progressLabel: string;
  errorMsg: string | null;
  lastSyncedAt: string | null;
}

// ─────────────────────────────────────────────
// Hook: useSyncStatus
// ─────────────────────────────────────────────
export function useSyncStatus() {
  const [banner, setBanner] = useState<SyncBannerState>({
    state: "synced",
    pendingCount: 0,
    progress: 0,
    progressLabel: "",
    errorMsg: null,
    lastSyncedAt: typeof window !== "undefined" ? localStorage.getItem("last_push_at") : null,
  });

  const refreshPendingCount = useCallback(async () => {
    try {
      const pending = await db.sync_queue
        .where("status")
        .anyOf(["pending", "failed"])
        .count();
      
      setBanner(prev => ({
        ...prev,
        pendingCount: pending,
        state: pending > 0 ? "unsynced" : (prev.state === "syncing" ? "syncing" : "synced"),
      }));
    } catch (e) {
      // DB not ready yet
    }
  }, []);

  // Poll every 10 seconds for pending queue changes
  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 10000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  /**
   * Trigger manual push to server with progress tracking
   */
  const pushToServer = useCallback(async () => {
    setBanner(prev => ({
      ...prev,
      state: "syncing",
      progress: 0,
      progressLabel: "Preparing changes...",
      errorMsg: null,
    }));

    try {
      const { pushChanges } = await import("@/syncEngine");
      
      // Get total pending
      const pending = await db.sync_queue
        .where("status").anyOf(["pending", "failed"])
        .toArray();
      
      if (pending.length === 0) {
        setBanner(prev => ({
          ...prev,
          state: "synced",
          progress: 100,
          progressLabel: "Already up to date",
          lastSyncedAt: new Date().toISOString(),
        }));
        return;
      }

      // Simulate chunked progress (pushChanges handles it in one go)
      setBanner(prev => ({ ...prev, progress: 20, progressLabel: `Pushing ${pending.length} changes...` }));
      
      await pushChanges();
      
      setBanner(prev => ({ ...prev, progress: 80, progressLabel: "Verifying..." }));
      await new Promise(r => setTimeout(r, 300));
      
      const nowISO = new Date().toISOString();
      localStorage.setItem("last_push_at", nowISO);
      
      setBanner({
        state: "synced",
        pendingCount: 0,
        progress: 100,
        progressLabel: "All changes pushed!",
        errorMsg: null,
        lastSyncedAt: nowISO,
      });

    } catch (err: any) {
      setBanner(prev => ({
        ...prev,
        state: "error",
        progress: 0,
        progressLabel: "",
        errorMsg: err?.message || "Push failed. Check your connection.",
      }));
    }
  }, []);

  return { banner, pushToServer, refreshPendingCount };
}


// ─────────────────────────────────────────────
// Component: SyncBanner
// A persistent bar at the top of dashboard
// ─────────────────────────────────────────────
export default function SyncBanner() {
  const { banner, pushToServer } = useSyncStatus();
  const [dismissed, setDismissed] = useState(false);

  // Auto-show again when state changes to unsynced/error
  useEffect(() => {
    if (banner.state === "unsynced" || banner.state === "error") {
      setDismissed(false);
    }
  }, [banner.state]);

  // Don't show the banner at all if synced and dismissed
  if (banner.state === "synced" && dismissed) return null;

  const configs = {
    unsynced: {
      bg: "bg-amber-500",
      icon: <CloudOff className="w-4 h-4 flex-shrink-0" />,
      text: `Data Not Synced — ${banner.pendingCount} change${banner.pendingCount !== 1 ? 's' : ''} pending`,
      action: "Push to Server",
      actionStyle: "bg-white text-amber-700 hover:bg-amber-50",
    },
    syncing: {
      bg: "bg-blue-600",
      icon: <CloudUpload className="w-4 h-4 flex-shrink-0 animate-pulse" />,
      text: banner.progressLabel,
      action: null,
      actionStyle: "",
    },
    error: {
      bg: "bg-red-500",
      icon: <AlertCircle className="w-4 h-4 flex-shrink-0" />,
      text: banner.errorMsg || "Sync error",
      action: "Retry",
      actionStyle: "bg-white text-red-600 hover:bg-red-50",
    },
    synced: {
      bg: "bg-emerald-500",
      icon: <CheckCircle2 className="w-4 h-4 flex-shrink-0" />,
      text: banner.lastSyncedAt
        ? `Synced · ${new Date(banner.lastSyncedAt).toLocaleTimeString()}`
        : "All data synced",
      action: null,
      actionStyle: "",
    },
  };

  const cfg = configs[banner.state];

  return (
    <AnimatePresence>
      <motion.div
        key={banner.state}
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className={`${cfg.bg} text-white overflow-hidden`}
      >
        <div className="px-4 py-2 flex items-center gap-3 text-sm font-semibold">
          {cfg.icon}
          
          <span className="flex-1 truncate">{cfg.text}</span>
          
          {/* Progress bar during sync */}
          {banner.state === "syncing" && (
            <div className="flex items-center gap-2 w-32 flex-shrink-0">
              <div className="flex-1 h-1.5 bg-blue-400/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${banner.progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className="text-xs text-blue-100 w-8 text-right">{banner.progress}%</span>
            </div>
          )}

          {cfg.action && (
            <button
              onClick={banner.state === "syncing" ? undefined : pushToServer}
              disabled={banner.state === "syncing"}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all active:scale-95 flex-shrink-0 ${cfg.actionStyle}`}
            >
              {cfg.action}
            </button>
          )}

          {/* Dismiss on synced state */}
          {banner.state === "synced" && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-white/20 rounded transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
