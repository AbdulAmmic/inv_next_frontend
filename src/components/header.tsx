"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Settings,
  LogOut,
  User,
  Menu,
  ShoppingCart,
  ChevronRight,
  Bell,
  Search,
  Store,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { getShops } from "@/apiCalls";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import SyncStatus from "./SyncStatus";
import logoImg from "../../public/logo.png";
import logoTuhanasImg from "../../public/logo_tuhanas.png";

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export default function Header({ onMenuClick, showMenuButton = false }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const profileRef = useRef<HTMLDivElement>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    }
  }, []);

  const fullName = user?.full_name || "User";
  const userEmail = user?.email || "—";
  const userRole = user?.role || "staff";
  const userShopId = user?.shop_id || null;
  const initial = fullName.charAt(0).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("selected_shop_id");
    if (userRole === "admin" || userRole === "subadmin") {
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
        setSelectedShop(res.data[0].id);
        localStorage.setItem("selected_shop_id", res.data[0].id);
      }
    } catch { }
  };

  const handleShopChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedShop(id);
    localStorage.setItem("selected_shop_id", id);
    window.location.reload();
  };

  const navigate = (path: string) => {
    router.push(path);
    setProfileOpen(false);
  };

  const currentShopName = shops.find(s => s.id === selectedShop)?.name || "All Shops";

  return (
    <div className="sticky top-0 z-40 px-3 pt-3 pb-1">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-white border border-amber-100 rounded-2xl shadow-lg shadow-amber-50/80 overflow-visible"
      >
        <div className="px-4 h-[60px] flex items-center gap-3">

          {/* Mobile menu button */}
          {showMenuButton && (
            <button
              onClick={onMenuClick}
              className="p-2 rounded-xl hover:bg-amber-50 transition-colors md:hidden flex-shrink-0"
            >
              <Menu className="w-5 h-5 text-amber-600" />
            </button>
          )}

          {/* LEFT: Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative w-8 h-8">
              <Image src={logoImg} alt="Tuhanas" fill className="object-contain" />
            </div>
            <div className="hidden sm:block">
              <div className="relative h-5 w-[100px]">
                <Image src={logoTuhanasImg} alt="Tuhanas" fill className="object-contain object-left" />
              </div>
              <p className="text-[9px] font-black text-amber-500 uppercase tracking-[0.18em] leading-none -mt-0.5">
                Kitchen & Scents
              </p>
            </div>
          </div>

          {/* DIVIDER */}
          <div className="hidden sm:block w-px h-6 bg-amber-100 mx-1 flex-shrink-0" />

          {/* CENTER: Shop Selector Pill */}
          {shops.length > 0 && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200/70 rounded-xl flex-shrink-0">
              <Store className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <select
                value={selectedShop || ""}
                onChange={handleShopChange}
                disabled={userRole !== "admin" && userRole !== "subadmin"}
                className="bg-transparent text-xs font-bold text-amber-800 outline-none cursor-pointer disabled:cursor-default max-w-[120px] truncate"
              >
                {shops.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* SPACER */}
          <div className="flex-1" />

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <SyncStatus />
            </div>

            {/* POS Button */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate("/dashboard/pos")}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 text-white rounded-xl text-xs font-black shadow-md shadow-amber-200 hover:from-amber-600 hover:to-amber-500 transition-all"
            >
              <ShoppingCart size={13} className="stroke-[2.5px]" />
              POS Terminal
            </motion.button>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <motion.button
                onClick={() => setProfileOpen(!profileOpen)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all"
              >
                <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-lg flex items-center justify-center font-black text-xs shadow-sm shadow-amber-200">
                  {initial}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-black text-slate-800 leading-none">{fullName.split(" ")[0]}</p>
                  <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider leading-none mt-0.5">{userRole}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-amber-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </motion.button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-60 bg-white border border-amber-100 rounded-2xl shadow-2xl shadow-amber-100/50 overflow-hidden z-50"
                  >
                    {/* Profile Header */}
                    <div className="px-4 py-4 bg-gradient-to-br from-amber-50 to-orange-50 border-b border-amber-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-md shadow-amber-200">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 text-sm truncate">{fullName}</p>
                          <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-wider rounded-full">
                            {userRole}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2 space-y-0.5">
                      <button
                        onClick={() => navigate("/dashboard/pos")}
                        className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition-all group"
                      >
                        <div className="flex items-center gap-2.5">
                          <ShoppingCart className="w-4 h-4" />
                          POS Terminal
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <button
                        onClick={() => navigate("/dashboard/settings")}
                        className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition-all group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Settings className="w-4 h-4" />
                          Settings
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </div>

                    {/* Sign Out */}
                    <div className="p-2 pt-0 border-t border-slate-50">
                      <button
                        onClick={() => { localStorage.clear(); router.push("/"); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.header>
    </div>
  );
}
