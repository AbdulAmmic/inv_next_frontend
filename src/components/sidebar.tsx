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
  QrCode
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isOpen, isMobile, toggleSidebar }: SidebarProps) {
  const [role, setRole] = useState<string>("");

  // Load user role correctly ✔ FIXED
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

  // ALL possible menu items
  const allMenu = [
    { icon: Home, label: "Dashboard", href: "/dashboard" },
    { icon: Package, label: "Products", href: "/dashboard/products" },
    { icon: QrCode, label: "QR Labels", href: "/dashboard/products/labels" },
    { icon: DollarSign, label: "Stock", href: "/dashboard/stock" },
    { icon: Folder, label: "Categories", href: "/dashboard/categories" },
    { icon: Users, label: "Customers", href: "/dashboard/customers" },
    { icon: BarChart3, label: "Finances", href: "/dashboard/finances", key: "finances" },
    { icon: FileText, label: "Suppliers", href: "/dashboard/suppliers" },
    { icon: ShoppingCart, label: "Sales", href: "/dashboard/sales" },
    { icon: CreditCard, label: "Out of Stock", href: "/dashboard/out-of-stock" },
    { icon: DollarSign, label: "Purchases", href: "/dashboard/purchases" },
    { icon: DollarSign, label: "Expenses", href: "/dashboard/expenses", key: "expenses" },
  ];

  const bottomMenu = [
    { icon: Settings, label: "Settings", href: "/dashboard/settings", key: "settings" },
    { icon: HelpCircle, label: "Help & Support", href: "/dashboard/help" },
    { icon: LogOut, label: "Logout", href: "/logout" },
  ];

  // ROLE-BASED FILTERING
  let allowedMenu = [...allMenu];
  let allowedBottom = [...bottomMenu];

  if (role === "staff") {
    allowedMenu = []; // staff sees NOTHING
    allowedBottom = [];
  }

  if (role === "subadmin") {
    allowedMenu = allowedMenu.filter(
      item => item.key !== "finances" && item.key !== "expenses"
    );
    allowedBottom = allowedBottom.filter(
      item => item.key !== "settings"
    );
  }

  if (role === "manager") {
    allowedMenu = allowedMenu.filter(
      item => item.key !== "finances" // manager can see expenses but NOT finances
    );
    allowedBottom = allowedBottom.filter(
      item => item.key !== "settings"
    );
  }

  // Admin sees everything — no filters

  return (
    <>
      {isMobile && isOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={toggleSidebar} />
      )}

      <aside
        className={`
            ${isMobile ? "fixed" : "relative"} top-0 left-0 z-40 h-screen
            flex flex-col bg-white border-r border-gray-200
            transition-all duration-300 ease-in-out
            ${isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : ""}
            ${isOpen ? "w-64" : "w-20"}
          `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {isOpen && (
            <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Tuhanas
            </div>
          )}
          <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-gray-100">
            {isOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* MAIN MENU */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {allowedMenu.length === 0 ? (
            <p className="text-center text-gray-400 text-sm">No access</p>
          ) : (
            allowedMenu.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="flex items-center rounded-lg px-3 py-3 text-sm text-gray-700 hover:bg-gray-100"
              >
                <item.icon className={`w-5 h-5 ${isOpen ? "mr-3" : ""}`} />
                {isOpen && <span>{item.label}</span>}
              </Link>
            ))
          )}
        </nav>

        {/* BOTTOM MENU */}
        <div className="p-3 border-t border-gray-200">
          {allowedBottom.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="flex items-center rounded-lg px-3 py-3 text-sm text-gray-700 hover:bg-gray-100"
            >
              <item.icon className={`w-5 h-5 ${isOpen ? "mr-3" : ""}`} />
              {isOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </div>
      </aside>

      {isMobile && !isOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed bottom-4 left-4 z-40 p-3 bg-white rounded-full shadow-lg md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
