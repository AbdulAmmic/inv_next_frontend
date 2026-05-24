"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/db";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudOff,
  CloudUpload,
  CloudDownload,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff,
  X,
  RefreshCw,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type SyncState = "synced" | "unsynced" | "syncing" | "pulling" | "error" | "offline";

interface SyncBannerState {
  state: SyncState;
  pendingCount: number;
  progress: number;        // 0–100
  progressLabel: string;
  errorMsg: string | null;
  lastSyncedAt: string | null;
  pulledCount: number;
}

const DEFAULT_STATE: SyncBannerState = {
  state: "synced",
  pendingCount: 0,
  progress: 0,
  progressLabel: "",
  errorMsg: null,
  lastSyncedAt: typeof window !== "undefined" ? localStorage.getItem("last_push_at") : null,
  pulledCount: 0,
};

// ─────────────────────────────────────────────
// Hook: useSyncStatus
// ─────────────────────────────────────────────
export function useSyncStatus() {
  const [banner, setBanner] = useState<SyncBannerState>(DEFAULT_STATE);
  const [online, setOnline] = useState<boolean>(
    typeof window !== "undefined" ? navigator.onLine : true
  );
  const isSyncing = useRef(false);

  // ── Refresh pending queue count ──
  const refreshPendingCount = useCallback(async () => {
    try {
      const pending = await db.sync_queue
        .where("status")
        .equals("pending")
        .count();

      setBanner((prev) => ({
        ...prev,
        pendingCount: pending,
        state:
          prev.state === "syncing" || prev.state === "pulling" || prev.state === "error"
            ? prev.state
            : pending > 0
            ? "unsynced"
            : "synced",
      }));
    } catch {
      // DB not ready yet — ignore
    }
  }, []);

  // Poll every 8 seconds
  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 8000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  // ── Online / Offline detection ──
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.onLine) {
      setTimeout(() => {
        if (!isSyncing.current) triggerPull();
      }, 2000);
    }
    const handleOnline = () => {
      setOnline(true);
      // Automatically pull when internet comes back
      if (!isSyncing.current) {
        triggerPull();
      }
    };
    const handleOffline = () => {
      setOnline(false);
      setBanner((prev) => ({
        ...prev,
        state: "offline",
      }));
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Listen to pull progress events from syncEngine ──
  useEffect(() => {
    const onPullStart = () => {
      isSyncing.current = true;
      setBanner((prev) => ({
        ...prev,
        state: "pulling",
        progress: 0,
        progressLabel: "Internet detected — pulling latest data...",
        errorMsg: null,
      }));
    };

    const onPullProgress = (e: CustomEvent) => {
      const { pct, label } = e.detail || {};
      setBanner((prev) => ({
        ...prev,
        state: "pulling",
        progress: pct ?? prev.progress,
        progressLabel: label ?? prev.progressLabel,
      }));
    };

    const onPullComplete = (e: CustomEvent) => {
      isSyncing.current = false;
      const total = e.detail?.total ?? 0;
      const nowISO = new Date().toISOString();
      if (typeof window !== "undefined") localStorage.setItem("last_push_at", nowISO);
      setBanner({
        state: "synced",
        pendingCount: 0,
        progress: 100,
        progressLabel: total > 0 ? `✓ Pulled ${total} records` : "Already up to date",
        errorMsg: null,
        lastSyncedAt: nowISO,
        pulledCount: total,
      });
      // Refresh queue count after pull
      refreshPendingCount();
    };

    const onPushComplete = (e: CustomEvent) => {
      const { pushed } = e.detail || {};
      if (pushed > 0) {
        const nowISO = new Date().toISOString();
        if (typeof window !== "undefined") localStorage.setItem("last_push_at", nowISO);
        setBanner((prev) => ({
          ...prev,
          lastSyncedAt: nowISO,
        }));
      }
      refreshPendingCount();
    };

    window.addEventListener("tuhanas:pull-start", onPullStart as EventListener);
    window.addEventListener("tuhanas:pull-progress", onPullProgress as EventListener);
    window.addEventListener("tuhanas:pull-complete", onPullComplete as EventListener);
    window.addEventListener("tuhanas:push-complete", onPushComplete as EventListener);
    window.addEventListener("tuhanas:bg-sync-complete", () => refreshPendingCount());

    return () => {
      window.removeEventListener("tuhanas:pull-start", onPullStart as EventListener);
      window.removeEventListener("tuhanas:pull-progress", onPullProgress as EventListener);
      window.removeEventListener("tuhanas:pull-complete", onPullComplete as EventListener);
      window.removeEventListener("tuhanas:push-complete", onPushComplete as EventListener);
      window.removeEventListener("tuhanas:bg-sync-complete", () => refreshPendingCount());
    };
  }, [refreshPendingCount]);

  // ── Manual trigger: pull from server ──
  const triggerPull = useCallback(async () => {
    if (!navigator.onLine || isSyncing.current) return;
    isSyncing.current = true;
    try {
      const { pullUpdates } = await import("@/syncEngine");
      await pullUpdates();
    } catch (err: any) {
      isSyncing.current = false;
      setBanner((prev) => ({
        ...prev,
        state: "error",
        errorMsg: err?.message || "Pull failed. Check your connection.",
      }));
    }
  }, []);

  // ── Manual trigger: push to server ──
  const pushToServer = useCallback(async (retryFailed = false) => {
    if (!navigator.onLine || isSyncing.current) return;
    isSyncing.current = true;

    setBanner((prev) => ({
      ...prev,
      state: "syncing",
      progress: 0,
      progressLabel: "Preparing changes...",
      errorMsg: null,
    }));

    try {
      const { pushChanges } = await import("@/syncEngine");

      const statuses = retryFailed ? ["pending", "failed"] : ["pending"];
      const pendingCount = await db.sync_queue
        .where("status")
        .anyOf(statuses)
        .count();

      if (pendingCount === 0) {
        isSyncing.current = false;
        setBanner((prev) => ({
          ...prev,
          state: "synced",
          progress: 100,
          progressLabel: "Already up to date",
          lastSyncedAt: new Date().toISOString(),
        }));
        return;
      }

      setBanner((prev) => ({
        ...prev,
        progress: 15,
        progressLabel: `Pushing ${pendingCount} change${pendingCount !== 1 ? "s" : ""}...`,
      }));

      const result = await pushChanges(retryFailed);

      setBanner((prev) => ({ ...prev, progress: 75, progressLabel: "Verifying..." }));
      await new Promise((r) => setTimeout(r, 300));

      const nowISO = new Date().toISOString();
      if (typeof window !== "undefined") localStorage.setItem("last_push_at", nowISO);

      isSyncing.current = false;

      if (result.failed > 0 && result.pushed === 0) {
        setBanner((prev) => ({
          ...prev,
          state: "error",
          progress: 0,
          progressLabel: "",
          errorMsg: `${result.failed} change${result.failed !== 1 ? "s" : ""} failed to sync`,
        }));
      } else {
        setBanner({
          state: "synced",
          pendingCount: 0,
          progress: 100,
          progressLabel:
            result.pushed > 0
              ? `✓ Pushed ${result.pushed} change${result.pushed !== 1 ? "s" : ""}`
              : "All up to date",
          errorMsg: null,
          lastSyncedAt: nowISO,
          pulledCount: 0,
        });
      }

      await refreshPendingCount();

      // Also pull fresh data after push
      if (navigator.onLine) {
        setTimeout(() => triggerPull(), 1000);
      }
    } catch (err: any) {
      isSyncing.current = false;
      setBanner((prev) => ({
        ...prev,
        state: "error",
        progress: 0,
        progressLabel: "",
        errorMsg: err?.message || "Push failed. Check your connection.",
      }));
    }
  }, [refreshPendingCount, triggerPull]);

  // ── Auto Push when online ──
  useEffect(() => {
    if (online && banner.pendingCount > 0 && !isSyncing.current) {
      pushToServer();
    }
  }, [online, banner.pendingCount, pushToServer]);

  return { banner, pushToServer, triggerPull, refreshPendingCount, online };
}


