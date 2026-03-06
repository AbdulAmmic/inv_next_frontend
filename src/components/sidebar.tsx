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
  LayoutDashboard
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isOpen, isMobile, toggleSidebar }: SidebarProps) {
  const [role, setRole] = useState<string>("");
  const pathname = usePathname();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setRole(parsed.role || "");
      }
    } catch (err) {
      console.error("Failed to parse user:", err);
    }
  }, []);

  const allMenu = [
    { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
    { icon: Package, label: "Products", href: "/dashboard/products" },
    { icon: QrCode, label: "QR Labels", href: "/dashboard/products/labels" },
    { icon: DollarSign, label: "Stock", href: "/dashboard/stock" },
    { icon: Folder, label: "Categories", href: "/dashboard/categories" },
    { icon: Users, label: "Customers", href: "/dashboard/customers" },
    { icon: BarChart3, label: "Finances", href: "/dashboard/finances", key: "finances" },
    { icon: FileText, label: "Suppliers", href: "/dashboard/suppliers" },
    { icon: ShoppingCart, label: "Sales", href: "/dashboard/sales" },
    { icon: CreditCard, label: "Out of Stock", href: "/dashboard/out-of-stock" },
    { icon: DollarSign, label: "Purchases", href: "/dashboard/purchases", key: "purchases" },
    { icon: DollarSign, label: "Expenses", href: "/dashboard/expenses", key: "expenses" },
    { icon: ClipboardList, label: "Audit Logs", href: "/dashboard/audit-logs", key: "audit-logs" },
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
      ["Overview", "Products", "Stock", "Sales"].includes(item.label)
    );
    allowedBottom = bottomMenu.filter(item => item.label === "Logout");
  }

  if (role === "subadmin") {
    allowedMenu = allowedMenu.filter(
      item => item.key !== "finances" && item.key !== "expenses" && item.key !== "purchases"
    );
    allowedBottom = allowedBottom.filter(
      item => item.key !== "settings"
    );
  }

  if (role === "manager") {
    allowedMenu = allowedMenu.filter(item => item.key !== "finances");
    allowedBottom = allowedBottom.filter(item => item.key !== "settings");
  }

  if (role !== "admin") {
    allowedMenu = allowedMenu.filter(item => item.key !== "audit-logs");
  }

  const NavLink = ({ item }: { item: any }) => {
    const isActive = pathname === item.href;
    return (
      <Link
        href={item.href}
        className={`
          flex items-center group transition-all duration-200 py-3 rounded-2xl px-4 mb-1
          ${isActive
            ? "bg-amber-500 text-white shadow-lg shadow-amber-200"
            : "text-slate-500 hover:bg-amber-50 hover:text-amber-800"}
          ${!isOpen ? "justify-center px-0" : ""}
        `}
      >
        <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isOpen ? "mr-4" : ""}`} />
        {isOpen && <span className="font-semibold text-sm">{item.label}</span>}
        {!isOpen && isActive && (
          <div className="absolute left-0 w-1 h-6 bg-amber-500 rounded-r-full" />
        )}
      </Link>
    );
  };

  return (
    <>
      {isMobile && isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden" onClick={toggleSidebar} />
      )}

      <aside
        className={`
            ${isMobile ? "fixed" : "relative"} top-0 left-0 z-40 h-screen
            flex flex-col bg-white border-r border-slate-100
            transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
            ${isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : ""}
            ${isOpen ? "w-72" : "w-24"}
          `}
      >
        {/* Brand */}
        <div className="h-20 flex items-center px-5 mb-4">
          <div className={`flex items-center transition-all duration-300 ${!isOpen ? "w-full justify-center" : ""}`}>
            {isOpen ? (
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 flex-shrink-0">
                  <Image src="/logo.png" alt="Tuhanas Logo" fill className="object-contain" />
                </div>
                <div className="overflow-hidden whitespace-nowrap">
                  <Image src="/logo_tuhanas.png" alt="Tuhanas" width={120} height={28} className="object-contain h-6 w-auto" />
                  <p className="text-[9px] text-amber-700 font-black uppercase tracking-[0.2em] leading-none mt-0.5">Management System</p>
                </div>
              </div>
            ) : (
              <div className="relative w-10 h-10">
                <Image src="/logo.png" alt="Tuhanas" fill className="object-contain" />
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar space-y-1 pb-6">
          <div className={`${isOpen ? 'px-2 mb-2' : 'hidden'}`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">General</p>
          </div>
          {allowedMenu.map((item, index) => (
            <NavLink key={index} item={item} />
          ))}
        </nav>

        {/* Footer Navigation */}
        <div className="px-4 py-6 border-t border-slate-50 gap-1 flex flex-col">
          <div className={`${isOpen ? 'px-2 mb-2' : 'hidden'}`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Account</p>
          </div>
          {allowedBottom.map((item, index) => (
            <NavLink key={index} item={item} />
          ))}

          <button
            onClick={toggleSidebar}
            className="w-full mt-4 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 hover:text-amber-800 hover:bg-amber-100 transition-all border border-amber-100"
          >
            {isOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </aside>
    </>
  );
}
