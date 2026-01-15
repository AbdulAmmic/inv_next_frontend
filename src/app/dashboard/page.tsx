"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboardLayout";
import { api, getShops } from "@/apiCalls";

import {
  Package,
  Users,
  Truck,
  AlertTriangle,
  TrendingUp,
  BarChart3,
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [role, setRole] = useState<string>("");
  const [selectedShop, setSelectedShop] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Load user + selected shop
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedShop = localStorage.getItem("selected_shop_id");

    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setRole(parsed.role);

      if (parsed.role === "manager") {
        setSelectedShop(parsed.shop_id);
        return; // Managers are locked to one shop
      }
    }

    if (savedShop) {
      setSelectedShop(savedShop);
    } else {
      // auto-load shops for admin and subadmin
      loadDefaultShop();
    }
  }, []);

  // Load default shop when savedShop is empty
  const loadDefaultShop = async () => {
    try {
      const res = await getShops();
      if (res.data.length > 0) {
        const firstShop = res.data[0].id;
        setSelectedShop(firstShop);
        localStorage.setItem("selected_shop_id", firstShop);
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

      const res = await api.get("/reports/full-stats", {
        params: { shop_id: shopId },
      });

      setStats(res.data);
    } catch (err) {
      console.error("Dashboard Stats Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const format = (n: number) => "₦" + Number(n || 0).toLocaleString();

  if (loading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <main className="p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-800 tracking-tight">
            Dashboard
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Quick overview of business activity
          </p>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <MetricCard title="Products" value={stats.products_count} icon={<Package className="w-6 h-6 text-blue-600" />} />
          <MetricCard title="Customers" value={stats.customers_count} icon={<Users className="w-6 h-6 text-green-600" />} />
          <MetricCard title="Suppliers" value={stats.suppliers_count} icon={<Truck className="w-6 h-6 text-purple-600" />} />
          <MetricCard title="Low Stock" value={stats.low_stock_count} icon={<AlertTriangle className="w-6 h-6 text-red-600" />} />
        </section>

        {role === "admin" && (
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              Financial Summary
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <MetricCard title="Total Sales" value={format(stats.total_sales_amount)} icon={<TrendingUp className="w-6 h-6 text-emerald-600" />} />
              <MetricCard title="Gross Profit" value={format(stats.gross_profit)} icon={<BarChart3 className="w-6 h-6 text-indigo-600" />} />
              <MetricCard title="Net Profit" value={format(stats.net_profit)} icon={<TrendingUp className="w-6 h-6 text-orange-600" />} />
            </div>
          </section>
        )}
      </main>
    </DashboardLayout>
  );
}

const MetricCard = ({ title, value, icon }: any) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
        <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
      </div>

      <p className="text-3xl font-semibold text-gray-800 tracking-tight">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
};
