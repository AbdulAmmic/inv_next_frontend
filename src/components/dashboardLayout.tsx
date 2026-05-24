"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import SyncBanner from "@/components/SyncBanner";
import { seedDatabaseFromSQL, isDBSeeded } from "@/seedDB";
import { pullUpdates } from "@/syncEngine";
import { db } from "@/db";
import { markSyncReady, isSyncReady } from "@/syncGate";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://inv-flask-api.onrender.com";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

type InitStage = "seeding" | "waking" | "pulling" | "ready" | "offline";

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [stage, setStage] = useState<InitStage>("seeding");
    const [wakeAttempt, setWakeAttempt] = useState(0);
    const [pullPct, setPullPct] = useState(0);
    const [pullLabel, setPullLabel] = useState("Syncing latest data...");
    const initDone = useRef(false);

    // ─────────────────────────────────────────────────────────────
    // Wake up Render server — pings /health until it responds
    // ─────────────────────────────────────────────────────────────
    const wakeServer = async (maxWaitMs = 90000): Promise<boolean> => {
        const start = Date.now();
        let attempt = 0;
        while (Date.now() - start < maxWaitMs) {
            attempt++;
            setWakeAttempt(attempt);
            try {
                await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(8000) });
                return true;
            } catch {
                await new Promise((r) => setTimeout(r, 4000));
            }
        }
        return false;
    };

    // ─────────────────────────────────────────────────────────────
    // Background sync — push pending changes first, then pull delta
    // Runs silently after initial load — dispatches events for UI updates
    // ─────────────────────────────────────────────────────────────
    const backgroundSync = async () => {
        try {
            const token = localStorage.getItem("access_token");
            if (!navigator.onLine || !token) return;

            const { pushChanges, pullUpdates: pull } = await import("@/syncEngine");

            // Push queued local changes first
            const queueCount = await db.sync_queue
                .where("status")
                .anyOf(["pending", "failed"])
                .count();

            if (queueCount > 0) {
                await pushChanges();
            }

            // Pull fresh data from server
            await pull();

            // Signal that bg sync is done → dashboard will auto-refresh
            window.dispatchEvent(new CustomEvent("tuhanas:bg-sync-complete", { detail: { refreshStats: true } }));
            console.log("✅ Background sync complete");
        } catch (e) {
            console.warn("⚠️ Background sync failed:", e);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // DB INIT — runs once on mount
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (typeof window === "undefined" || initDone.current) return;
        initDone.current = true;

        const init = async () => {
            try {
                // Step 0: If Dexie already has data AND sync gate is open → ready immediately
                const hasData =
                    (await db.products.count()) > 0 || (await db.shops.count()) > 0;

                if (hasData && isSyncReady()) {
                    setStage("ready");
                    // Sync in background — don't block UI
                    setTimeout(() => backgroundSync(), 500);
                    return;
                }

                // Step 1: Seed from bundled SQL on first ever launch
                if (!isDBSeeded()) {
                    setStage("seeding");
                    await seedDatabaseFromSQL().catch(console.error);
                }

                // Step 2: Check connectivity + token
                const token = localStorage.getItem("access_token");
                if (!navigator.onLine || !token) {
                    setStage("offline");
                    setTimeout(() => {
                        markSyncReady();
                        setStage("ready");
                    }, 600);
                    return;
                }

                // Step 3: If Dexie already has data, show it right away and sync in background
                const hasDataNow =
                    (await db.products.count()) > 0 || (await db.shops.count()) > 0;

                if (hasDataNow) {
                    markSyncReady();
                    setStage("ready");
                    // Non-blocking background sync
                    setTimeout(() => backgroundSync(), 300);
                    return;
                }

                // Step 4: Fresh device — wake server and do initial full pull
                setStage("waking");
                const awake = await wakeServer(90000);

                if (!awake) {
                    console.warn("⚠️ Server did not wake — using local data");
                    markSyncReady();
                    setStage("ready");
                    return;
                }

                setStage("pulling");
                try {
                    await pullUpdates();
                    console.log("✅ Initial pull complete");
                } catch (e) {
                    console.warn("⚠️ Pull failed:", e);
                }

                markSyncReady();
                setStage("ready");
            } catch (e) {
                console.error("Init error:", e);
                markSyncReady(); // Always open gate so pages don't hang
                setStage("ready");
            }
        };

        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─────────────────────────────────────────────────────────────
    // Pull progress tracking for the loading screen
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const onProgress = (e: CustomEvent) => {
            const { pct, label } = e.detail || {};
            if (pct !== undefined) setPullPct(pct);
            if (label) setPullLabel(label);
        };
        window.addEventListener("tuhanas:pull-progress", onProgress as EventListener);
        return () => window.removeEventListener("tuhanas:pull-progress", onProgress as EventListener);
    }, []);

    // ─────────────────────────────────────────────────────────────
    // Auto-sync when device comes back online
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const handleOnline = () => {
            // SyncBanner handles this — backgroundSync is triggered there
            // Just ensure the gate is open
            if (stage === "ready") {
                backgroundSync();
            }
        };
        window.addEventListener("online", handleOnline);
        return () => window.removeEventListener("online", handleOnline);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage]);

    // ─────────────────────────────────────────────────────────────
    // Handle Resize
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            setSidebarOpen(!mobile);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    // ─────────────────────────────────────────────────────────────
    // Loading screen — only on completely fresh device
    // ─────────────────────────────────────────────────────────────
    if (stage !== "ready") {
        const messages: Record<InitStage, string> = {
            seeding: "Setting up local database...",
            waking: `Connecting to server${wakeAttempt > 1 ? ` (attempt ${wakeAttempt})` : ""}...`,
            pulling: pullLabel,
            offline: "Loading offline data...",
            ready: "",
        };

        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-5 text-gray-500 px-6 text-center max-w-sm">
                    <div className="relative w-14 h-14">
                        <div className="w-14 h-14 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" style={{ animationDirection: "reverse" }} />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <p className="text-sm font-bold text-gray-800">{messages[stage]}</p>
                        {stage === "waking" && (
                            <p className="text-xs text-gray-400 leading-relaxed">
                                The server is waking from sleep. This may take up to 60 seconds on first load.
                            </p>
                        )}
                        {stage === "offline" && (
                            <p className="text-xs text-amber-500 font-semibold">
                                ✈️ Offline mode — using locally cached data
                            </p>
                        )}
                    </div>

                    {/* Progress bar during pull */}
                    {stage === "pulling" && (
                        <div className="w-full">
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${pullPct}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1.5 text-right tabular-nums">
                                {pullPct}%
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50 overflow-hidden">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} isMobile={isMobile} />

            <div className="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300">
                <SyncBanner />
                <div className="flex-shrink-0 z-20">
                    <Header onMenuClick={toggleSidebar} showMenuButton={isMobile} />
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
                    <div className="min-h-full max-w-[1600px] mx-auto w-full">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
