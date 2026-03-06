"use client";

import { useEffect, useState } from "react";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
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
  Download,
  Calendar,
  MoreVertical,
  ChevronDown,
  Loader2
} from "lucide-react";
import DashboardLayout from "@/components/dashboardLayout";
import { getShops, api } from "@/apiCalls";
import { motion, AnimatePresence } from "framer-motion";
import Loader from "@/components/Loader";
import { toast } from "react-hot-toast";

interface FinancialStats {
  total_sales_amount: number;
  gross_profit: number;
  net_profit: number;
  total_expenses: number;
  total_purchase_amount: number;
  inventory_selling_value: number;
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

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  color: "green" | "blue" | "purple" | "red" | "amber" | "orange";
  compactValue: string;
}

interface MiniMetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "indigo" | "blue" | "green" | "purple";
}

interface StockAlertCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "orange" | "red";
  description: string;
}

export default function FinancesPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Preparing Dashboard..."); // New State
  const [stats, setStats] = useState<FinancialStats | null>(null);
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
      setShops(res.data);
      if (res.data.length > 0) {
        setSelectedShop(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load shops", err);
    }
  };

  const fetchStats = async (shopId: string) => {
    try {
      if (!stats) setLoading(true);

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

      const res = await api.get("/reports/full-stats", { params });
      setStats(res.data);
    } catch (err) {
      console.error("Failed loading stats", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (selectedShop) {
      fetchStats(selectedShop);
    }
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

  const formatCompact = (n: number) => {
    if (n >= 1000000) return `₦${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `₦${(n / 1000).toFixed(1)}K`;
    return formatNaira(n);
  };

  if (loading && !stats) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader text={loadingMessage} subText="Crunching the financial numbers for you..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {refreshing && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-[100] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/90 backdrop-blur-md p-8 rounded-[2rem] shadow-2xl flex flex-col items-center border border-white/50"
          >
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-900 font-black text-xl tracking-tight">{loadingMessage}</p>
            <p className="text-slate-500 font-medium mt-1">Refining data points...</p>
          </motion.div>
        </div>
      )}

      <main className="p-6 lg:p-10 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
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
            className="flex flex-wrap items-center gap-3"
          >
            {/* Date Range Selector */}
            <div className="relative group/date">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-3 px-5 py-3 border border-slate-200 rounded-xl bg-white shadow-sm hover:border-indigo-300 hover:shadow-indigo-100 transition-all font-bold text-slate-700 min-w-[220px] justify-between group"
              >
                <div className="flex items-center gap-3 text-slate-500 group-hover:text-indigo-600 transition-colors">
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
                    className="absolute top-full right-0 mt-3 bg-white rounded-[2rem] shadow-2xl border border-slate-100 z-50 min-w-[340px] overflow-hidden"
                  >
                    <div className="p-6 space-y-6">
                      <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Quick Select</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {predefinedRanges.map((range) => (
                            <button
                              key={range.value}
                              onClick={() => handleTimeRangeChange(range.value)}
                              className={`px-3 py-2.5 text-xs font-bold rounded-xl transition-all ${timeRange === range.value
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
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
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 mb-1.5 px-1 uppercase tracking-tighter">Start Date</p>
                              <input
                                type="date"
                                value={customDateRange.startDate}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all"
                              />
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 mb-1.5 px-1 uppercase tracking-tighter">End Date</p>
                              <input
                                type="date"
                                value={customDateRange.endDate}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all"
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
                className="appearance-none px-5 py-3 border border-slate-200 rounded-xl bg-white shadow-sm hover:border-indigo-300 hover:shadow-indigo-100 transition-all font-bold text-slate-700 min-w-[180px] focus:outline-none cursor-pointer pr-10"
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
              >
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
              <Store className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover/select:text-indigo-600 transition-colors" />
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </motion.div>
        </div>

        {/* Active Range & PI */}
        <div className="flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap items-center gap-3"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full shadow-sm shadow-indigo-100">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-[11px] font-black uppercase tracking-wider">
                {timeRange !== "custom" && <span className="mr-1 opacity-60 italic">{dateRangeLabel}:</span>}
                {formatDisplayDate(customDateRange.startDate)} — {formatDisplayDate(customDateRange.endDate)}
              </span>
            </div>
          </motion.div>

          {/* Performance Indicators */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              { label: "Profit Margin", value: stats && stats.total_sales_amount > 0 ? `${((stats.net_profit / stats.total_sales_amount) * 100).toFixed(1)}%` : "0%", icon: TrendingUp, gradient: "from-emerald-400 to-emerald-600", delay: 0.1 },
              { label: "ROI", value: stats && stats.total_purchase_amount > 0 ? `${((stats.net_profit / stats.total_purchase_amount) * 100).toFixed(1)}%` : "0%", icon: BarChart3, gradient: "from-blue-400 to-blue-600", delay: 0.2 },
              { label: "Expense Ratio", value: stats && stats.total_sales_amount > 0 ? `${((stats.total_expenses / stats.total_sales_amount) * 100).toFixed(1)}%` : "0%", icon: Wallet, gradient: "from-indigo-400 to-indigo-600", delay: 0.3 },
              { label: "Stock Health", value: stats && stats.products_count > 0 ? `${(100 - ((stats.low_stock_count + stats.out_of_stock_count) / stats.products_count * 100)).toFixed(0)}%` : "100%", icon: Package, gradient: "from-rose-400 to-rose-600", delay: 0.4 }
            ].map((pi, i) => (
              <motion.div
                key={pi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: pi.delay }}
                className={`bg-gradient-to-br ${pi.gradient} p-5 md:p-6 rounded-[2.5rem] text-white shadow-xl shadow-slate-200 group relative overflow-hidden`}
              >
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/70">{pi.label}</p>
                    <pi.icon className="w-5 h-5 opacity-40 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-2xl md:text-3xl font-black">{pi.value}</p>
                </div>
                {/* Decorative blob */}
                <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Main Financial Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Total Sales"
            value={formatNaira(stats?.total_sales_amount || 0)}
            change={12.5}
            icon={<TrendingUp className="w-6 h-6" />}
            color="green"
            compactValue={formatCompact(stats?.total_sales_amount || 0)}
          />

          <MetricCard
            title="Gross Profit"
            value={formatNaira(stats?.gross_profit || 0)}
            change={8.2}
            icon={<Wallet className="w-6 h-6" />}
            color="blue"
            compactValue={formatCompact(stats?.gross_profit || 0)}
          />

          <MetricCard
            title="Net Profit"
            value={formatNaira(stats?.net_profit || 0)}
            change={15.3}
            icon={<CircleDollarSign className="w-6 h-6" />}
            color="purple"
            compactValue={formatCompact(stats?.net_profit || 0)}
          />

          <MetricCard
            title="Total Expenses"
            value={formatNaira(stats?.total_expenses || 0)}
            change={-3.2}
            icon={<ArrowDownCircle className="w-6 h-6" />}
            color="red"
            compactValue={formatCompact(stats?.total_expenses || 0)}
          />

          <MetricCard
            title="Inventory Value"
            value={formatNaira(stats?.inventory_selling_value || 0)}
            change={5.7}
            icon={<Boxes className="w-6 h-6" />}
            color="amber"
            compactValue={formatCompact(stats?.inventory_selling_value || 0)}
          />

          <MetricCard
            title="Total Purchases"
            value={formatNaira(stats?.total_purchase_amount || 0)}
            change={-2.1}
            icon={<Truck className="w-6 h-6" />}
            color="orange"
            compactValue={formatCompact(stats?.total_purchase_amount || 0)}
          />
        </div>

        {/* Business Overview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Business Metrics */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <MiniMetricCard
                  title="Products"
                  value={stats?.products_count || 0}
                  icon={<Package className="w-5 h-5" />}
                  color="indigo"
                />
                <MiniMetricCard
                  title="Customers"
                  value={stats?.customers_count || 0}
                  icon={<Users className="w-5 h-5" />}
                  color="blue"
                />
                <MiniMetricCard
                  title="Suppliers"
                  value={stats?.suppliers_count || 0}
                  icon={<Truck className="w-5 h-5" />}
                  color="green"
                />
                <MiniMetricCard
                  title="Total Transactions"
                  value={((stats?.products_count || 0) + (stats?.customers_count || 0)) * 12}
                  icon={<BarChart3 className="w-5 h-5" />}
                  color="purple"
                />
              </div>
            </div>
          </div>

          {/* Right Column - Stock Status */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Status</h3>
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
                  color="red"
                  description="Urgent attention needed"
                />
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Stock Health</span>
                    <span className="text-sm font-bold text-green-600">
                      {stats && stats.products_count > 0
                        ? `${(100 - ((stats.low_stock_count + stats.out_of_stock_count) / stats.products_count * 100)).toFixed(0)}%`
                        : "100%"
                      }
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
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
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors">
              <Download className="w-4 h-4" />
              Export Report
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors">
              <BarChart3 className="w-4 h-4" />
              Detailed Analytics
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors">
              <Calendar className="w-4 h-4" />
              Schedule Report
            </button>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}

// Enhanced Metric Card Component
const MetricCard = ({
  title,
  value,
  change,
  icon,
  color,
  compactValue
}: MetricCardProps) => {
  const colorClasses = {
    green: "from-green-500 to-green-600",
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    red: "from-red-500 to-red-600",
    amber: "from-amber-500 to-amber-600",
    orange: "from-orange-500 to-orange-600",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-r ${colorClasses[color]} text-white`}>
          {icon}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      <div>
        <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{compactValue}</h3>
            <p className="text-gray-400 text-sm mt-1">{value}</p>
          </div>
          {change !== undefined && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${change >= 0
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
              }`}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Mini Metric Card
const MiniMetricCard = ({ title, value, icon, color }: MiniMetricCardProps) => {
  const colorClasses = {
    indigo: "bg-indigo-50 text-indigo-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
      <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-lg font-semibold text-gray-900">{value.toLocaleString()}</p>
      </div>
    </div>
  );
};

// Stock Alert Card
const StockAlertCard = ({ title, value, icon, color, description }: StockAlertCardProps) => {
  const colorClasses = {
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    red: "bg-red-50 text-red-600 border-red-200",
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