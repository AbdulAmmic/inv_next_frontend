"use client";

import {
  Home,
  Folder,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  Menu,
  BarChart3,
  FileText,
  CreditCard,
  Package,
  ShoppingCart,
  DollarSign,
  QrCode,
  ClipboardList,
  LayoutDashboard,
  RefreshCw,
  ShieldAlert,
  Bell
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import SyncStatus from "./SyncStatus";
import BrandMark from "./BrandMark";
import { getBusinessName, clearCachedBusiness } from "@/businessTheme";
import { db } from "@/db";

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isOpen, isMobile, toggleSidebar }: SidebarProps) {
  const [role, setRole] = useState<string>("");
  const [businessName, setBusinessName] = useState("Inventory Manager");
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    // Same guard as the header's Sign Out — logging out clears the token
    // needed to push queued offline changes, so if we're offline right now
    // those changes have nowhere to go until this same account logs back
    // in. Block rather than risk stranding real sales/expenses.
    const pendingCount = await db.sync_queue.where("status").anyOf(["pending", "failed"]).count();
    if (pendingCount > 0 && !navigator.onLine) {
      toast.error(
        `${pendingCount} change${pendingCount === 1 ? "" : "s"} still need${pendingCount === 1 ? "s" : ""} to sync and you're offline. Connect to the internet first, or your unsynced data won't be saved.`,
        { duration: 6000 }
      );
      return;
    }
    clearCachedBusiness();
    localStorage.clear();
    router.push("/");
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setRole((parsed.role || "").toLowerCase());
      }
    } catch (err) {
      console.error("Failed to parse user:", err);
    }
    setBusinessName(getBusinessName());
  }, []);

  const allMenu = [
    { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
    { icon: Package, label: "Products", href: "/dashboard/products" },
    { icon: QrCode, label: "QR Labels", href: "/dashboard/products/labels" },
    { icon: DollarSign, label: "Stock", href: "/dashboard/stock" },
    { icon: Bell, label: "Alerts", href: "/dashboard/alerts" },
    { icon: ShieldAlert, label: "Grievances", href: "/dashboard/grievances", key: "grievances" },
    { icon: Folder, label: "Categories", href: "/dashboard/categories" },
    { icon: Users, label: "Customers", href: "/dashboard/customers" },
    { icon: BarChart3, label: "Finances", href: "/dashboard/finances", key: "finances" },
    { icon: FileText, label: "Suppliers", href: "/dashboard/suppliers" },
    { icon: ShoppingCart, label: "Sales", href: "/dashboard/sales" },
    { icon: CreditCard, label: "Out of Stock", href: "/dashboard/out-of-stock" },
    { icon: DollarSign, label: "Purchases", href: "/dashboard/purchases", key: "purchases" },
    { icon: DollarSign, label: "Expenses", href: "/dashboard/expenses", key: "expenses" },
    { icon: ClipboardList, label: "Audit Logs", href: "/dashboard/audit-logs", key: "audit-logs" },
    { icon: RefreshCw, label: "Sync Status", href: "/dashboard/sync" },
  ];

  const bottomMenu = [
    { icon: Settings, label: "Settings", href: "/dashboard/settings", key: "settings" },
    { icon: HelpCircle, label: "Help & Support", href: "/dashboard/help" },
    { icon: LogOut, label: "Logout", href: "/", isLogout: true },
  ];

  let allowedMenu = [...allMenu];
  let allowedBottom = [...bottomMenu];

  if (role === "staff") {
    allowedMenu = allMenu.filter(item =>
      ["Overview", "Products", "Stock", "Alerts", "Sales", "Grievances"].includes(item.label)
    );
    allowedBottom = bottomMenu.filter(item => item.label === "Logout");
  } else if (role === "subadmin") {
    allowedMenu = allowedMenu.filter(
      item => !["finances", "expenses"].includes(item.key || "")
    );
    allowedBottom = allowedBottom.filter(
      item => item.key !== "settings"
    );
  } else if (role === "manager") {
    allowedMenu = allowedMenu.filter(
      item => !["finances", "purchases"].includes(item.key || "")
    );
    allowedBottom = allowedBottom.filter(
      item => item.key !== "settings"
    );
  }

  // Ensure strict check for sensitive modules by role
  if (!["admin", "manager"].includes(role)) {
    allowedMenu = allowedMenu.filter(item => !["finances", "expenses", "audit-logs"].includes(item.key || ""));
  } else if (role === "manager") {
    allowedMenu = allowedMenu.filter(item => !["finances", "audit-logs"].includes(item.key || ""));
  }

  const NavLink = ({ item }: { item: any }) => {
    const isActive = pathname === item.href;
    return (
      <Link
        href={item.href}
        title={!isOpen ? item.label : undefined}
        onClick={item.isLogout ? (e) => { e.preventDefault(); handleSignOut(); } : undefined}
        className={`
          relative flex items-center group transition-colors duration-200 h-10 rounded-lg px-3
          ${isActive
            ? "bg-amber-50 text-amber-800"
            : item.isLogout
              ? "text-slate-500 hover:bg-rose-50 hover:text-rose-600"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}
          ${!isOpen ? "justify-center px-0" : ""}
        `}
      >
        <span
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-amber-500 transition-all duration-300 ${isActive ? "h-5 opacity-100" : "h-0 opacity-0"}`}
        />
        <item.icon
          className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${isActive ? "text-amber-600" : "text-slate-400 group-hover:text-slate-700"} ${isOpen ? "mr-3" : ""}`}
          strokeWidth={isActive ? 2.25 : 2}
        />
        {isOpen && <span className={`text-[13px] truncate ${isActive ? "font-bold" : "font-medium"}`}>{item.label}</span>}
      </Link>
    );
  };

  return (
    <>
      {isMobile && isOpen && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-40 lg:hidden animate-fade-in" onClick={toggleSidebar} />
      )}

      <aside
        className={`
            ${isMobile ? "fixed" : "relative"} top-0 left-0 z-40 h-screen
            flex flex-col bg-white border-r border-slate-100
            transition-[width,translate,box-shadow] duration-300 ease-smooth
            ${isMobile ? (isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full") : ""}
            ${isOpen ? "w-64" : "w-[76px]"}
          `}
      >
        {/* Brand */}
        <div className="h-[68px] flex items-center px-5 mb-2 border-b border-slate-100/80">
          <div className={`flex items-center transition-all duration-300 ${!isOpen ? "w-full justify-center" : ""}`}>
            {isOpen ? (
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 flex-shrink-0">
                  <BrandMark size={36} rounded="rounded-lg" />
                </div>
                <div className="overflow-hidden whitespace-nowrap">
                  <p className="text-sm font-black text-slate-800 truncate max-w-[140px]">{businessName}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.18em] leading-none mt-1">Management System</p>
                </div>
              </div>
            ) : (
              <div className="relative w-9 h-9">
                <BrandMark size={36} rounded="rounded-lg" />
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 px-3 pt-2 overflow-y-auto custom-scrollbar space-y-0.5 pb-6">
          <div className={`${isOpen ? 'px-2 mb-2' : 'hidden'}`}>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.16em]">General</p>
          </div>
          {allowedMenu.map((item, index) => (
            <NavLink key={index} item={item} />
          ))}

          {/* Sync Status - Mobile/Small Display */}
          <div className={`mt-4 ${!isOpen ? 'flex justify-center' : 'px-2'}`}>
             <SyncStatus />
          </div>
        </nav>

        {/* Footer Navigation */}
        <div className="px-3 py-4 border-t border-slate-100 gap-0.5 flex flex-col">
          <div className={`${isOpen ? 'px-2 mb-2' : 'hidden'}`}>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.16em]">Account</p>
          </div>
          {allowedBottom.map((item, index) => (
            <NavLink key={index} item={item} />
          ))}

          <button
            onClick={toggleSidebar}
            className="w-full mt-3 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors border border-slate-200"
          >
            {isOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </aside>
    </>
  );
}
