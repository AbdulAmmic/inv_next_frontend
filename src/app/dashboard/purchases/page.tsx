"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboardLayout";
import {
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Search,
  ChevronDown,
  Package,
  ShoppingCart,
  Truck,
  Calendar,
  ArrowRight,
  MoreVertical,
  LayoutGrid,
  List as ListIcon,
  BarChart3,
  TrendingUp,
  Wallet,
  AlertCircle
} from "lucide-react";
import PurchaseModal from "./purhcaseModal";
import {
  getPurchases,
  createPurchase,
  getSuppliers,
  getShops,
  getProducts,
  healthCheck,
} from "@/apiCalls";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Loader from "@/components/Loader";

interface Purchase {
  id: string;
  purchase_number: string;
  supplier_id: string;
  supplier_name: string;
  shop_id: string;
  shop_name: string;
  vat_percent?: number;
  other_charges?: number;
  loss_amount?: number;
  container_number?: string;
  total_amount: number;
  status: "ordered" | "receiving" | "received" | "cancelled";
  date: string;
  items: any[];
}

interface Supplier {
  id: string;
  name: string;
}

interface Shop {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  cost_price: number;
}

export default function PurchasesPage() {
  const router = useRouter();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const testConnection = async () => {
    try {
      await healthCheck();
      setConnectionError(false);
      return true;
    } catch {
      setConnectionError(true);
      return false;
    }
  };

  const fetchData = async () => {
    try {
      if (purchases.length === 0) setLoading(true);
      else setRefreshing(true);

      const connected = await testConnection();
      if (!connected) {
        toast.error("Database connection unavailable. Please check backend.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [purchasesRes, suppliersRes, shopsRes, productsRes] = await Promise.all([
        getPurchases().catch(() => ({ data: [] })),
        getSuppliers().catch(() => ({ data: [] })),
        getShops().catch(() => ({ data: [] })),
        getProducts().catch(() => ({ data: [] })),
      ]);

      const suppliersData = suppliersRes.data || [];
      const shopsData = shopsRes.data || [];

      const transformed = (purchasesRes.data || []).map((p: any) => ({
        id: p.id,
        purchase_number: p.container_number
          ? p.container_number
          : `PO-${p.id.slice(0, 8)}`,
        supplier_id: p.supplier_id,
        supplier_name:
          suppliersData.find((s: any) => s.id === p.supplier_id)?.name ||
          "Unknown Supplier",
        shop_id: p.shop_id,
        shop_name:
          shopsData.find((sh: any) => sh.id === p.shop_id)?.name ||
          "Unknown Shop",
        total_amount: p.total_amount ?? 0,
        status: p.status || "ordered",
        date: p.created_at,
        items: p.items || [],
      }));

      setPurchases(transformed);
      setSuppliers(suppliersData);
      setShops(shopsData);
      setProducts(productsRes.data || []);

    } catch (err) {
      toast.error("Failed to synchronize purchase records");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePurchase = async (purchaseData: any) => {
    try {
      const payload = {
        supplier_id: purchaseData.supplier_id,
        shop_id: purchaseData.shop_id,
        vat_percent: Number(purchaseData.vat_percent) || 0,
        other_charges: Number(purchaseData.other_charges) || 0,
        container_number: purchaseData.container_number || null,
        items: purchaseData.items.map((item: any) => ({
          product_id: item.product_id,
          quantity: Number(item.quantity),
          cost: Number(item.cost_price),
          selling_price: Number(item.selling_price) || item.cost_price * 1.2,
        })),
      };

      const res = await createPurchase(payload);
      const p = res.data.purchase || res.data;

      setPurchases((prev) => [
        {
          id: p.id,
          purchase_number: p.purchase_number || `PO-${p.id.slice(0, 8)}`,
          supplier_id: p.supplier_id,
          supplier_name:
            suppliers.find((x) => x.id === p.supplier_id)?.name || "Unknown",
          shop_id: p.shop_id,
          shop_name:
            shops.find((x) => x.id === p.shop_id)?.name || "Unknown",
          vat_percent: p.vat_percent,
          other_charges: p.other_charges,
          loss_amount: p.loss_amount,
          container_number: p.container_number,
          total_amount: p.total_amount,
          status: p.status,
          date: p.created_at,
          items: p.items || [],
        },
        ...prev,
      ]);

      toast.success("Purchase order confirmed");
      setShowCreateModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to initiate purchase");
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "ordered": return { color: "amber", label: "Ordered" };
      case "receiving": return { color: "blue", label: "Receiving" };
      case "received": return { color: "emerald", label: "Received" };
      case "cancelled": return { color: "rose", label: "Cancelled" };
      default: return { color: "slate", label: status };
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (p.purchase_number || "").toLowerCase().includes(q) ||
      (p.supplier_name || "").toLowerCase().includes(q) ||
      (p.shop_name || "").toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalSpent = purchases.reduce((s, p) => s + (p.total_amount || 0), 0);
  const pendingCount = purchases.filter(x => x.status === "ordered" || x.status === "receiving").length;

  if (loading && purchases.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader text="Loading Supply Chain..." subText="Synchronizing your procurement logs" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="p-6 lg:p-10 space-y-8">
        {/* Connection Alert */}
        <AnimatePresence>
          {connectionError && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-[1.2rem] flex items-center justify-between shadow-lg shadow-rose-100/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-200 text-rose-600 rounded-lg animate-pulse">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-rose-900 text-sm italic">System Link Down</h4>
                    <p className="text-rose-600 text-xs font-bold uppercase tracking-widest mt-0.5">Disconnected from inventory core</p>
                  </div>
                </div>
                <button
                  onClick={testConnection}
                  className="px-4 py-2 bg-white text-rose-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-rose-100 transition-all border border-rose-200"
                >
                  Reconnect Now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Supply Chain
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Purchases
            </h1>
            <p className="text-slate-500 font-medium mt-1">Manage vendor procurement and global inbound stock</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-200 group"
            >
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
              New Purchase Order
            </button>
          </motion.div>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Total Orders", value: purchases.length, icon: ShoppingCart, color: "blue", delay: 0 },
            { label: "Procurement Mass", value: `₦${totalSpent.toLocaleString()}`, icon: Wallet, color: "emerald", delay: 0.1 },
            { label: "Active Pipeline", value: pendingCount, icon: Truck, color: "indigo", delay: 0.2 },
            { label: "Vendor Count", value: suppliers.length, icon: BarChart3, color: "purple", delay: 0.3 }
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stat.delay }}
              className="glass-card p-6 rounded-[2rem] flex items-center justify-between border-white group/stat hover:shadow-2xl hover:shadow-slate-200/50 transition-all cursor-default"
            >
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{stat.label}</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-4 bg-${stat.color}-50 text-${stat.color}-600 rounded-[1.3rem] group-hover/stat:rotate-12 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4 rounded-[1.5rem] flex flex-col md:flex-row gap-4 shadow-xl shadow-slate-200/50 group"
        >
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors w-5 h-5" />
            <input
              type="text"
              placeholder="Search by PO number, supplier, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50/50 border border-slate-100 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all font-medium text-slate-700 underline-offset-4 ring-offset-2"
            />
          </div>

          <div className="relative group/select">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl pl-5 pr-12 py-3.5 text-sm font-bold text-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm cursor-pointer min-w-[160px]"
            >
              <option value="all">Global Status</option>
              <option value="ordered">Ordered</option>
              <option value="receiving">Receiving</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none group-focus-within/select:rotate-180 transition-transform" />
          </div>
        </motion.div>

        {/* Global Registry Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 shadow-2xl shadow-slate-200/50"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 italic">
                  <th className="px-8 py-6 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Registry Info</th>
                  <th className="px-8 py-6 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Stakeholders</th>
                  <th className="px-8 py-6 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Capital Allocation</th>
                  <th className="px-8 py-6 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Current Status</th>
                  <th className="px-8 py-6 font-bold text-slate-500 uppercase tracking-widest text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence mode="popLayout">
                  {filteredPurchases.map((p, idx) => {
                    const status = getStatusInfo(p.status);
                    return (
                      <motion.tr
                        layout
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 text-slate-900 rounded-[1.2rem] flex items-center justify-center font-black text-xs shadow-inner uppercase tracking-tighter">
                              #{p.purchase_number.split('-')[1] || p.purchase_number.slice(-4)}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-[15px] tracking-tight group-hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/purchases/${p.id}`)}>
                                {p.purchase_number}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
                                <Calendar className="w-3 h-3" />
                                <p className="text-[10px] font-black uppercase tracking-widest">{new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded bg-slate-100 text-slate-400 group-hover:text-amber-600 transition-colors">
                                <Truck className="w-3 h-3" />
                              </div>
                              <span className="text-xs font-bold text-slate-700">{p.supplier_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded bg-slate-100 text-slate-400">
                                <Package className="w-3 h-3" />
                              </div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.shop_name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-sm">
                          <div className="font-black text-slate-900">
                            ₦{(p.total_amount || 0).toLocaleString()}
                          </div>
                          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter italic">Total Net Procurement</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 bg-${status.color}-50 text-${status.color}-600 rounded-full text-[10px] font-black uppercase tracking-widest ring-1 ring-${status.color}-100`}>
                            <span className={`w-1.5 h-1.5 rounded-full bg-${status.color}-500 animate-pulse`} />
                            {status.label}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => router.push(`/dashboard/purchases/${p.id}?edit=1`)}
                              className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl transition-all shadow-sm group/btn"
                            >
                              <Edit className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>
                            <button
                              onClick={() => router.push(`/dashboard/purchases/${p.id}`)}
                              className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200 group/btn"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>

                {filteredPurchases.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-24 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6">
                          <Package className="w-10 h-10 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Purchase Registry Empty</h3>
                        <p className="text-slate-400 max-w-xs mx-auto mt-2 font-medium italic">
                          No inbound records found. Initiate a new purchase order to track supplier inventory movements.
                        </p>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="mt-8 flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
                        >
                          Establish Order
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>

      {/* REGISTRY MODAL */}
      <PurchaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreatePurchase}
        suppliers={suppliers}
        shops={shops}
        products={products}
      />
    </DashboardLayout>
  );
}