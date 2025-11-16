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
} from "lucide-react";
import { getShops } from "@/apiCalls";
import { api } from "@/apiCalls";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";

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
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>("");
  const [timeRange, setTimeRange] = useState<string>("month");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    if (selectedShop) {
      fetchStats(selectedShop);
    }
  }, [selectedShop, timeRange]);

  const loadShops = async () => {
    try {
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
      setLoading(true);
      const res = await api.get("/reports/full-stats", {
        params: { shop_id: shopId, period: timeRange },
      });
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

  const formatNaira = (n: number) =>
    "₦" + Number(n || 0).toLocaleString("en-NG");

  const formatCompact = (n: number) => {
    if (n >= 1000000) return `₦${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `₦${(n / 1000).toFixed(1)}K`;
    return formatNaira(n);
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading financial dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
   <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isMobile={false}
      />
      
      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-6 lg:p-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Financial Dashboard
                </h1>
                <p className="text-gray-600 text-lg">
                  Comprehensive overview of your business performance
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
                </select>

                <select
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm min-w-[200px]"
                  value={selectedShop}
                  onChange={(e) => setSelectedShop(e.target.value)}
                >
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Profit Margin</p>
                    <p className="text-2xl font-bold mt-1">
                      {stats && stats.total_sales_amount > 0 
                        ? `${((stats.net_profit / stats.total_sales_amount) * 100).toFixed(1)}%`
                        : "0%"
                      }
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">ROI</p>
                    <p className="text-2xl font-bold mt-1">
                      {stats && stats.total_purchase_amount > 0
                        ? `${((stats.net_profit / stats.total_purchase_amount) * 100).toFixed(1)}%`
                        : "0%"
                      }
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Expense Ratio</p>
                    <p className="text-2xl font-bold mt-1">
                      {stats && stats.total_sales_amount > 0
                        ? `${((stats.total_expenses / stats.total_sales_amount) * 100).toFixed(1)}%`
                        : "0%"
                      }
                    </p>
                  </div>
                  <Wallet className="w-8 h-8 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Stock Health</p>
                    <p className="text-2xl font-bold mt-1">
                      {stats && stats.products_count > 0
                        ? `${(100 - ((stats.low_stock_count + stats.out_of_stock_count) / stats.products_count * 100)).toFixed(0)}%`
                        : "100%"
                      }
                    </p>
                  </div>
                  <Package className="w-8 h-8 opacity-80" />
                </div>
              </div>
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
      </div>
    </div>
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
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              change >= 0 
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