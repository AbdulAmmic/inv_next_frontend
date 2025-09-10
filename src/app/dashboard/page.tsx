"use client";

import { useState, useEffect } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import DashboardStats from "@/components/dashboardStats";
import { Menu } from "lucide-react";

export default function DashboardApp() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile and adjust sidebar state accordingly
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={isSidebarOpen} isMobile={isMobile} toggleSidebar={toggleSidebar} />
      
      {/* Main content */}
      <div className={`flex-1 flex flex-col ${isSidebarOpen && !isMobile ? 'md:ml-0' : 'md:ml-0'} transition-margin duration-300`}>
        <Header />
        <main className="p-6">
          <div className="flex items-center mb-6">
            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="mr-3 p-2 rounded-lg bg-white border border-gray-200 shadow-sm"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
          </div>
          
        
          <DashboardStats />
        </main>
      </div>
    </div>
  );
}