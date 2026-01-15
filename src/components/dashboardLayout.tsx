"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Handle Resize
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024; // lg breakpoint
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false); // Default close on mobile
            } else {
                setSidebarOpen(true); // Default open on desktop
            }
        };

        // Initial check
        handleResize();

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    return (
        <div className="flex min-h-screen bg-gray-50 overflow-hidden">
            {/* Sidebar - Controlled by Layout */}
            <Sidebar
                isOpen={sidebarOpen}
                toggleSidebar={toggleSidebar}
                isMobile={isMobile}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300">

                {/* Header - We pass toggleSidebar to let header hamburger work if needed, 
            though Header currently has its own. 
            Ideally we sync them or hide Header's hamburger if Sidebar provides one. 
            For now, we wrap everything.
        */}
                <div className="flex-shrink-0 z-20">
                    <Header onMenuClick={toggleSidebar} showMenuButton={isMobile} />
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
                    {/* Apply Zoom Wrapper on Desktop */}
                    <div className="desktop-zoom min-h-full">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
