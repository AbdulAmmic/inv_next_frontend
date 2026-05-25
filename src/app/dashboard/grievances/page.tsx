"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  RefreshCw, 
  Trash2, 
  TrendingDown, 
  FileText, 
  Layers, 
  Calendar,
  ShieldAlert,
  MapPin,
  ClipboardList
} from "lucide-react";
import { db } from "@/db";
import { getAdjustments } from "@/apiCalls";
import Loader from "@/components/Loader";
import { toast } from "react-hot-toast";

interface Grievance {
  id: string;
  product_id: string;
  product_name?: string;
  shop_id: string;
  shop_name?: string;
  adjustment_type: string;
  quantity: number;
  note: string;
  created_at: string;
  cost?: number;
  total_loss?: number;
}

export default function GrievancesPage() {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShop, setSelectedShop] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [shops, setShops] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch adjustments, products, and shops concurrently
      const [adjRes, dbProducts, dbShops] = await Promise.all([
        getAdjustments(),
        db.products.toArray(),
        db.shops.toArray()
      ]);

      setShops(dbShops);

      const productMap = new Map(dbProducts.map(p => [p.id, p]));
      const shopMap = new Map(dbShops.map(s => [s.id, s]));

      // Query stocks to get cost pricing
      const dbStocks = await db.stocks.toArray();
      const stockCostMap = new Map<string, number>();
      for (const stock of dbStocks) {
        stockCostMap.set(`${stock.shop_id}_${stock.product_id}`, Number(stock.shop_cost_price ?? stock.cost_price ?? 0));
      }

      // Map raw adjustments to rich Grievances view model
      const richGrievances: Grievance[] = (adjRes.data || [])
        .filter((a: any) => !a.is_deleted && (a.adjustment_type === 'grievance' || a.adjustment_type === 'broken' || a.adjustment_type === 'lost' || a.adjustment_type === 'damaged'))
        .map((a: any) => {
          const product = productMap.get(a.product_id);
          const shop = shopMap.get(a.shop_id);
          
          // Get cost: shop-specific cost map, then product default catalog cost
          const shopCost = stockCostMap.get(`${a.shop_id}_${a.product_id}`);
          const cost = shopCost ?? Number(product?.cost_price ?? 0);
          const qty = Number(a.quantity || 0);

          return {
            id: a.id,
            product_id: a.product_id,
            product_name: product?.name || "Unknown Product",
            shop_id: a.shop_id,
            shop_name: shop?.name || "Unknown Shop",
            adjustment_type: a.adjustment_type || "grievance",
            quantity: qty,
            note: a.note || "No comments",
            created_at: a.created_at || a.updated_at || new Date().toISOString(),
            cost: cost,
            total_loss: qty * cost
          };
        });

      // Sort by date descending
      richGrievances.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setGrievances(richGrievances);
    } catch (err) {
      console.error("Grievances load failed:", err);
      toast.error("Failed to load grievances history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtering
  const filteredGrievances = grievances.filter(g => {
    const matchesSearch = 
      g.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.note?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesShop = selectedShop === "all" || g.shop_id === selectedShop;
    const matchesType = selectedType === "all" || g.adjustment_type === selectedType;

    return matchesSearch && matchesShop && matchesType;
  });

  const totalFinancialLoss = filteredGrievances.reduce((sum, g) => sum + (g.total_loss || 0), 0);
  const totalItemsLost = filteredGrievances.reduce((sum, g) => sum + (g.quantity || 0), 0);

  const formatCurrency = (n: number) =>
    "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader text="Loading grievances history..." />
      </div>
    );
  }

  return (
    <main className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
            Grievances History
          </h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">
            Damaged, Lost, & Broken Stock Register
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-sm"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Analytics widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Total Damaged Incidents
            </p>
            <h3 className="text-2xl font-black text-slate-800">
              {filteredGrievances.length}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Reported events in register</p>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Total Units Wasted
            </p>
            <h3 className="text-2xl font-black text-slate-800">
              {totalItemsLost.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Total quantity written off</p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-500 border border-amber-100 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Financial Capital Written Off
            </p>
            <h3 className="text-2xl font-black text-rose-600">
              {formatCurrency(totalFinancialLoss)}
            </h3>
            <p className="text-xs text-rose-400 mt-1 font-semibold">Integrated with finance reports</p>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by product name or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <select
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="all">All Shops</option>
                {shops.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="grievance">Grievance</option>
                <option value="broken">Broken</option>
                <option value="lost">Lost</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Grid / Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Product</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Shop</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Qty</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Cost Price</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Capital Loss</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGrievances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-20">
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <ShieldAlert className="w-16 h-16 mb-4 text-slate-200" />
                      <p className="text-base font-bold">No grievances registered</p>
                      <p className="text-xs text-slate-400 font-semibold mt-1">All clean. No damaged stock reported.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredGrievances.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(g.created_at).toLocaleDateString()}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-semibold">
                        {new Date(g.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-slate-800">
                      {g.product_name}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">
                      {g.shop_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${
                        g.adjustment_type === "broken"
                          ? "bg-amber-50 text-amber-600 border-amber-100"
                          : g.adjustment_type === "lost"
                          ? "bg-slate-50 text-slate-600 border-slate-100"
                          : "bg-rose-50 text-rose-600 border-rose-100"
                      }`}>
                        {g.adjustment_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-700 text-center">
                      {g.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-600 text-right">
                      {formatCurrency(g.cost || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-rose-600 text-right">
                      {formatCurrency(g.total_loss || 0)}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500 max-w-xs truncate" title={g.note}>
                      {g.note}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
