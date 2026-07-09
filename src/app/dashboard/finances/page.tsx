"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  ArrowDownCircle,
  TrendingUp,
  Store,
  Boxes,
  CircleDollarSign,
  Users,
  Truck,
  AlertTriangle,
  Package,
  BarChart3,
  RefreshCw,
  Calendar,
  ChevronDown,
  Loader2
} from "lucide-react";
import { getShops, getFullStats } from "@/apiCalls";
import { motion, AnimatePresence } from "framer-motion";
import Loader from "@/components/Loader";
import { toast } from "react-hot-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FinancialStats {
  total_sales_amount: number;
  gross_profit: number;
  net_profit: number;
  total_expenses: number;
  total_purchase_amount: number;
  total_sales_count?: number;
  total_purchases_count?: number;
  total_expenses_count?: number;
  inventory_selling_value: number;
  inventory_cost_value: number;
  products_count: number;
  customers_count: number;
  suppliers_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

interface Shop {
  id: string;
  name: string;
}

type MetricColor = "emerald" | "blue" | "purple" | "rose" | "amber" | "orange" | "slate";

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: MetricColor;
}

interface MiniMetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: MetricColor;
}

interface StockAlertCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "orange" | "rose";
  description: string;
}

export default function FinancesPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>("");
  const [roleChecked, setRoleChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Preparing Dashboard..."); // New State
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>("");
  const [timeRange, setTimeRange] = useState<string>("month");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [dateRangeLabel, setDateRangeLabel] = useState("This Month");

  // Stable reference so Recharts doesn't treat this as new data (and
  // recompute its internal scales/layout) on every unrelated re-render.
  const chartData = useMemo(() => [
    { name: 'Revenue', value: Math.max(0, stats?.total_sales_amount || 0), color: '#10b981' },
    { name: 'Purchases', value: Math.max(0, stats?.total_purchase_amount || 0), color: '#f59e0b' },
    { name: 'Expenses', value: Math.max(0, stats?.total_expenses || 0), color: '#ef4444' },
    { name: 'Gross Profit', value: Math.max(0, stats?.gross_profit || 0), color: '#3b82f6' },
    { name: 'Net Profit', value: Math.max(0, stats?.net_profit || 0), color: '#8b5cf6' },
  ], [stats?.total_sales_amount, stats?.total_purchase_amount, stats?.total_expenses, stats?.gross_profit, stats?.net_profit]);

  // Predefined date ranges
  const predefinedRanges = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "Last 7 Days", value: "last7days" },
    { label: "Last 30 Days", value: "last30days" },
    { label: "This Week", value: "week" },
    { label: "Last Week", value: "lastweek" },
    { label: "This Month", value: "month" },
    { label: "Last Month", value: "lastmonth" },
    { label: "This Quarter", value: "quarter" },
    { label: "Last Quarter", value: "lastquarter" },
    { label: "This Year", value: "year" },
    { label: "Last Year", value: "lastyear" },
    { label: "Year to Date", value: "ytd" },
    { label: "Custom Range", value: "custom" },
  ];

  useEffect(() => {
    // Role Guard: managers cannot access finances
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        const role = (parsed.role || "").toLowerCase();
        setUserRole(role);
        if (role === "manager" || role === "staff") {
          toast.error("Access denied: You cannot view Finances.");
          router.replace("/dashboard");
          return;
        }
      }
    } catch {}
    setRoleChecked(true);
    loadShops();
    // Set default dates
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setCustomDateRange({
      startDate: formatDate(firstDayOfMonth),
      endDate: formatDate(today),
    });
  }, []);

  useEffect(() => {
    if (selectedShop) {
      if (stats) setRefreshing(true); // Don't full screen load if we have data
      fetchStats(selectedShop);
    }
  }, [selectedShop, customDateRange]);

  const loadShops = async () => {
    try {
      setLoadingMessage("Loading Shops...");
      const res = await getShops();
      const shopsData = Array.isArray(res.data) ? res.data : [];
      setShops(shopsData);
      if (shopsData.length > 0) {
        const savedShop = localStorage.getItem("selected_shop_id");
        setSelectedShop(savedShop && shopsData.some((s: Shop) => s.id === savedShop) ? savedShop : shopsData[0].id);
      } else {
        await fetchStats("");
      }
    } catch (err) {
      console.error("Failed to load shops", err);
      await fetchStats("");
    }
  };

  const fetchStats = async (shopId: string) => {
    try {
      if (!stats) setLoading(true);
      setError(null);

      // Fun dynamic messages
      const messages = [
        "Analyzing Sales Trends...",
        "Calculating Profit Margins...",
        "Reviewing Expenses...",
        "Checking Inventory Value...",
        "Summarizing Financial Health..."
      ];
      setLoadingMessage(messages[Math.floor(Math.random() * messages.length)]);

      const params: any = { shop_id: shopId };

      // Always use the computed customDateRange which is kept in sync by handleTimeRangeChange
      if (customDateRange.startDate && customDateRange.endDate) {
        params.start_date = customDateRange.startDate;
        params.end_date = customDateRange.endDate;
      }

      const res = await getFullStats(params);
      setStats(res.data);
    } catch (err: any) {
      console.error("Failed loading stats", err);
      setError(err.response?.status === 403
        ? "You do not have permission to view financial statistics."
        : "Failed to load financial statistics. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats(selectedShop || "");
  };

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    setShowDatePicker(false);

    // Update date range label
    const selected = predefinedRanges.find(range => range.value === value);
    if (selected) {
      setDateRangeLabel(selected.label);
    }

    // Set custom dates for predefined ranges
    const today = new Date();
    switch (value) {
      case "today":
        setCustomDateRange({
          startDate: formatDate(today),
          endDate: formatDate(today),
        });
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        setCustomDateRange({
          startDate: formatDate(yesterday),
          endDate: formatDate(yesterday),
        });
        break;
      case "last7days":
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 6);
        setCustomDateRange({
          startDate: formatDate(last7Days),
          endDate: formatDate(today),
        });
        break;
      case "last30days":
        const last30Days = new Date(today);
        last30Days.setDate(last30Days.getDate() - 29);
        setCustomDateRange({
          startDate: formatDate(last30Days),
          endDate: formatDate(today),
        });
        break;
      case "week":
        const firstDayOfWeek = new Date(today);
        const day = firstDayOfWeek.getDay();
        const diff = firstDayOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        firstDayOfWeek.setDate(diff);
        setCustomDateRange({
          startDate: formatDate(firstDayOfWeek),
          endDate: formatDate(today),
        });
        break;
      case "lastweek":
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7 - lastWeekStart.getDay());
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        setCustomDateRange({
          startDate: formatDate(lastWeekStart),
          endDate: formatDate(lastWeekEnd),
        });
        break;
      case "month":
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setCustomDateRange({
          startDate: formatDate(firstDayOfMonth),
          endDate: formatDate(today),
        });
        break;
      case "lastmonth":
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        setCustomDateRange({
          startDate: formatDate(firstDayLastMonth),
          endDate: formatDate(lastDayLastMonth),
        });
        break;
      case "quarter":
        const quarter = Math.floor(today.getMonth() / 3);
        const firstDayOfQuarter = new Date(today.getFullYear(), quarter * 3, 1);
        setCustomDateRange({
          startDate: formatDate(firstDayOfQuarter),
          endDate: formatDate(today),
        });
        break;
      case "lastquarter":
        const currentQuarter = Math.floor(today.getMonth() / 3);
        const lastQParams = currentQuarter === 0
          ? { year: today.getFullYear() - 1, q: 3 }
          : { year: today.getFullYear(), q: currentQuarter - 1 };

        const firstDayLastQuarter = new Date(lastQParams.year, lastQParams.q * 3, 1);
        const lastDayLastQuarter = new Date(lastQParams.year, (lastQParams.q + 1) * 3, 0);

        setCustomDateRange({
          startDate: formatDate(firstDayLastQuarter),
          endDate: formatDate(lastDayLastQuarter),
        });
        break;
      case "year": // This Year / YTD
      case "ytd":
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        setCustomDateRange({
          startDate: formatDate(firstDayOfYear),
          endDate: formatDate(today),
        });
        break;
      case "lastyear":
        const firstDayLastYear = new Date(today.getFullYear() - 1, 0, 1);
        const lastDayLastYear = new Date(today.getFullYear(), 0, 0);
        setCustomDateRange({
          startDate: formatDate(firstDayLastYear),
          endDate: formatDate(lastDayLastYear),
        });
        break;
    }
  };

  const handleCustomDateApply = () => {
    if (customDateRange.startDate && customDateRange.endDate) {
      setTimeRange("custom");
      setDateRangeLabel(
        `${formatDisplayDate(customDateRange.startDate)} - ${formatDisplayDate(customDateRange.endDate)}`
      );
      setShowDatePicker(false);
    }
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const formatNaira = (n: number) =>
    "₦" + Number(n || 0).toLocaleString("en-NG");

  if (!roleChecked) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader text="Checking permissions..." />
        </div>
      </>
    );
  }

  if (loading && !stats) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader text={loadingMessage} subText="Crunching the financial numbers for you..." />
        </div>
      </>
    );
  }

  return (
    <>
      {refreshing && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-[100] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/90 backdrop-blur-md p-5 sm:p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-white/50 mx-4 text-center"
          >
            <Loader2 className="w-10 h-10 text-amber-600 animate-spin mb-4" />
            <p className="text-slate-900 font-black text-xl tracking-tight">{loadingMessage}</p>
            <p className="text-slate-500 font-medium mt-1">Refining data points...</p>
          </motion.div>
        </div>
      )}

      <main className="p-4 sm:p-6 lg:p-10 space-y-6 lg:space-y-8 max-w-[100vw] overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Financials
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-slate-500 font-medium mt-1">Real-time business performance analytics</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full md:w-auto"
          >
            {/* Date Range Selector */}
            <div className="relative group/date">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-3 px-4 sm:px-5 py-3 border border-slate-200 rounded-xl bg-white shadow-sm hover:border-amber-300 hover:shadow-amber-100 transition-all font-bold text-slate-700 w-full sm:min-w-[220px] justify-between group"
              >
                <div className="flex items-center gap-3 text-slate-500 group-hover:text-amber-600 transition-colors">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm tracking-tight">{dateRangeLabel}</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showDatePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 w-[calc(100vw-2rem)] sm:w-[340px] overflow-hidden"
                  >
                    <div className="p-6 space-y-6">
                      <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Quick Select</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {predefinedRanges.map((range) => (
                            <button
                              key={range.value}
                              onClick={() => handleTimeRangeChange(range.value)}
                              className={`px-3 py-2.5 text-xs font-bold rounded-xl transition-all ${timeRange === range.value
                                ? 'bg-amber-600 text-white shadow-lg shadow-amber-200'
                                : 'text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100'
                                }`}
                            >
                              {range.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-slate-50 pt-6">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Custom Range</h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 mb-1.5 px-1 uppercase tracking-tighter">Start Date</p>
                              <input
                                type="date"
                                value={customDateRange.startDate}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-200 transition-all"
                              />
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 mb-1.5 px-1 uppercase tracking-tighter">End Date</p>
                              <input
                                type="date"
                                value={customDateRange.endDate}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-200 transition-all"
                              />
                            </div>
                          </div>
                          <button
                            onClick={handleCustomDateApply}
                            disabled={!customDateRange.startDate || !customDateRange.endDate}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-slate-200"
                          >
                            Apply Custom Scope
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative group/select">
              <select
                className="appearance-none px-4 sm:px-5 py-3 border border-slate-200 rounded-xl bg-white shadow-sm hover:border-amber-300 hover:shadow-amber-100 transition-all font-bold text-slate-700 w-full sm:min-w-[180px] focus:outline-none cursor-pointer pr-10"
                value={selectedShop}
                onChange={(e) => {
                  setSelectedShop(e.target.value);
                  localStorage.setItem("selected_shop_id", e.target.value);
                }}
              >
                {shops.length === 0 && <option value="">All Shops</option>}
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
              <Store className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover/select:text-amber-600 transition-colors" />
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 active:scale-95 transition-all shadow-sm w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </motion.div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-semibold flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Active Range & PI */}
        <div className="flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap items-center gap-3"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-100 text-amber-700 rounded-full shadow-sm shadow-amber-100">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-[11px] font-black uppercase tracking-wider">
                {timeRange !== "custom" && <span className="mr-1 opacity-60 italic">{dateRangeLabel}:</span>}
                {formatDisplayDate(customDateRange.startDate)} — {formatDisplayDate(customDateRange.endDate)}
              </span>
            </div>
          </motion.div>

          {/* Performance Ratios */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            {[
              { label: "Profit Margin", value: stats && stats.total_sales_amount > 0 ? `${((stats.net_profit / stats.total_sales_amount) * 100).toFixed(1)}%` : "0%", icon: TrendingUp, color: "emerald" as MetricColor },
              { label: "ROI", value: stats && stats.total_purchase_amount > 0 ? `${((stats.net_profit / stats.total_purchase_amount) * 100).toFixed(1)}%` : "0%", icon: BarChart3, color: "blue" as MetricColor },
              { label: "Expense Ratio", value: stats && stats.total_sales_amount > 0 ? `${((stats.total_expenses / stats.total_sales_amount) * 100).toFixed(1)}%` : "0%", icon: Wallet, color: "amber" as MetricColor },
            ].map((pi) => (
              <MetricCard key={pi.label} title={pi.label} value={pi.value} icon={<pi.icon className="w-5 h-5" />} color={pi.color} />
            ))}
          </div>
        </div>

        {/* Main Financial Metrics */}
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Revenue &amp; Profit</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
            <MetricCard
              title="Total Sales"
              value={formatNaira(stats?.total_sales_amount || 0)}
              icon={<TrendingUp className="w-6 h-6" />}
              color="emerald"
            />
            <MetricCard
              title="Gross Profit"
              value={formatNaira(stats?.gross_profit || 0)}
              icon={<Wallet className="w-6 h-6" />}
              color="blue"
            />
            <MetricCard
              title="Net Profit"
              value={formatNaira(stats?.net_profit || 0)}
              icon={<CircleDollarSign className="w-6 h-6" />}
              color="purple"
            />
            <MetricCard
              title="Total Expenses"
              value={formatNaira(stats?.total_expenses || 0)}
              icon={<ArrowDownCircle className="w-6 h-6" />}
              color="rose"
            />
            <MetricCard
              title="Total Purchases"
              value={formatNaira(stats?.total_purchase_amount || 0)}
              icon={<Truck className="w-6 h-6" />}
              color="orange"
            />
          </div>

          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Inventory Valuation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8">
            <MetricCard
              title="Inventory Value (Selling Price)"
              value={formatNaira(stats?.inventory_selling_value || 0)}
              icon={<Boxes className="w-6 h-6" />}
              color="amber"
            />
            <MetricCard
              title="Inventory Cost (Cost Price)"
              value={formatNaira(stats?.inventory_cost_value || 0)}
              icon={<Package className="w-6 h-6" />}
              color="slate"
            />
          </div>
        </div>

        {/* Financial Flow Chart */}
        <div className="glass-card mb-8 rounded-2xl p-5 w-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Financial Flow Overview</h3>
          </div>
          <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  tickFormatter={(val) => `₦${(val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val)}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl">
                          <p className="font-bold text-slate-700 text-sm mb-1">{label}</p>
                          <p className="text-slate-900 font-black text-lg">
                            {formatNaira(payload[0].value || 0)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Business Overview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Business Metrics */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Business Overview</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MiniMetricCard
                title="Products"
                value={stats?.products_count || 0}
                icon={<Package className="w-5 h-5" />}
                color="blue"
              />
              <MiniMetricCard
                title="Customers"
                value={stats?.customers_count || 0}
                icon={<Users className="w-5 h-5" />}
                color="purple"
              />
              <MiniMetricCard
                title="Suppliers"
                value={stats?.suppliers_count || 0}
                icon={<Truck className="w-5 h-5" />}
                color="emerald"
              />
              <MiniMetricCard
                title="Total Transactions"
                value={(stats?.total_sales_count || 0) + (stats?.total_purchases_count || 0) + (stats?.total_expenses_count || 0)}
                icon={<BarChart3 className="w-5 h-5" />}
                color="amber"
              />
            </div>
          </div>

          {/* Right Column - Stock Status */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Stock Status</h3>
            <div className="space-y-4">
              <StockAlertCard
                title="Low Stock Items"
                value={stats?.low_stock_count || 0}
                icon={<AlertTriangle className="w-5 h-5" />}
                color="orange"
                description="Items needing restock"
              />
              <StockAlertCard
                title="Out of Stock"
                value={stats?.out_of_stock_count || 0}
                icon={<AlertTriangle className="w-5 h-5" />}
                color="rose"
                description="Urgent attention needed"
              />
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">Stock Health</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {stats && stats.products_count > 0
                      ? `${(100 - ((stats.low_stock_count + stats.out_of_stock_count) / stats.products_count * 100)).toFixed(0)}%`
                      : "100%"
                    }
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: stats && stats.products_count > 0
                        ? `${100 - ((stats.low_stock_count + stats.out_of_stock_count) / stats.products_count * 100)}%`
                        : '100%'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

const metricColorClasses: Record<MetricColor, string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-purple-50 text-purple-600",
  rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600",
  orange: "bg-orange-50 text-orange-600",
  slate: "bg-slate-100 text-slate-600",
};

// Flat stat card matching the app's glass-card theme — no gradients, no
// fabricated trend numbers we can't actually back with historical data.
const MetricCard = ({ title, value, icon, color }: MetricCardProps) => (
  <div className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:shadow-lg hover:shadow-slate-200/50 transition-all">
    <div className={`p-3 rounded-xl ${metricColorClasses[color]} shrink-0`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 truncate">{title}</p>
      <p className="text-xl font-black text-slate-900 truncate">{value}</p>
    </div>
  </div>
);

const MiniMetricCard = ({ title, value, icon, color }: MiniMetricCardProps) => (
  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
    <div className={`p-2 rounded-lg ${metricColorClasses[color]}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-lg font-bold text-slate-900">{value.toLocaleString()}</p>
    </div>
  </div>
);

const StockAlertCard = ({ title, value, icon, color, description }: StockAlertCardProps) => {
  const colorClasses = {
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    rose: "bg-rose-50 text-rose-600 border-rose-200",
  };

  return (
    <div className={`flex items-center justify-between p-4 border rounded-xl ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white">
          {icon}
        </div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm opacity-75">{description}</p>
        </div>
      </div>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
};
