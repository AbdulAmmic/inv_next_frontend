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
  Activity,
  ChevronDown,
  Loader2,
  RefreshCw,
  Smartphone,
  Store
} from "lucide-react";

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

      if (parsed.role === "manager") {
        setSelectedShop(parsed.shop_id);
        loadShops();
        return;
      }
    }

    if (savedShop) {
      setSelectedShop(savedShop);
    }

    loadShops();
  }, []);

  const loadShops = async () => {
    // ...
    try {
      const res = await getShops();
      if (res.data.length > 0) {
        setShops(res.data);
        if (!selectedShop) {
          const firstShop = res.data[0].id;
          setSelectedShop(firstShop);
          localStorage.setItem("selected_shop_id", firstShop);
        }
      }
    } catch (err) {
      console.error("Shop load failed", err);
    }
  };

  // Reload stats whenever selected shop changes
  useEffect(() => {
    if (selectedShop) loadStats(selectedShop);
  }, [selectedShop]);

  const loadStats = async (shopId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/reports/full-stats", {
        params: { shop_id: shopId },
      });
      setStats(res.data);
    } catch (err: any) {
      console.error("Dashboard Stats Error:", err);
      if (err.response?.status === 403) {
        setError("You do not have permission to view dashboard statistics.");
      } else {
        setError("Failed to load dashboard statistics.");
      }
      setStats(null); // Ensure stats is null if failed
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats(selectedShop);
  };

  const format = (n: number) => "₦" + Number(n || 0).toLocaleString();

  const getShopName = (id: string) => {
    const shop = shops.find(s => s.id === id);
    return shop ? shop.name : "Unknown Shop";
  };

  if (loading && !stats && !error) {
    return <Loader text="Loading dashboard..." subText="Preparing your insights" />;
  }

  // Error State Display
  if (error) {
    return (
      <DashboardLayout>
        <div className="p-8 flex flex-col items-center justify-center h-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied / Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Defensive check for rendering if stats is null but no error (shouldn't happen with above logic, but safe code)
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
      <main className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-2">
        {/* Header with shop selector and refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Dashboard Overview
            </h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Real-time business insights & analytics
            </p>
          </div>

          <div className="flex items-center gap-3">
            {role !== "manager" && shops.length > 0 && (
              <div className="relative group">
                <select
                  value={selectedShop}
                  onChange={(e) => {
                    setSelectedShop(e.target.value);
                    localStorage.setItem("selected_shop_id", e.target.value);
                  }}
                  className="appearance-none bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer w-full sm:w-auto"
                >
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Current Shop Display for Mobile */}
        {role !== "manager" && (
          <div className="sm:hidden bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
            <Store className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-blue-500 font-medium">Current Shop</p>
              <p className="text-sm font-semibold text-gray-800">
                {getShopName(selectedShop)}
              </p>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <MetricCard
            title="Total Products"
            value={safeStats.products_count}
            icon={<Package className="w-5 h-5" />}
            color="blue"
            trend="+12% from last month"
            loading={loading}
          />
          <MetricCard
            title="Active Customers"
            value={safeStats.customers_count}
            icon={<Users className="w-5 h-5" />}
            color="green"
            trend="+8% from last month"
            loading={loading}
          />
          <MetricCard
            title="Suppliers"
            value={safeStats.suppliers_count}
            icon={<Truck className="w-5 h-5" />}
            color="purple"
            trend="+3 new this month"
            loading={loading}
          />
          <MetricCard
            title="Low Stock Items"
            value={safeStats.low_stock_count}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="red"
            trend="Requires attention"
            loading={loading}
          />
        </section>

        {/* Financial Section - Only for Admin */}
        {role === "admin" && (
          <section className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-5 md:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-gray-900">
                  Financial Performance
                </h2>
                <p className="text-gray-500 text-sm md:text-base mt-1">
                  Revenue, profit, and sales metrics
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-500 hidden md:block" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <FinancialCard
                title="Total Sales"
                value={format(safeStats.total_sales_amount)}
                icon={<ShoppingCart className="w-5 h-5" />}
                color="emerald"
                subtitle="All-time revenue"
                loading={loading}
              />
              <FinancialCard
                title="Gross Profit"
                value={format(safeStats.gross_profit)}
                icon={<BarChart3 className="w-5 h-5" />}
                color="indigo"
                subtitle="Before expenses"
                loading={loading}
              />
              <FinancialCard
                title="Net Profit"
                value={format(safeStats.net_profit)}
                icon={<TrendingUp className="w-5 h-5" />}
                color="orange"
                subtitle="After all deductions"
                loading={loading}
              />
            </div>

            {/* Mobile Financial Summary */}
            <div className="mt-6 md:hidden bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm">Quick Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Profit Margin</span>
                  <span className="font-semibold text-emerald-600">
                    {safeStats.gross_profit && safeStats.total_sales_amount
                      ? `${((safeStats.gross_profit / safeStats.total_sales_amount) * 100).toFixed(1)}%`
                      : "0%"
                    }
                  </span>
                </div>
                <div className="h-px bg-gray-100"></div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Smartphone className="w-4 h-4" />
                  <span>Tap metrics for details</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Stats Update Time */}
        <div className="text-center pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 inline-flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </main>
    </DashboardLayout>
  );
}

// Enhanced Metric Card Component
const MetricCard = ({ title, value, icon, color, trend, loading }: any) => {
  const colorClasses: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    red: "bg-red-50 text-red-600 border-red-100",
  };

  return (
    <div className="group bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>

      {trend && (
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">{trend}</p>
        </div>
      )}

      {/* Mobile touch indicator */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity md:hidden">
        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
      </div>
    </div>
  );
};

// Financial Card Component
const FinancialCard = ({ title, value, icon, color, subtitle, loading }: any) => {
  const colorClasses: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {subtitle}
        </span>
      </div>

      <div>
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{title}</p>
        {loading ? (
          <div className="h-6 w-32 bg-gray-200 animate-pulse rounded mt-2"></div>
        ) : (
          <p className="text-lg md:text-xl font-bold text-gray-900 mt-1 truncate">
            {value}
          </p>
        )}
      </div>
    </div>
  );
};