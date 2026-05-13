"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboardLayout";
import {
  Package,
  AlertTriangle,
  Search,
  RefreshCw,
  Download,
  AlertCircle,
  TrendingDown,
  ArrowRight,
  ChevronRight
} from "lucide-react";
import { getStocks } from "@/apiCalls";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import Loader from "@/components/Loader";
import { motion, AnimatePresence } from "framer-motion";

interface StockItem {
  id: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  status: string;
  lastUpdated: string | null;
  demand_percentage?: number;
}

export default function OutOfStockPage() {
  const [products, setProducts] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const selectedShopId =
    typeof window !== "undefined"
      ? localStorage.getItem("selected_shop_id") || ""
      : "";

  const fetchStock = async () => {
    try {
      if (products.length === 0) setLoading(true);
      else setRefreshing(true);

      const res = await getStocks(selectedShopId);
      const apiRows = Array.isArray(res.data) ? res.data : [];

      const allStocks: StockItem[] = apiRows.map((item: any) => ({
        id: item.id,
        productName: item.productName || "Unknown Product",
        sku: item.sku || "N/A",
        category: item.category || "Uncategorized",
        currentStock: item.currentStock ?? 0,
        minStockLevel: item.minStockLevel ?? 0,
        status: item.status || "active",
        lastUpdated: item.lastUpdated || null,
        demand_percentage: item.demand_percentage ?? 0,
      }));

      const outOfStockItems = allStocks.filter((item) => item.currentStock <= 0);
      setProducts(outOfStockItems);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load stock data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const filteredProducts = products.filter(product =>
    product.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("Restock Priority Report", 14, 25);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-400
    doc.text(`Inventory Status: OUT OF STOCK`, 14, 32);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);

    let y = 50;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(14, y - 6, 182, 10, 'F');

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("PRODUCT NAME", 16, y);
    doc.text("SKU", 90, y);
    doc.text("DEMAND", 130, y);
    doc.text("PRIORITY", 165, y);

    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);

    filteredProducts.forEach((item) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const name = item.productName.length > 35 ? item.productName.substring(0, 35) + "..." : item.productName;
      doc.text(name, 16, y);
      doc.text(item.sku, 90, y);
      doc.text(`${item.demand_percentage}%`, 130, y);

      const priority = (item.demand_percentage || 0) > 70 ? "CRITICAL" : (item.demand_percentage || 0) > 30 ? "HIGH" : "NORMAL";
      doc.text(priority, 165, y);

      y += 8;
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y - 4, 196, y - 4);
    });

    doc.save(`restock_report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("Priority report exported");
  };

  if (loading && products.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader text="Auditing Inventory..." subText="Scanning for out-of-stock items" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="p-6 lg:p-10 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full text-[10px] font-bold uppercase tracking-wider italic">
                Urgent Action
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Out of Stock
            </h1>
            <p className="text-slate-500 font-medium mt-1">Items currently unavailable in your showroom</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <button
              onClick={fetchStock}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={exportPDF}
              disabled={products.length === 0}
              className="inline-flex items-center justify-center gap-2 bg-rose-600 text-white rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-rose-700 active:scale-95 transition-all shadow-lg shadow-rose-200 group disabled:opacity-50"
            >
              <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
              Restock Guide
            </button>
          </motion.div>
        </div>

        {/* Search & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 glass-card p-4 rounded-[1.5rem] flex items-center shadow-xl shadow-slate-200/50 group"
          >
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-600 transition-colors w-5 h-5" />
              <input
                type="text"
                placeholder="Search by product name, SKU or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-100 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-rose-50 focus:border-rose-300 transition-all font-medium text-slate-700 placeholder:text-slate-400"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6 rounded-[1.5rem] flex items-center justify-between border-rose-100 bg-rose-50/30"
          >
            <div>
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest leading-none">Total Depleted</p>
              <p className="text-3xl font-black text-rose-600 mt-2">{products.length}</p>
            </div>
            <div className="p-4 bg-rose-100 text-rose-600 rounded-2xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </motion.div>
        </div>

        {/* Main Content Area */}
        <AnimatePresence mode="wait">
          {products.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-[2.5rem] p-20 text-center flex flex-col items-center border border-white shadow-xl shadow-slate-200/50"
            >
              <div className="w-24 h-24 bg-emerald-50 rounded-[3rem] flex items-center justify-center mb-8">
                <Package className="w-12 h-12 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Full Stockroom!</h2>
              <p className="text-slate-500 max-w-sm mx-auto mt-3 font-medium text-lg leading-relaxed">
                Excellent management! All your inventory levels are currently within defined safety zones.
              </p>
              <button
                onClick={fetchStock}
                className="mt-8 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-100 flex items-center gap-2"
              >
                Scan Again
                <RefreshCw className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 italic">
                      <th className="px-8 py-5 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Product Title</th>
                      <th className="px-8 py-5 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Classification</th>
                      <th className="px-8 py-5 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Market Demand</th>
                      <th className="px-8 py-5 font-bold text-slate-500 uppercase tracking-widest text-[10px] text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <AnimatePresence mode="popLayout">
                      {filteredProducts.map((item, idx) => (
                        <motion.tr
                          layout
                          key={item.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="hover:bg-rose-50/20 transition-colors group"
                        >
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-[1.2rem] flex items-center justify-center font-black text-lg shadow-md shadow-rose-100">
                                {item.productName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 text-lg tracking-tight group-hover:text-rose-600 transition-colors">
                                  {item.productName}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">SKU: {item.sku}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                              {item.category}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-2 max-w-[120px]">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-black ${(item.demand_percentage || 0) > 60 ? 'text-rose-600' : 'text-slate-600'}`}>
                                  {item.demand_percentage}%
                                </span>
                                {(item.demand_percentage || 0) > 70 && (
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                                )}
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(item.demand_percentage || 0, 100)}%` }}
                                  className={`h-full ${(item.demand_percentage || 0) > 60 ? 'bg-rose-500' : 'bg-amber-500'}`}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-600 transition-all active:scale-95 shadow-lg shadow-slate-200 group/btn">
                              Restock
                              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>

                {filteredProducts.length === 0 && products.length > 0 && (
                  <div className="p-20 text-center">
                    <p className="text-slate-400 font-bold italic">No out-of-stock items match your search criteria.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Insight Card */}
        {products.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-8 bg-slate-900 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-indigo-900/20 relative overflow-hidden"
          >
            <div className="relative z-10">
              <h3 className="text-xl font-black tracking-tight mb-2">Restock Priority Applied</h3>
              <p className="text-slate-400 font-medium max-w-md">
                We've sorted your depleted inventory based on demand trends. Restock items with high demand percentages first to maximize potential revenue.
              </p>
            </div>
            <div className="flex gap-4 relative z-10 w-full md:w-auto">
              <div className="flex-1 md:w-32 p-4 bg-white/5 border border-white/10 rounded-[1.5rem] backdrop-blur-md">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Critical</p>
                <p className="text-2xl font-black text-rose-500">{products.filter(p => (p.demand_percentage || 0) > 70).length}</p>
              </div>
              <div className="flex-1 md:w-32 p-4 bg-white/5 border border-white/10 rounded-[1.5rem] backdrop-blur-md">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Upcoming</p>
                <p className="text-2xl font-black text-amber-500">{products.filter(p => (p.demand_percentage || 0) <= 70).length}</p>
              </div>
            </div>
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px]" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-rose-600/5 rounded-full blur-[100px]" />
          </motion.div>
        )}
      </main>
    </DashboardLayout>
  );
}