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
import { getShops, getStocks } from "@/apiCalls";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import SyncStatus from "./SyncStatus";
import BrandMark from "./BrandMark";
import { getBusinessName, clearCachedBusiness } from "@/businessTheme";

interface AlertSummaryItem {
  productName: string;
  detail: string;
  kind: "lowStock" | "outOfStock" | "expiringSoon" | "expired";
}

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export default function Header({ onMenuClick, showMenuButton = false }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [alertItems, setAlertItems] = useState<AlertSummaryItem[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [businessName, setBusinessName] = useState("Inventory Manager");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    }
    setBusinessName(getBusinessName());
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
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Low-stock / expiry alerts — loaded once per shop, popped up as a
  // toast the first time it's computed each session so staff notice it
  // without having to visit the Alerts page.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const shopId =
          typeof window !== "undefined" ? localStorage.getItem("selected_shop_id") || "" : "";
        const res = await getStocks(shopId);
        const stockRows: any[] = Array.isArray(res.data) ? res.data : [];

        const items: AlertSummaryItem[] = [];
        for (const s of stockRows) {
          if (s.status === "outOfStock") {
            items.push({ productName: s.productName, detail: "Out of stock", kind: "outOfStock" });
          } else if (s.status === "lowStock") {
            items.push({ productName: s.productName, detail: `Only ${s.currentStock} left`, kind: "lowStock" });
          }
          if (s.expiry_status === "expired") {
            items.push({ productName: s.productName, detail: `Expired ${s.nearest_expiry}`, kind: "expired" });
          } else if (s.expiry_status === "expiringSoon") {
            items.push({ productName: s.productName, detail: `Expires ${s.nearest_expiry}`, kind: "expiringSoon" });
          }
        }

        setAlertItems(items.slice(0, 8));
        setAlertCount(items.length);

        // Fire the popup toast once per browser session, not on every
        // dashboard navigation (header stays mounted across page changes).
        const shownKey = "tuhanas_alerts_toast_shown";
        if (items.length > 0 && !sessionStorage.getItem(shownKey)) {
          sessionStorage.setItem(shownKey, "1");
          const lowStock = items.filter((i) => i.kind === "lowStock" || i.kind === "outOfStock").length;
          const expiring = items.filter((i) => i.kind === "expiringSoon" || i.kind === "expired").length;
          const parts = [];
          if (lowStock) parts.push(`${lowStock} low/out-of-stock item${lowStock === 1 ? "" : "s"}`);
          if (expiring) parts.push(`${expiring} expiring/expired item${expiring === 1 ? "" : "s"}`);

          toast(
            (t) => (
              <div className="flex items-start gap-3">
                <span className="text-sm font-medium">⚠️ {parts.join(" and ")}. </span>
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    router.push("/dashboard/alerts");
                  }}
                  className="text-sm font-bold text-amber-600 underline whitespace-nowrap"
                >
                  View
                </button>
              </div>
            ),
            { duration: 8000 }
          );
        }
      } catch {
        // Silent — alerts are a convenience, not critical path.
      }
    };

    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShop]);

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
              <BrandMark size={32} rounded="rounded-lg" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-black text-slate-800 leading-none truncate max-w-[160px]">{businessName}</p>
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

            {/* Alerts Bell */}
            <div className="relative" ref={notifRef}>
              <motion.button
                onClick={() => setNotifOpen(!notifOpen)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="relative p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all"
                title="Stock alerts"
              >
                <Bell className="w-4 h-4 text-amber-600" />
                {alertCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-rose-500 text-white text-[9px] font-black rounded-full shadow-sm">
                    {alertCount > 99 ? "99+" : alertCount}
                  </span>
                )}
              </motion.button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 bg-white border border-amber-100 rounded-2xl shadow-2xl shadow-amber-100/50 overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 bg-gradient-to-br from-amber-50 to-orange-50 border-b border-amber-100 flex items-center justify-between">
                      <p className="font-black text-slate-900 text-sm">Stock Alerts</p>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full">
                        {alertCount}
                      </span>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {alertItems.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-slate-400 font-medium">
                          Nothing needs attention right now.
                        </p>
                      ) : (
                        alertItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0"
                          >
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                item.kind === "expired"
                                  ? "bg-rose-500"
                                  : item.kind === "outOfStock"
                                    ? "bg-rose-500"
                                    : "bg-amber-500"
                              }`}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{item.productName}</p>
                              <p className="text-[10px] text-slate-400">{item.detail}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-2 border-t border-slate-50">
                      <button
                        onClick={() => {
                          setNotifOpen(false);
                          router.push("/dashboard/alerts");
                        }}
                        className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-50 rounded-xl transition-all"
                      >
                        View all alerts
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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
                        onClick={() => { clearCachedBusiness(); localStorage.clear(); router.push("/"); }}
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