// ─────────────────────────────────────────────
// Component: SyncBanner
// ─────────────────────────────────────────────
export default function SyncBanner() {
  const { banner, pushToServer, triggerPull, online } = useSyncStatus();
  const [dismissed, setDismissed] = useState(false);

  // Re-show banner when status changes to something actionable
  useEffect(() => {
    if (
      banner.state === "unsynced" ||
      banner.state === "error" ||
      banner.state === "pulling"
    ) {
      setDismissed(false);
    }
  }, [banner.state]);

  // Hide if synced and dismissed
  if ((banner.state === "synced" || banner.state === "offline") && dismissed) return null;

  type ConfigKey = Exclude<SyncState, "offline">;

  const configs: Record<ConfigKey, {
    bg: string;
    icon: React.ReactNode;
    text: string;
    action: string | null;
    actionStyle: string;
    showProgress: boolean;
  }> = {
    unsynced: {
      bg: "bg-amber-500",
      icon: <CloudUpload className="w-4 h-4 flex-shrink-0" />,
      text: `${banner.pendingCount} change${banner.pendingCount !== 1 ? "s" : ""} waiting to sync`,
      action: "Sync Now",
      actionStyle: "bg-white text-amber-700 hover:bg-amber-50",
      showProgress: false,
    },
    syncing: {
      bg: "bg-blue-600",
      icon: <CloudUpload className="w-4 h-4 flex-shrink-0 animate-pulse" />,
      text: banner.progressLabel || "Pushing changes...",
      action: null,
      actionStyle: "",
      showProgress: true,
    },
    pulling: {
      bg: "bg-indigo-600",
      icon: <CloudDownload className="w-4 h-4 flex-shrink-0 animate-pulse" />,
      text: banner.progressLabel || "Pulling latest data...",
      action: null,
      actionStyle: "",
      showProgress: true,
    },
    error: {
      bg: "bg-red-500",
      icon: <AlertCircle className="w-4 h-4 flex-shrink-0" />,
      text: banner.errorMsg || "Sync error — tap to retry",
      action: "Retry",
      actionStyle: "bg-white text-red-600 hover:bg-red-50",
      showProgress: false,
    },
    synced: {
      bg: "bg-emerald-500",
      icon: <CheckCircle2 className="w-4 h-4 flex-shrink-0" />,
      text: banner.progressLabel
        ? banner.progressLabel
        : banner.lastSyncedAt
        ? `Synced · ${new Date(banner.lastSyncedAt).toLocaleTimeString()}`
        : "All data synced",
      action: null,
      actionStyle: "",
      showProgress: false,
    },
  };

  // Offline override
  if (!online) {
    return (
      <AnimatePresence>
        {!dismissed && (
          <motion.div
            key="offline"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-700 text-white overflow-hidden"
          >
            <div className="px-4 py-2 flex items-center gap-3 text-sm font-semibold">
              <WifiOff className="w-4 h-4 flex-shrink-0 text-slate-300" />
              <span className="flex-1 truncate">
                {banner.pendingCount > 0
                  ? `Offline — ${banner.pendingCount} change${banner.pendingCount !== 1 ? "s" : ""} saved locally, will sync when connected`
                  : "Offline — using locally cached data"}
              </span>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 hover:bg-white/20 rounded transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  const cfg = configs[banner.state as ConfigKey] ?? configs.synced;
  const actionDisabled = banner.state === "syncing" || banner.state === "pulling";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={banner.state}
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={`${cfg.bg} text-white overflow-hidden`}
      >
        <div className="px-4 py-2 flex items-center gap-3 text-sm font-semibold">
          {cfg.icon}

          <span className="flex-1 truncate text-xs">{cfg.text}</span>

          {/* Progress bar — shown during syncing or pulling */}
          {cfg.showProgress && (
            <div className="flex items-center gap-2 w-36 flex-shrink-0">
              <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${banner.progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <span className="text-xs text-white/80 w-8 text-right tabular-nums">
                {banner.progress}%
              </span>
            </div>
          )}

          {/* Action button */}
          {cfg.action && !actionDisabled && (
            <button
              onClick={
                banner.state === "error"
                  ? () => {
                      pushToServer(true); // Retry failed
                    }
                  : () => pushToServer(false)
              }
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all active:scale-95 flex-shrink-0 ${cfg.actionStyle}`}
            >
              {cfg.action}
            </button>
          )}

          {/* Dismiss on synced state */}
          {(banner.state === "synced") && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-white/20 rounded transition-colors flex-shrink-0 ml-1"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
