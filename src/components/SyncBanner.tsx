"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/db";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type SyncState = "synced" | "unsynced" | "syncing" | "pulling" | "error" | "offline";

interface SyncBannerState {
  state: SyncState;
  pendingCount: number;
  // Items that pushed and got stuck (failed / rate_limited / conflict_detected)
  // — these will NOT resolve on their own and need a manual retry, unlike
  // 'pending' which just means "not pushed yet, will sync automatically".
  stuckCount: number;
  progress: number;        // 0–100
  progressLabel: string;
  errorMsg: string | null;
  lastSyncedAt: string | null;
  pulledCount: number;
}

const DEFAULT_STATE: SyncBannerState = {
  state: "synced",
  pendingCount: 0,
  stuckCount: 0,
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
      const [pending, stuck] = await Promise.all([
        db.sync_queue.where("status").equals("pending").count(),
        db.sync_queue.where("status").anyOf(["failed", "rate_limited", "conflict_detected"]).count(),
      ]);

      setBanner((prev) => ({
        ...prev,
        pendingCount: pending,
        stuckCount: stuck,
        state:
          prev.state === "syncing" || prev.state === "pulling"
            ? prev.state
            : stuck > 0
            ? "error"
            : pending > 0
            ? "unsynced"
            : "synced",
      }));
    } catch {
      // DB not ready yet — ignore
    }
  }, []);

  // Poll every 20 seconds — real-time updates come from the push/pull
  // events below; this is just a safety-net fallback, so it doesn't need
  // to be aggressive (avoids competing with the UI for IndexedDB access).
  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 20000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  // ── Online / Offline detection ──
  useEffect(() => {
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
      setBanner((prev) => ({
        ...prev,
        state: "synced",
        progress: 100,
        progressLabel: total > 0 ? `Pulled ${total} records` : "Already up to date",
        errorMsg: null,
        lastSyncedAt: nowISO,
        pulledCount: total,
      }));
      // Refresh queue count (and correct state if anything is still stuck)
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

    const onBgSyncComplete = () => refreshPendingCount();

    window.addEventListener("tuhanas:pull-start", onPullStart as EventListener);
    window.addEventListener("tuhanas:pull-progress", onPullProgress as EventListener);
    window.addEventListener("tuhanas:pull-complete", onPullComplete as EventListener);
    window.addEventListener("tuhanas:push-complete", onPushComplete as EventListener);
    window.addEventListener("tuhanas:bg-sync-complete", onBgSyncComplete);

    return () => {
      window.removeEventListener("tuhanas:pull-start", onPullStart as EventListener);
      window.removeEventListener("tuhanas:pull-progress", onPullProgress as EventListener);
      window.removeEventListener("tuhanas:pull-complete", onPullComplete as EventListener);
      window.removeEventListener("tuhanas:push-complete", onPushComplete as EventListener);
      window.removeEventListener("tuhanas:bg-sync-complete", onBgSyncComplete);
    };
  }, [refreshPendingCount]);

  // ── Manual trigger: pull from server ──
  const triggerPull = useCallback(async () => {
    // No navigator.onLine gate — it's unreliable (especially in Electron);
    // pullUpdates probes connectivity itself and no-ops cheaply if offline.
    if (isSyncing.current) return;
    isSyncing.current = true;
    try {
      const { pullUpdates } = await import("@/syncEngine");
      await pullUpdates();
    } catch (err: any) {
      setBanner((prev) => ({
        ...prev,
        state: "error",
        errorMsg: err?.message || "Pull failed. Check your connection.",
      }));
    } finally {
      // Always release — pullUpdates can return early (offline, sync lock
      // held) without firing pull-complete, and leaving this flag set used
      // to permanently block every future banner-driven sync until restart.
      isSyncing.current = false;
    }
  }, []);

  // ── Manual trigger: push to server ──
  const pushToServer = useCallback(async (retryFailed = false) => {
    // No navigator.onLine gate — pushChanges probes connectivity itself.
    if (isSyncing.current) return;
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

      const statuses = retryFailed
        ? ["pending", "failed", "rate_limited", "conflict_detected"]
        : ["pending", "failed", "rate_limited"];
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
        setBanner((prev) => ({
          ...prev,
          state: "synced",
          progress: 100,
          progressLabel:
            result.pushed > 0
              ? `Pushed ${result.pushed} change${result.pushed !== 1 ? "s" : ""}`
              : "All up to date",
          errorMsg: null,
          lastSyncedAt: nowISO,
          pulledCount: 0,
        }));
      }

      await refreshPendingCount();

      // Also pull fresh data after push
      setTimeout(() => triggerPull(), 1000);
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
// Headless: runs the automatic background sync (auto-push when changes are
// pending, pull after push). Status is shown in the header's SyncStatus
// pill, not as a floating popup.
// ─────────────────────────────────────────────
export default function SyncBanner() {
  useSyncStatus();
  return null;
}
