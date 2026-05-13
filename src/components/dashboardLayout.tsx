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
                await new Promise(r => setTimeout(r, 4000));
            }
        }
        return false;
    };

    // ─────────────────────────────────────────────────────────────
    // DB INIT
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (typeof window === "undefined" || initDone.current) return;
        initDone.current = true;

        const init = async () => {
            try {
                // Step 0: If Dexie already has data AND sync gate already open → ready immediately
                const hasData = (await db.products.count()) > 0 || (await db.shops.count()) > 0;
                if (hasData && isSyncReady()) {
                    setStage("ready");
                    // Still sync in background silently
                    backgroundSync();
                    return;
                }

                // Step 1: Seed from SQL bundle on first launch (local device)
                if (!isDBSeeded()) {
                    setStage("seeding");
                    await seedDatabaseFromSQL().catch(console.error);
                }

                // Step 2: Check connectivity + token
                const token = localStorage.getItem("access_token");
                if (!navigator.onLine || !token) {
                    setStage("offline");
                    setTimeout(() => { markSyncReady(); setStage("ready"); }, 500);
                    return;
                }

                // Step 3: If Dexie already has data, show it immediately and sync in background
                const hasDataNow = (await db.products.count()) > 0 || (await db.shops.count()) > 0;
                if (hasDataNow) {
                    markSyncReady();
                    setStage("ready");
                    backgroundSync();
                    return;
                }

                // Step 4: Fresh device — wake server and pull
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

    // Background sync — push pending + pull fresh data without blocking UI
    const backgroundSync = async () => {
        try {
            const token = localStorage.getItem("access_token");
            if (!navigator.onLine || !token) return;

            // Push any queued local changes first
            const { pushChanges, pullUpdates: pull } = await import("@/syncEngine");
            const queueCount = await import("@/db").then(m => m.db.sync_queue.where("status").anyOf(["pending", "failed"]).count());
            if (queueCount > 0) {
                await pushChanges();
                window.dispatchEvent(new Event("tuhanas:push-complete"));
            }

            // Then pull fresh data (skip wakeServer — server already awake from login)
            await pull();
            window.dispatchEvent(new Event("tuhanas:bg-sync-complete"));
            console.log("✅ Background sync complete");
        } catch (e) {
            console.warn("⚠️ Background sync failed:", e);
        }
    };

    // Auto-push when device comes back online
    useEffect(() => {
        const handleOnline = () => { backgroundSync(); };
        window.addEventListener("online", handleOnline);
        return () => window.removeEventListener("online", handleOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle Resize
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
    // Loading screen (only on completely fresh device)
    // ─────────────────────────────────────────────────────────────
    if (stage !== "ready") {
        const messages: Record<InitStage, string> = {
            seeding:  "Setting up local database...",
            waking:   `Connecting to server${wakeAttempt > 1 ? ` (attempt ${wakeAttempt})` : ""}...`,
            pulling:  "Syncing latest data...",
            offline:  "Loading offline data...",
            ready:    "",
        };

        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4 text-gray-500 px-6 text-center">
                    <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-semibold text-gray-700">{messages[stage]}</p>
                    {stage === "waking" && (
                        <p className="text-xs text-gray-400 max-w-xs">
                            The server is waking up from sleep. This may take up to 60 seconds on first load.
                        </p>
                    )}
                    {stage === "offline" && (
                        <p className="text-xs text-amber-500 font-medium">
                            ✈️ Offline mode — using locally cached data
                        </p>
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
