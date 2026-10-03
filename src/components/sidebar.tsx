"use client";

import {
  Settings,
  HelpCircle,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  BarChart3,
  Package,
  ShoppingCart,
  Barcode,
  ClipboardList,
  LayoutDashboard,
  RefreshCw,
  ShieldAlert,
  Bell,
  Boxes,
  Tags,
  Users,
  Truck,
  PackageX,
  ShoppingBag,
  Receipt,
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

const GROUP_ORDER = ["", "Inventory", "Sales", "Purchasing", "Finance", "System"];

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
    { icon: LayoutDashboard, label: "Overview", href: "/dashboard", group: "" },
    { icon: Package, label: "Products", href: "/dashboard/products", group: "Inventory" },
    { icon: Boxes, label: "Stock", href: "/dashboard/stock", group: "Inventory" },
    { icon: Bell, label: "Alerts", href: "/dashboard/alerts", group: "Inventory" },
    { icon: PackageX, label: "Out of Stock", href: "/dashboard/out-of-stock", group: "Inventory" },
    { icon: Tags, label: "Categories", href: "/dashboard/categories", group: "Inventory" },
    { icon: Barcode, label: "Barcode Labels", href: "/dashboard/products/labels", group: "Inventory" },
    { icon: ShoppingCart, label: "Sales", href: "/dashboard/sales", group: "Sales" },
    { icon: Users, label: "Customers", href: "/dashboard/customers", group: "Sales" },
    { icon: ShoppingBag, label: "Purchases", href: "/dashboard/purchases", key: "purchases", group: "Purchasing" },
    { icon: Truck, label: "Suppliers", href: "/dashboard/suppliers", group: "Purchasing" },
    { icon: BarChart3, label: "Finances", href: "/dashboard/finances", key: "finances", group: "Finance" },
    { icon: Receipt, label: "Expenses", href: "/dashboard/expenses", key: "expenses", group: "Finance" },
    { icon: ShieldAlert, label: "Grievances", href: "/dashboard/grievances", key: "grievances", group: "System" },
    { icon: ClipboardList, label: "Audit Logs", href: "/dashboard/audit-logs", key: "audit-logs", group: "System" },
    { icon: RefreshCw, label: "Sync Status", href: "/dashboard/sync", group: "System" },
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

  const groups = GROUP_ORDER
    .map((name) => ({ name, items: allowedMenu.filter((i) => i.group === name) }))
    .filter((g) => g.items.length > 0);

  const NavLink = ({ item }: { item: any }) => {
    const isActive = pathname === item.href;
    return (
      <Link
        href={item.href}
        title={!isOpen ? item.label : undefined}
        onClick={(e) => {
          if (item.isLogout) {
            e.preventDefault();
            handleSignOut();
          } else if (isMobile) {
            toggleSidebar();
          }
        }}
        className={`
          relative flex items-center group h-9 rounded-md px-2.5 transition-colors duration-150
          ${isActive
            ? "bg-slate-100 text-slate-900"
            : item.isLogout
              ? "text-slate-500 hover:bg-rose-50 hover:text-rose-600"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}
          ${!isOpen ? "justify-center px-0" : ""}
        `}
      >
        <span
          className={`absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-amber-500 transition-all duration-300 ${isActive ? "h-5 opacity-100" : "h-0 opacity-0"}`}
        />
        <item.icon
          className={`w-[17px] h-[17px] flex-shrink-0 transition-colors ${isActive ? "text-amber-600" : "text-slate-400 group-hover:text-slate-600"} ${isOpen ? "mr-3" : ""}`}
          strokeWidth={isActive ? 2.2 : 1.9}
        />
        {isOpen && <span className={`text-[13px] truncate ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>}
      </Link>
    );
  };

  return (
    <>
      {isMobile && isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 lg:hidden animate-fade-in" onClick={toggleSidebar} />
      )}

      <aside
        className={`
            ${isMobile ? "fixed" : "relative"} top-0 left-0 z-40 h-screen
            flex flex-col bg-white border-r border-slate-200/80
            transition-[width,translate] duration-300 ease-smooth
            ${isMobile ? (isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full") : ""}
            ${isOpen ? "w-60" : "w-[68px]"}
          `}
      >
        {/* Brand */}
        <div className={`relative h-16 flex items-center ${isOpen ? "px-4" : "justify-center"}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-8 h-8 flex-shrink-0 rounded-lg overflow-hidden">
              <BrandMark size={32} rounded="rounded-lg" />
            </div>
            {isOpen && (
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-900 truncate max-w-[150px] leading-tight">{businessName}</p>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Inventory</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 px-3 pt-2 pb-4 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {groups.map((g) => (
            <div key={g.name || "main"} className={g.name ? "mt-5" : ""}>
              {g.name && (
                isOpen ? (
                  <p className="px-2.5 mb-1.5 text-[11px] font-medium text-slate-400">{g.name}</p>
                ) : (
                  <div className="mx-auto mb-2 w-5 h-px bg-slate-200" />
                )
              )}
              <div className="space-y-0.5">
                {g.items.map((item) => <NavLink key={item.href} item={item} />)}
              </div>
            </div>
          ))}

          {isOpen && (
            <div className="mt-6 lg:hidden">
              <SyncStatus />
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="relative px-3 py-3 border-t border-slate-100 space-y-0.5">
          {allowedBottom.map((item) => <NavLink key={item.href + item.label} item={item} />)}

          {!isMobile && (
            <button
              onClick={toggleSidebar}
              className={`mt-2 w-full h-8 rounded-md flex items-center gap-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors ${isOpen ? "px-2.5" : "justify-center"}`}
              title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isOpen ? <><ChevronsLeft size={16} /> Collapse</> : <ChevronsRight size={16} />}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
