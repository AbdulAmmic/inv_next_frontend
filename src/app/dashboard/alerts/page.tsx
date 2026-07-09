"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Package,
  AlertTriangle,
  Search,
  RefreshCw,
  Clock,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { getStocks } from "@/apiCalls";
import { toast } from "react-hot-toast";
import Loader from "@/components/Loader";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface AlertRow {
  id: string;
  product_id: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  status: string;
  shelfLocation: string;
  nearestExpiry: string | null;
  expiryStatus: "expired" | "expiringSoon" | "ok" | null;
}

type Tab = "all" | "lowStock" | "expiringSoon" | "expired";

export default function AlertsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  const selectedShopId =
    typeof window !== "undefined"
      ? localStorage.getItem("selected_shop_id") || ""
      : "";

  const fetchData = async () => {
    try {
      if (rows.length === 0) setLoading(true);
      else setRefreshing(true);

      const res = await getStocks(selectedShopId);
      const apiRows = Array.isArray(res.data) ? res.data : [];

      const mapped: AlertRow[] = apiRows.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        productName: item.productName || "Unknown Product",
        sku: item.sku || "N/A",
        category: item.category || "Uncategorized",
        currentStock: item.currentStock ?? 0,
        minStockLevel: item.minStockLevel ?? 0,
        status: item.status || "inStock",
        shelfLocation: item.shelf_location || "",
        nearestExpiry: item.nearest_expiry ?? null,
        expiryStatus: item.expiry_status ?? null,
      }));

      // Only rows that actually need attention.
      const alerts = mapped.filter(
        (r) =>
          r.status === "lowStock" ||
          r.status === "outOfStock" ||
          r.expiryStatus === "expiringSoon" ||
          r.expiryStatus === "expired"
      );

      setRows(alerts);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowStockRows = useMemo(
    () => rows.filter((r) => r.status === "lowStock" || r.status === "outOfStock"),
    [rows]
  );
  const expiringSoonRows = useMemo(
    () => rows.filter((r) => r.expiryStatus === "expiringSoon"),
    [rows]
  );
  const expiredRows = useMemo(
    () => rows.filter((r) => r.expiryStatus === "expired"),
    [rows]
  );

  const tabRows: Record<Tab, AlertRow[]> = {
    all: rows,
    lowStock: lowStockRows,
    expiringSoon: expiringSoonRows,
    expired: expiredRows,
  };

  const filteredRows = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    const list = tabRows[tab];
    if (!term) return list;
    return list.filter(
      (r) =>
        r.productName.toLowerCase().includes(term) ||
        r.sku.toLowerCase().includes(term) ||
        r.category.toLowerCase().includes(term) ||
        r.shelfLocation.toLowerCase().includes(term) ||
        (r.nearestExpiry || "").toLowerCase().includes(term)
    );
  }, [tabRows, tab, searchQuery]);

  const tabs: { key: Tab; label: string; count: number; icon: any }[] = [
    { key: "all", label: "All Alerts", count: rows.length, icon: AlertTriangle },
    { key: "lowStock", label: "Low / Out of Stock", count: lowStockRows.length, icon: Package },
    { key: "expiringSoon", label: "Expiring Soon", count: expiringSoonRows.length, icon: Clock },
    { key: "expired", label: "Expired", count: expiredRows.length, icon: XCircle },
  ];

  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader text="Scanning inventory..." subText="Checking stock levels and batch expiry dates" />
      </div>
    );
  }

  return (
    <main className="p-6 lg:p-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full text-[10px] font-bold uppercase tracking-wider italic">
              Needs Attention
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Stock Alerts
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Low stock and expiring items, all in one place
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </motion.div>
      </div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-3"
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
                active
                  ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-4 rounded-[1.5rem] flex items-center shadow-xl shadow-slate-200/50 group"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-600 transition-colors w-5 h-5" />
          <input
            type="text"
            placeholder="Search by product name, shelf address, or expiry date (YYYY-MM-DD)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-100 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-300 transition-all font-medium text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </motion.div>

      {/* Table */}
      <AnimatePresence mode="wait">
        {filteredRows.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card rounded-[2.5rem] p-20 text-center flex flex-col items-center border border-white shadow-xl shadow-slate-200/50"
          >
            <div className="w-24 h-24 bg-emerald-50 rounded-[3rem] flex items-center justify-center mb-8">
              <Package className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">All Clear!</h2>
            <p className="text-slate-500 max-w-sm mx-auto mt-3 font-medium text-lg leading-relaxed">
              No items in this view need attention right now.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Product</th>
                    <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Shelf</th>
                    <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-center">Quantity</th>
                    <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Stock Status</th>
                    <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Expiry</th>
                    <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <AnimatePresence mode="popLayout">
                    {filteredRows.map((row, idx) => (
                      <motion.tr
                        layout
                        key={row.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="hover:bg-amber-50/20 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{row.productName}</div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            SKU: {row.sku} · {row.category}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-bold text-slate-600">
                            {row.shelfLocation || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-extrabold text-slate-900">{row.currentStock}</span>
                          <span className="text-[10px] text-slate-400 font-bold ml-1">/ min {row.minStockLevel}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              row.status === "outOfStock"
                                ? "bg-rose-100 text-rose-700"
                                : row.status === "lowStock"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {row.nearestExpiry ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                row.expiryStatus === "expired"
                                  ? "bg-rose-100 text-rose-700"
                                  : row.expiryStatus === "expiringSoon"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {row.nearestExpiry}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold italic">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => router.push("/dashboard/stock")}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-600 transition-all active:scale-95"
                          >
                            Manage
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
