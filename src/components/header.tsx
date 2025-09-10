"use client";

import { useState } from "react";
import { Moon, Sun, Bell, Search, ChevronDown, Settings, LogOut, User } from "lucide-react";

export default function Header() {
  const [darkMode, setDarkMode] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
      {/* Logo / Branding */}
      <div className="flex items-center">
        <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          
          {/* Button Colored  */}

             <button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-2 rounded shadow
                          transition-all duration-300 ease-in-out 
                          hover:shadow-xl hover:-translate-y-0.5 hover:from-blue-400 hover:to-purple-500
                          active:translate-y-0 active:shadow-inner
                          animate-gentle-pulse
                          flex items-center justify-center cursor-pointer
                          focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50">
                <i className="fas fa-cash-register text-xl"></i>
                <span className="text-lg font-medium">pos</span>
            </button>
        </div>
        <div className="ml-4 h-6 w-px bg-gray-200"></div>
        <nav className="ml-4 hidden md:flex items-center space-x-6">
          <a href="#" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Stores</a>
          {/* <a href="#" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Purchases</a> */}
          {/* <a href="#" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">E</a> */}
          <a href="#" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">AI</a>
        </nav>
      </div>

      {/* Search Bar */}
      <div className="flex-1 mx-6 max-w-md relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative p-2.5 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors group">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75 group-hover:animate-none"></span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2.5 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200 mx-1"></div>

        {/* Profile Avatar with Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center font-medium shadow-md">
              A
            </div>
            <div className="hidden md:block text-sm font-medium text-gray-700">Abdul Ammic</div>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="font-medium text-gray-900">Alex Morgan</div>
                <div className="text-sm text-gray-500">alex@tuhanas.com</div>
              </div>
              
              <div className="py-2">
                <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                  <User className="w-4 h-4 mr-3" />
                  Profile
                </a>
                <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                  <Settings className="w-4 h-4 mr-3" />
                  Settings
                </a>
              </div>
              
              <div className="py-2 border-t border-gray-100">
                <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                  <LogOut className="w-4 h-4 mr-3" />
                  Sign out
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}