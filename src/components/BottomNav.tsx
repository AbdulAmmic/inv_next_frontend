"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Boxes, ShoppingCart, Receipt, Menu, Package, Bell } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";

type Tab = { href: string; label: string; icon: any; match?: (p: string) => boolean };

/**
 * Phone/tablet bottom navigation (hidden from lg up, where the sidebar is
 * always visible). Four destinations plus a raised POS button in the middle;
 * "More" opens the full sidebar menu.
 */
export default function BottomNav({ onMore, hidden }: { onMore: () => void; hidden?: boolean }) {
  const pathname = usePathname();
  const [role, setRole] = useState("");

  useEffect(() => {
    try { setRole((JSON.parse(localStorage.getItem("user") || "{}").role || "").toLowerCase()); } catch { /* none */ }
  }, []);

  // Products is staff's second tab; managers/admins get Stock + Alerts badge
  const alerts = useLiveQuery(async () => {
    const stocks = await db.stocks.filter((s: any) => !s.is_deleted).toArray();
    return stocks.filter((s: any) => Number(s.quantity ?? 0) <= Number(s.min_quantity ?? 0)).length;
  }, [], 0) ?? 0;

  const left: Tab[] = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard, match: (p) => p === "/dashboard" },
    role === "staff"
      ? { href: "/dashboard/products", label: "Products", icon: Package, match: (p) => p.startsWith("/dashboard/products") }
      : { href: "/dashboard/stock", label: "Stock", icon: Boxes, match: (p) => p.startsWith("/dashboard/stock") },
  ];
  const right: Tab[] = [
    { href: "/dashboard/sales", label: "Sales", icon: Receipt, match: (p) => p.startsWith("/dashboard/sales") },
  ];

  if (hidden) return null;

  const isActive = (t: Tab) => (t.match ? t.match(pathname) : pathname === t.href);

  const TabLink = ({ t, badge }: { t: Tab; badge?: number }) => {
    const active = isActive(t);
    return (
      <Link href={t.href} className="relative flex-1 flex flex-col items-center justify-center gap-0.5 h-full select-none" aria-current={active ? "page" : undefined}>
        <span className="relative flex items-center justify-center w-12 h-7">
          {active && (
            <motion.span
              layoutId="bottomnav-pill"
              className="absolute inset-0 rounded-full bg-amber-100"
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            />
          )}
          <t.icon className={`relative w-[19px] h-[19px] transition-colors ${active ? "text-amber-700" : "text-slate-400"}`} strokeWidth={active ? 2.3 : 1.9} />
          {!!badge && (
            <span className="absolute -top-0.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </span>
        <span className={`text-[10.5px] leading-none transition-colors ${active ? "font-semibold text-slate-900" : "font-medium text-slate-500"}`}>{t.label}</span>
      </Link>
    );
  };

  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main"
    >
      <div className="pointer-events-auto mx-3 mb-3 relative">
        <div className="h-[62px] rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_10px_30px_-10px_rgba(26,18,8,0.25)] flex items-stretch px-1">
          {left.map((t) => <TabLink key={t.href} t={t} />)}

          {/* Raised POS button */}
          <div className="flex-1 flex justify-center">
            <Link
              href="/dashboard/pos"
              className="-mt-5 flex flex-col items-center gap-1 group"
              aria-label="Open POS"
            >
              <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-600/30 ring-4 ring-[var(--background)] group-active:scale-95 transition-transform">
                <ShoppingCart className="w-6 h-6" strokeWidth={2.2} />
              </span>
              <span className="text-[10.5px] font-semibold text-slate-700 leading-none">Sell</span>
            </Link>
          </div>

          {right.map((t) => <TabLink key={t.href} t={t} />)}
          {role === "staff" ? (
            <TabLink t={{ href: "/dashboard/alerts", label: "Alerts", icon: Bell, match: (p) => p.startsWith("/dashboard/alerts") }} badge={alerts} />
          ) : (
            <button onClick={onMore} className="relative flex-1 flex flex-col items-center justify-center gap-0.5 h-full select-none">
              <span className="relative flex items-center justify-center w-12 h-7">
                <Menu className="w-[19px] h-[19px] text-slate-400" strokeWidth={1.9} />
                {!!alerts && <span className="absolute top-0 right-2.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />}
              </span>
              <span className="text-[10.5px] font-medium leading-none text-slate-500">More</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
