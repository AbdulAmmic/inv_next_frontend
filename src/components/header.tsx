"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bell,
  Search,
  ChevronDown,
  Settings,
  LogOut,
  User,
  Menu,
  ShoppingCart,
  MapPin,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getShops, api } from "@/apiCalls";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export default function Header({ onMenuClick, showMenuButton = false }: HeaderProps) {
  const router = useRouter();
  const profileRef = useRef<HTMLDivElement>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);

  const userRaw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = userRaw ? JSON.parse(userRaw) : null;

  const fullName = user?.full_name || "User";
  const userEmail = user?.email || "unknown";
  const userRole = user?.role || "staff";
  const userShopId = user?.shop_id || null;
  const userInitial = fullName.charAt(0).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("selected_shop_id");
    if (userRole === "admin") {
      if (saved) setSelectedShop(saved);
    } else if (userShopId) {
      setSelectedShop(userShopId);
      localStorage.setItem("selected_shop_id", userShopId);
    }
    loadShops();
  }, [userRole, userShopId]);

  const loadShops = async () => {
    try {
      const res = await getShops();
      setShops(res.data);
      if (userRole === "admin" && !localStorage.getItem("selected_shop_id") && res.data.length > 0) {
        const first = res.data[0].id;
        setSelectedShop(first);
        localStorage.setItem("selected_shop_id", first);
      }
    } catch (err) {
      console.error("Error loading shops:", err);
    }
  };

  const handleShopChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const shopId = e.target.value;
    setSelectedShop(shopId);
    localStorage.setItem("selected_shop_id", shopId);
    window.location.reload();
  };

  const navigate = (path: string) => {
    router.push(path);
    setProfileOpen(false);
  };

  return (
    <div className="sticky top-0 z-40 px-4 pt-3">
      <header className="bg-white/90 backdrop-blur-md border border-amber-100 rounded-2xl shadow-sm shadow-amber-100/50">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">

          {/* LEFT: Logo & Info */}
          <div className="flex items-center gap-4">
            {showMenuButton && (
              <button
                onClick={onMenuClick}
                className="p-2 hover:bg-amber-50 rounded-lg md:hidden transition-colors"
              >
                <Menu className="w-5 h-5 text-amber-700" />
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 flex-shrink-0">
                <Image src="/logo.png" alt="Tuhanas" fill className="object-contain" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-black text-amber-800 text-sm leading-none">Tuhanas</span>
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-none mt-0.5">Kitchen & Scents</span>
              </div>
            </div>
          </div>

          {/* CENTER: Search (Minimalist) */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products or orders..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 border-none rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
              />
            </div>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-2 md:gap-4">

            {/* Shop Selector */}
            {shops.length > 0 && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                <MapPin className="w-3.5 h-3.5 text-blue-600 stroke-[2.5px]" />
                <select
                  value={selectedShop || ""}
                  onChange={handleShopChange}
                  disabled={userRole !== "admin"}
                  className="bg-transparent text-[13px] font-bold text-slate-700 outline-none cursor-pointer disabled:cursor-default"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* POS Shortcut */}
            <button
              onClick={() => navigate("/dashboard/pos")}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-amber-200 hover:bg-amber-600 transition-all active:scale-95"
            >
              <ShoppingCart size={14} className="stroke-[2.5px]" />
              <span className="hidden sm:inline">POS</span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative ml-1" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1 pl-1 pr-2 hover:bg-amber-50 rounded-xl transition-all border border-transparent hover:border-amber-200"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-lg flex items-center justify-center font-bold text-xs shadow-sm shadow-amber-200">
                  {userInitial}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-white shadow-xl rounded-2xl border border-slate-100 p-1.5 z-50 overflow-hidden"
                  >
                    <div className="px-3 py-3 border-b border-slate-50 mb-1">
                      <p className="font-bold text-slate-900 truncate">{fullName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{userRole}</p>
                    </div>

                    <div className="space-y-0.5">
                      <button
                        onClick={() => navigate("/dashboard/profile")}
                        className="flex items-center w-full px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-all"
                      >
                        <User className="w-4 h-4 mr-2.5" />
                        Profile
                      </button>
                      <button
                        onClick={() => navigate("/dashboard/settings")}
                        className="flex items-center w-full px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-all"
                      >
                        <Settings className="w-4 h-4 mr-2.5" />
                        Settings
                      </button>
                    </div>

                    <div className="mt-1 pt-1 border-t border-slate-50">
                      <button
                        onClick={() => {
                          localStorage.clear();
                          router.push("/");
                        }}
                        className="flex items-center w-full px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <LogOut className="w-4 h-4 mr-2.5" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
