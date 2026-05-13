"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import SyncBanner from "@/components/SyncBanner";
import { seedDatabaseFromSQL, isDBSeeded } from "@/seedDB";
import { pullUpdates } from "@/syncEngine";
import { api } from "@/apiCalls";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

type InitStage =
    | "seeding"
    | "waking"    // Pinging Render server to wake it up
    | "pulling"   // Fetching data
    | "ready"
    | "offline";

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
                await api.get("/health", { timeout: 8000 });
                return true; // Server is awake
            } catch {
                // Still sleeping — wait 4s before retry
                await new Promise(r => setTimeout(r, 4000));
            }
        }
        return false; // Timed out
    };

    // ─────────────────────────────────────────────────────────────
    // DB INIT
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (typeof window === "undefined" || initDone.current) return;
        initDone.current = true;

        const init = async () => {
            // Step 1: Seed from SQL bundle on first launch
            if (!isDBSeeded()) {
                setStage("seeding");
                try {
                    await seedDatabaseFromSQL();
                } catch (e) {
                    console.error("Seed failed:", e);
                }
            }

            // Step 2: If online + have a token, sync from server
            const token = localStorage.getItem("access_token");
            if (!navigator.onLine || !token) {
                setStage("offline");
                setTimeout(() => setStage("ready"), 500);
                return;
            }

            // Step 3: Wake up the Render server first
            setStage("waking");
            const awake = await wakeServer(90000);

            if (!awake) {
                console.warn("⚠️ Server did not wake up in time — using local data");
                setStage("ready");
                return;
            }

            // Step 4: Pull fresh data
            setStage("pulling");
            try {
                await pullUpdates();
                console.log("✅ Data pulled from server");
            } catch (e) {
                console.warn("⚠️ Pull failed — using local data:", e);
            }

            setStage("ready");
        };

        init();
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
    // Loading screen while initializing
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
                    <p className="text-sm font-semibold text-gray-700">
                        {messages[stage]}
                    </p>
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
            <Sidebar
                isOpen={sidebarOpen}
                toggleSidebar={toggleSidebar}
                isMobile={isMobile}
            />

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
