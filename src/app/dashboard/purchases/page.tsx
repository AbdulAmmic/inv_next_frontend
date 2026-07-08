"use client";

import { useState, useEffect, useMemo } from "react";
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
  createSupplier,
  getSuppliers,
  getShops,
  getProducts,
  healthCheck,
} from "@/apiCalls";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Loader from "@/components/Loader";
import Pagination from "@/components/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const PAGE_SIZE = 50;

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
  const [currentUserRole, setCurrentUserRole] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const testConnection = async () => {
    try {
      const online = typeof window !== "undefined" && navigator.onLine;
      if (!online) {
        setConnectionError(true);
        return false;
      }
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

      const online = typeof window !== "undefined" && navigator.onLine;
      setConnectionError(!online);

      if (online) {
        testConnection();
      }

      const [purchasesRes, suppliersRes, shopsRes, productsRes] = await Promise.all([
        getPurchases().catch(() => ({ data: [] })),
        getSuppliers().catch(() => ({ data: [] })),
        getShops().catch(() => ({ data: [] })),
        getProducts().catch(() => ({ data: [] })),
      ]);

      const suppliersData = suppliersRes.data || [];
      const shopsData = shopsRes.data || [];

      // Maps instead of per-row .find() scans
      const supplierById = new Map(suppliersData.map((s: any) => [s.id, s]));
      const shopById = new Map(shopsData.map((sh: any) => [sh.id, sh]));

      const transformed = (purchasesRes.data || [])
        .filter((p: any) => p && p.id)
        .map((p: any) => ({
          id: p.id,
          purchase_number: p.container_number
            ? p.container_number
            : `PO-${String(p.id).slice(0, 8)}`,
          supplier_id: p.supplier_id,
          supplier_name:
            (supplierById.get(p.supplier_id) as any)?.name || "Unknown Supplier",
          shop_id: p.shop_id,
          shop_name: (shopById.get(p.shop_id) as any)?.name || "Unknown Shop",
          total_amount: p.total_amount ?? 0,
          status: p.status || "ordered",
          date: p.created_at || new Date().toISOString(),
          items: p.items || [],
        }))
        // Newest first, regardless of which data source produced the list
        .sort(
          (a: any, b: any) =>
            (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)
        );

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
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCurrentUserRole(parsed.role?.toLowerCase() || "");
      } catch {}
    }
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
          purchase_number: p.container_number || p.purchase_number || `PO-${String(p.id).slice(0, 8)}`,
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
          status: p.status || "ordered",
          date: p.created_at || new Date().toISOString(),
          // Attach product names so the new row's chips render immediately
          // (the freshly queued items only carry product_id)
          items: (p.items || []).map((it: any) => ({
            ...it,
            product_name:
              it.product_name ||
              products.find((x) => x.id === it.product_id)?.name ||
              "Unknown",
          })),
        },
        ...prev,
      ]);

      toast.success("Purchase order confirmed");
      setShowCreateModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to initiate purchase");
    }
  };

  const handleQuickAddSupplier = async (supplierData: any) => {
    const res = await createSupplier(supplierData);
    const created = res.data;
    setSuppliers((prev) => [created, ...prev.filter((s) => s.id !== created.id)]);
    toast.success("Supplier added");
    return created;
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "ordered": return { color: "amber", label: "Ordered" };
      case "receiving": return { color: "blue", label: "Receiving" };
      case "partial": return { color: "blue", label: "Partial" };
      case "received": return { color: "emerald", label: "Received" };
      case "cancelled": return { color: "rose", label: "Cancelled" };
      default: return { color: "slate", label: status };
    }
  };

  const statColorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600",
    purple: "bg-purple-50 text-purple-600",
  };

  const statusColorClasses: Record<string, string> = {
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    rose: "bg-rose-50 text-rose-600 ring-rose-100",
    slate: "bg-slate-50 text-slate-600 ring-slate-100",
  };

  const statusDotClasses: Record<string, string> = {
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    slate: "bg-slate-500",
  };

  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [page, setPage] = useState(1);

  const filteredPurchases = useMemo(() => purchases.filter((p) => {
    const q = debouncedSearch.toLowerCase();
    const matchesSearch =
      (p.purchase_number || "").toLowerCase().includes(q) ||
      (p.supplier_name || "").toLowerCase().includes(q) ||
      (p.shop_name || "").toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [purchases, debouncedSearch, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredPurchases.length / PAGE_SIZE));
  const paginatedPurchases = useMemo(
    () => filteredPurchases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredPurchases, page]
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const totalSpent = purchases.reduce((s, p) => s + (p.total_amount || 0), 0);
  const pendingCount = purchases.filter(x => x.status === "ordered" || x.status === "receiving").length;

  const formatCurrency = (val: number) => {
    if (currentUserRole !== "admin" && currentUserRole !== "subadmin") return "₦******";
    return `₦${val.toLocaleString()}`;
  };

  if (loading && purchases.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader text="Loading Supply Chain..." subText="Synchronizing your procurement logs" />
      </div>
    );
  }

  return (
    <>
      <main className="p-4 sm:p-6 lg:p-10 space-y-6 lg:space-y-8 max-w-[100vw] overflow-hidden">
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
                  className="shrink-0 px-4 py-2 bg-white text-rose-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-rose-100 transition-all border border-rose-200"
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
            className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto"
          >
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-sm w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl px-4 sm:px-6 py-2.5 text-sm font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-200 group w-full sm:w-auto"
            >
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
              New Purchase Order
            </button>
          </motion.div>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
          {[
            { label: "Total Orders", value: purchases.length, icon: ShoppingCart, color: "blue", delay: 0 },
            { label: "Procurement Mass", value: formatCurrency(totalSpent), icon: Wallet, color: "emerald", delay: 0.1 },
            { label: "Active Pipeline", value: pendingCount, icon: Truck, color: "indigo", delay: 0.2 },
            { label: "Vendor Count", value: suppliers.length, icon: BarChart3, color: "purple", delay: 0.3 }
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stat.delay }}
              className="glass-card p-4 sm:p-6 rounded-2xl flex items-center justify-between border-white group/stat hover:shadow-2xl hover:shadow-slate-200/50 transition-all cursor-default min-w-0"
            >
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{stat.label}</p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1 break-words">{stat.value}</p>
              </div>
              <div className={`p-3 sm:p-4 ${statColorClasses[stat.color]} rounded-2xl group-hover/stat:rotate-12 transition-transform shrink-0`}>
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
          className="glass-card p-4 rounded-2xl flex flex-col md:flex-row gap-4 shadow-xl shadow-slate-200/50 group"
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
              className="appearance-none bg-white border border-slate-200 rounded-xl pl-5 pr-12 py-3.5 text-sm font-bold text-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm cursor-pointer w-full md:min-w-[160px]"
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
          className="glass-card rounded-2xl overflow-hidden border border-slate-100 shadow-2xl shadow-slate-200/50"
        >
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 italic">
                  <th className="px-8 py-6 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Registry Info</th>
                  <th className="px-8 py-6 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Stakeholders</th>
                  <th className="px-8 py-6 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Products</th>
                  <th className="px-8 py-6 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Capital Allocation</th>
                  <th className="px-8 py-6 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Current Status</th>
                  <th className="px-8 py-6 font-bold text-slate-500 uppercase tracking-widest text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence mode="popLayout">
                  {paginatedPurchases.map((p, idx) => {
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
                              <h3 className="font-bold text-slate-900 text-[15px] tracking-tight group-hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/purchases/details?id=${p.id}`)}>
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
                        <td className="px-8 py-6">
                          <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                            {p.items?.slice(0, 2).map((item, i) => (
                              <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-bold truncate max-w-[150px]" title={item.product_name}>
                                {item.product_name || 'Unknown'} (x{item.ordered_quantity})
                              </span>
                            ))}
                            {(p.items?.length || 0) > 2 && (
                              <span className="px-2 py-1 bg-slate-50 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-bold">
                                +{(p.items?.length || 0) - 2} more
                              </span>
                            )}
                            {(!p.items || p.items.length === 0) && (
                              <span className="text-[10px] text-slate-400 italic">No items</span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-sm">
                          <div className="font-black text-slate-900">
                            {formatCurrency(p.total_amount || 0)}
                          </div>
                          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter italic">Total Net Procurement</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 ${statusColorClasses[status.color]} rounded-full text-[10px] font-black uppercase tracking-widest ring-1`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDotClasses[status.color]} animate-pulse`} />
                            {status.label}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => router.push(`/dashboard/purchases/details?id=${p.id}&edit=1`)}
                              className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl transition-all shadow-sm group/btn"
                            >
                              <Edit className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>
                            <button
                              onClick={() => router.push(`/dashboard/purchases/details?id=${p.id}`)}
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
                    <td colSpan={6} className="p-8 sm:p-16 lg:p-24 text-center">
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

          {/* Mobile Card Layout */}
          <div className="md:hidden flex flex-col divide-y divide-slate-100/50">
            <AnimatePresence mode="popLayout">
              {paginatedPurchases.map((p, idx) => {
                const status = getStatusInfo(p.status);
                return (
                  <motion.div
                    layout
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-5 flex flex-col gap-4 bg-white/50 hover:bg-white transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 text-slate-900 rounded-[1rem] flex items-center justify-center font-black text-xs shadow-inner uppercase tracking-tighter shrink-0">
                          #{p.purchase_number.split('-')[1] || p.purchase_number.slice(-4)}
                        </div>
                        <div>
                          <h3 
                            className="font-bold text-slate-900 text-sm tracking-tight cursor-pointer"
                            onClick={() => router.push(`/dashboard/purchases/details?id=${p.id}`)}
                          >
                            {p.purchase_number}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5 opacity-60 text-slate-500">
                            <Calendar className="w-3 h-3" />
                            <p className="text-[10px] font-black uppercase tracking-widest">{new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                        </div>
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${statusColorClasses[status.color]} rounded-lg text-[10px] font-black uppercase tracking-widest ring-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDotClasses[status.color]} animate-pulse`} />
                        {status.label}
                      </div>
                    </div>

                    <div className="bg-slate-50/50 rounded-xl p-3 space-y-2 border border-slate-100/50">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-slate-100 text-slate-400">
                          <Truck className="w-3 h-3" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 truncate">{p.supplier_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-slate-100 text-slate-400">
                          <Package className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{p.shop_name}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {p.items?.slice(0, 2).map((item, i) => (
                        <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-bold truncate max-w-[150px]">
                          {item.product_name || 'Unknown'} (x{item.ordered_quantity})
                        </span>
                      ))}
                      {(p.items?.length || 0) > 2 && (
                        <span className="px-2 py-1 bg-slate-50 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-bold">
                          +{(p.items?.length || 0) - 2}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-100/50">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">Total Amount</p>
                        <div className="font-black text-slate-900 text-sm">
                          {formatCurrency(p.total_amount || 0)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/purchases/details?id=${p.id}&edit=1`)}
                          className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl transition-all shadow-sm"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/purchases/details?id=${p.id}`)}
                          className="p-2 bg-slate-900 text-white rounded-xl shadow-md"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredPurchases.length === 0 && (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-slate-200" />
                </div>
                <h3 className="font-extrabold text-slate-900">Purchase Registry Empty</h3>
                <p className="text-slate-400 text-xs mt-2 font-medium">
                  No inbound records found.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-6 flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all text-xs"
                >
                  Establish Order <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <Pagination
            page={page}
            pageCount={pageCount}
            totalItems={filteredPurchases.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </motion.div>
      </main>

      {/* REGISTRY MODAL */}
      <PurchaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreatePurchase}
        onProductAdded={(newProduct) => setProducts((prev) => [...prev, newProduct])}
        onSupplierAdded={handleQuickAddSupplier}
        suppliers={suppliers}
        shops={shops}
        products={products}
      />
    </>
  );
}
