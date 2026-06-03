"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Loader from "@/components/Loader";
import { getFullStats, getShops } from "@/apiCalls";
import {
  Package,
  Users,
  Truck,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ShoppingCart,
  RefreshCw,
  ChevronDown,
  ArrowUpRight,
  Wifi,
  WifiOff,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [role, setRole] = useState<string>("");
  const [selectedShop, setSelectedShop] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const currentShopRef = useRef<string>("");

  // ── Load shops ──
  const loadShops = useCallback(async (resolvedRole: string, userShopId?: string) => {
    try {
      const res = await getShops();
      const shopsData = Array.isArray(res.data) ? res.data : [];
      setShops(shopsData);

      if (shopsData.length === 0) {
        if (resolvedRole === "admin" || resolvedRole === "subadmin") {
          setSelectedShop("");
          currentShopRef.current = "";
        } else {
          setError("No shops available yet. Please create a shop first.");
          setLoading(false);
        }
        return;
      }

      const currentSaved = localStorage.getItem("selected_shop_id");
      const isPrivileged =
        resolvedRole === "admin" || resolvedRole === "subadmin";

      if (!isPrivileged) {
        const preferredShop = userShopId || currentSaved || shopsData[0].id;
        setSelectedShop(preferredShop);
        currentShopRef.current = preferredShop;
        localStorage.setItem("selected_shop_id", preferredShop);
        return;
      }

      if (currentSaved && shopsData.some((s: any) => s.id === currentSaved)) {
        setSelectedShop(currentSaved);
        currentShopRef.current = currentSaved;
      } else {
        const firstShop = shopsData[0].id;
        setSelectedShop(firstShop);
        currentShopRef.current = firstShop;
        localStorage.setItem("selected_shop_id", firstShop);
      }
    } catch (err) {
      console.error("Shop load failed", err);
      setError("Failed to load shops.");
      setLoading(false);
    }
  }, []);

  // ── Load stats ── (never clears existing stats while refreshing)
  const loadStats = useCallback(
    async (shopId: string, silent = false) => {
      try {
        if (!silent) setError(null);
        setIsOfflineData(false);

        const res = await getFullStats({ shop_id: shopId });
        setStats(res.data);
        setLastRefreshed(new Date());

        if (typeof window !== "undefined" && !navigator.onLine) {
          setIsOfflineData(true);
        }
      } catch (err: any) {
        console.error("Dashboard Stats Error, falling back to local database:", err);
        try {
          const { buildLocalStats } = await import("@/apiCalls");
          const local = await buildLocalStats(shopId);
          setStats(local);
          setIsOfflineData(true);
          setLastRefreshed(new Date());
        } catch (fallbackErr) {
          if (!silent) setError("Failed to load dashboard statistics.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // ── Initial load ──
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const parsed = savedUser ? JSON.parse(savedUser) : null;
    const resolvedRole = (parsed?.role || "").toLowerCase();
    const userShopId = parsed?.shop_id || "";
    setRole(resolvedRole);
    loadShops(resolvedRole, userShopId);
  }, [loadShops]);

  // ── Load stats when shop changes ──
  useEffect(() => {
    if (selectedShop !== undefined && selectedShop !== null) {
      currentShopRef.current = selectedShop;
      loadStats(selectedShop);
    } else if (shops.length > 0) {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShop]);

  // ── Auto-refresh after background sync completes ──
  useEffect(() => {
    const handleSyncComplete = () => {
      const shopId = currentShopRef.current;
      // Silent refresh — don't show loading spinner, keep current stats visible
      setRefreshing(true);
      loadStats(shopId, true).catch(() => setRefreshing(false));
    };

    window.addEventListener("tuhanas:bg-sync-complete", handleSyncComplete);
    window.addEventListener("tuhanas:pull-complete", handleSyncComplete);

    return () => {
      window.removeEventListener("tuhanas:bg-sync-complete", handleSyncComplete);
      window.removeEventListener("tuhanas:pull-complete", handleSyncComplete);
    };
  }, [loadStats]);

  // ── Manual refresh ──
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadStats(currentShopRef.current || "").then(() => {
      toast.success("Dashboard updated", { duration: 1500 });
    });
  }, [loadStats]);

  const formatCurrency = (n: number | undefined | null) => {
    if (role !== "admin" && role !== "subadmin") return "₦******";
    return "₦" + Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Show full-page loader only on very first load with no cached stats
  if (loading && !stats && !error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader text="Loading dashboard data..." />
      </div>
    );
  }

  // Always have safe fallback values — never crash on undefined
  const safeStats = {
    products_count: 0,
    customers_count: 0,
    suppliers_count: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    total_sales_amount: 0,
    total_sales_count: 0,
    gross_profit: 0,
    net_profit: 0,
    total_expenses: 0,
    total_purchase_amount: 0,
    inventory_cost_value: 0,
    inventory_selling_value: 0,
    ...stats,
  };

  return (
    <>
      <main className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 text-sm font-medium mt-0.5">
              Overview of your business performance
              {lastRefreshed && (
                <span className="ml-2 text-slate-400">
                  · Updated {lastRefreshed.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Online/Offline indicator */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold ${
              isOfflineData
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}>
              {isOfflineData ? (
                <WifiOff className="w-3 h-3" />
              ) : (
                <Wifi className="w-3 h-3" />
              )}
              {isOfflineData ? "Cached" : "Live"}
            </div>

            {/* Shop selector — admin/subadmin only */}
            {(role === "admin" || role === "subadmin") && shops.length > 0 && (
              <div className="relative">
                <select
                  value={selectedShop}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedShop(v);
                    currentShopRef.current = v;
                    localStorage.setItem("selected_shop_id", v);
                  }}
                  className="appearance-none bg-white border border-slate-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer min-w-[180px]"
                >
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              </div>
            )}

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-all disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Offline data notice */}
        {isOfflineData && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm font-semibold flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
            <span>
              Showing locally cached statistics. Stats will update automatically when internet is available.
            </span>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Products"
            value={safeStats.products_count}
            icon={<Package className="w-5 h-5" />}
            color="blue"
          />
          <MetricCard
            title="Customers"
            value={safeStats.customers_count}
            icon={<Users className="w-5 h-5" />}
            color="emerald"
          />
          <MetricCard
            title="Suppliers"
            value={safeStats.suppliers_count}
            icon={<Truck className="w-5 h-5" />}
            color="indigo"
          />
          <MetricCard
            title="Low Stock"
            value={safeStats.low_stock_count}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="rose"
            isAlert={safeStats.low_stock_count > 0}
            subtitle={
              safeStats.out_of_stock_count > 0
                ? `${safeStats.out_of_stock_count} out of stock`
                : undefined
            }
          />
        </div>

        {/* Financial Overview — Admin/Manager only */}
        {(role === "admin" || role === "subadmin" || role === "manager") && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Financial Performance</h2>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOfflineData ? "bg-amber-400" : "bg-emerald-500"
                  }`}
                />
                {isOfflineData ? "Cached Data" : "Live Data"}
              </div>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <FinancialCard
                label="Total Sales"
                value={formatCurrency(safeStats.total_sales_amount)}
                subLabel={`${safeStats.total_sales_count} transactions`}
                icon={<ShoppingCart className="w-3.5 h-3.5" />}
                trend="neutral"
              />
              <FinancialCard
                label="Gross Profit"
                value={formatCurrency(safeStats.gross_profit)}
                subLabel={
                  safeStats.total_sales_amount > 0
                    ? `${((safeStats.gross_profit / safeStats.total_sales_amount) * 100).toFixed(1)}% margin`
                    : "0% margin"
                }
                icon={<BarChart3 className="w-3.5 h-3.5" />}
                trend={safeStats.gross_profit >= 0 ? "up" : "down"}
              />
              <FinancialCard
                label="Net Profit"
                value={formatCurrency(safeStats.net_profit)}
                subLabel={`After ${role !== "admin" && role !== "subadmin" ? "₦******" : "₦" + Number(safeStats.total_expenses || 0).toLocaleString("en-NG")} expenses`}
                icon={<TrendingUp className="w-3.5 h-3.5" />}
                trend={safeStats.net_profit >= 0 ? "up" : "down"}
              />
            </div>

            {/* Quick Chart */}
            {(role === "admin" || role === "subadmin") && (
              <div className="px-6 md:px-8 pb-8">
                <div className="w-full h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Revenue', value: Math.max(0, safeStats.total_sales_amount || 0), color: '#10b981' },
                        { name: 'Purchases', value: Math.max(0, safeStats.total_purchase_amount || 0), color: '#f59e0b' },
                        { name: 'Expenses', value: Math.max(0, safeStats.total_expenses || 0), color: '#ef4444' },
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(val) => `₦${(val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val)}`} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        content={({ active, payload, label }: any) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-2 border border-slate-100 shadow-lg rounded-lg">
                                <p className="font-bold text-slate-700 text-xs mb-0.5">{label}</p>
                                <p className="text-slate-900 font-black text-sm">
                                  {formatCurrency(payload[0].value || 0)}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {
                          [
                            { color: '#10b981' },
                            { color: '#f59e0b' },
                            { color: '#ef4444' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Inventory value strip */}
            {(safeStats.inventory_cost_value > 0 || safeStats.inventory_selling_value > 0) && (
              <div className="border-t border-slate-100 px-6 md:px-8 py-4 bg-slate-50/30 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Inventory Cost Value
                  </p>
                  <p className="text-sm font-bold text-slate-700">
                    {formatCurrency(safeStats.inventory_cost_value)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Inventory Selling Value
                  </p>
                  <p className="text-sm font-bold text-slate-700">
                    {formatCurrency(safeStats.inventory_selling_value)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

// ─── Metric Card ───────────────────────────────────────────────
const MetricCard = ({
  title,
  value,
  icon,
  color,
  isAlert,
  subtitle,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  isAlert?: boolean;
  subtitle?: string;
}) => {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow ${
        isAlert ? "border-rose-200 bg-rose-50/10" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-slate-900">
            {Number(value || 0).toLocaleString()}
          </h3>
          {subtitle && (
            <p className="text-[10px] font-semibold text-rose-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl border ${colorMap[color]}`}>{icon}</div>
      </div>
      <div className="mt-4 flex items-center gap-1.5">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            isAlert ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
          }`}
        />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
          {isAlert ? "Action Required" : "Status: Healthy"}
        </span>
      </div>
    </motion.div>
  );
};

// ─── Financial Card ────────────────────────────────────────────
const FinancialCard = ({
  label,
  value,
  subLabel,
  icon,
  trend,
}: {
  label: string;
  value: string;
  subLabel: string;
  icon: React.ReactNode;
  trend: "up" | "down" | "neutral";
}) => {
  const trendColor =
    trend === "up"
      ? "text-emerald-600"
      : trend === "down"
      ? "text-rose-500"
      : "text-slate-400";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="text-2xl md:text-3xl font-bold text-slate-900 tabular-nums">
        {value}
      </div>
      <p className={`text-xs font-bold ${trendColor}`}>{subLabel}</p>
    </div>
  );
};
