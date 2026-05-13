"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboardLayout";
import Loader from "@/components/Loader";
import { api, getShops } from "@/apiCalls";
import {
  Package,
  Users,
  Truck,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  DollarSign,
  ShoppingCart,
  RefreshCw,
  Store,
  ChevronDown,
  ArrowUpRight
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [role, setRole] = useState<string>("");
  const [selectedShop, setSelectedShop] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shops, setShops] = useState<any[]>([]);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedShop = localStorage.getItem("selected_shop_id");

    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setRole(parsed.role);
      // Staff and Managers are pinned to their specific shop
      if (parsed.role === "manager" || parsed.role === "staff") {
        setSelectedShop(parsed.shop_id);
        localStorage.setItem("selected_shop_id", parsed.shop_id);
      }
    }

    // Admins and Subadmins use the saved selection or first shop
    if (savedShop && (role === "admin" || role === "subadmin")) {
      setSelectedShop(savedShop);
    }
    loadShops();
  }, [role]);

  const loadShops = async () => {
    try {
      const res = await getShops();
      if (res.data.length > 0) {
        setShops(res.data);
        const currentSaved = localStorage.getItem("selected_shop_id");
        if (role === "admin" || role === "subadmin") {
          if (currentSaved && res.data.some((s: any) => s.id === currentSaved)) {
            setSelectedShop(currentSaved);
          } else {
            const firstShop = res.data[0].id;
            setSelectedShop(firstShop);
            localStorage.setItem("selected_shop_id", firstShop);
          }
        }
      }
    } catch (err) {
      console.error("Shop load failed", err);
    }
  };

  useEffect(() => {
    if (selectedShop) loadStats(selectedShop);
  }, [selectedShop]);

  const loadStats = async (shopId: string) => {
    try {
      if (!stats) setLoading(true);
      setError(null);
      const res = await api.get("/reports/full-stats", {
        params: { shop_id: shopId },
      });
      setStats(res.data);
    } catch (err: any) {
      console.error("Dashboard Stats Error:", err);
      setError(err.response?.status === 403
        ? "You do not have permission to view dashboard statistics."
        : "Failed to load dashboard statistics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats(selectedShop);
    toast.success("Dashboard updated");
  };

  const formatCurrency = (n: number) => "₦" + Number(n || 0).toLocaleString();

  if (loading && !stats && !error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader text="Loading dashboard data..." />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-12 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Access Denied / Error</h2>
          <p className="text-slate-500 mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-all"
          >
            Reload
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const safeStats = stats || {
    products_count: 0,
    customers_count: 0,
    suppliers_count: 0,
    low_stock_count: 0,
    total_sales_amount: 0,
    gross_profit: 0,
    net_profit: 0
  };

  return (
    <DashboardLayout>
      <main className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
        {/* Simple Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 text-sm font-medium">Overview of your business performance</p>
          </div>

          <div className="flex items-center gap-3">
            {(role === "admin" || role === "subadmin") && shops.length > 0 && (
              <div className="relative">
                <select
                  value={selectedShop}
                  onChange={(e) => {
                    setSelectedShop(e.target.value);
                    localStorage.setItem("selected_shop_id", e.target.value);
                  }}
                  className="appearance-none bg-white border border-slate-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer min-w-[180px]"
                >
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
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
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Professional Metric Cards */}
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
          />
        </div>

        {/* Financial Overview - Clean & Professional */}
        {role === "admin" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Financial Performance</h2>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Live Data
              </div>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Total Sales
                </div>
                <div className="text-2xl md:text-3xl font-bold text-slate-900">
                  {formatCurrency(safeStats.total_sales_amount)}
                </div>
                <p className="text-xs text-slate-400 font-medium">Accumulated revenue</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Gross Profit
                </div>
                <div className="text-2xl md:text-3xl font-bold text-slate-900">
                  {formatCurrency(safeStats.gross_profit)}
                </div>
                <p className="text-xs text-emerald-600 font-bold">
                  {safeStats.total_sales_amount > 0
                    ? `${((safeStats.gross_profit / safeStats.total_sales_amount) * 100).toFixed(1)}% margin`
                    : "0% margin"}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Net Profit
                </div>
                <div className="text-2xl md:text-3xl font-bold text-slate-900 text-blue-600">
                  {formatCurrency(safeStats.net_profit)}
                </div>
                <p className="text-xs text-slate-400 font-medium">After all expenses</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </main>
    </DashboardLayout>
  );
}

const MetricCard = ({ title, value, icon, color, isAlert }: any) => {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow ${isAlert ? 'border-rose-200 bg-rose-50/10' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</h3>
        </div>
        <div className={`p-2.5 rounded-xl border ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${isAlert ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
          {isAlert ? 'Action Required' : 'Status: Healthy'}
        </span>
      </div>
    </motion.div>
  );
};