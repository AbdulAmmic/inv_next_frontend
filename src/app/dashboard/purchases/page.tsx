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
  status: "ordered" | "partial" | "received" | "cancelled";
  invoice_number?: string;
  item_count?: number;
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
          purchase_number: p.invoice_number || p.container_number || `PO-${String(p.id).slice(0, 8).toUpperCase()}`,
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
      const res = await createPurchase(purchaseData);
      const p = res.data.purchase || res.data;
      const productName = (id: string) => products.find((x) => x.id === id)?.name || "Unknown";

      setPurchases((prev) => [
        {
          id: p.id,
          purchase_number: p.invoice_number || p.container_number || `PO-${String(p.id).slice(0, 8).toUpperCase()}`,
          supplier_id: p.supplier_id,
          supplier_name: suppliers.find((x) => x.id === p.supplier_id)?.name || "Unknown",
          shop_id: p.shop_id,
          shop_name: shops.find((x) => x.id === p.shop_id)?.name || "Unknown",
          total_amount: p.total_amount,
          status: p.status || "ordered",
          date: p.created_at || new Date().toISOString(),
          items: (p.items || []).map((it: any) => ({ ...it, product_name: it.product_name || productName(it.product_id) })),
        },
        ...prev.filter((x) => x.id !== p.id),
      ]);

      toast.success(p.status === "received" ? "Purchase saved and added to stock" : "Purchase order created");
      setShowCreateModal(false);
    } catch (err: any) {
      const code = err?.response?.data?.error || "";
      toast.error(
        code.startsWith("quantity_must_be_a_whole_number") ? "Quantities must be whole numbers"
          : code === "no_items" ? "Add at least one product"
          : code ? code.replace(/_/g, " ") : "Couldn't save the purchase"
      );
      throw err;
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
      case "partial": return { color: "blue", label: "Partly received" };
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
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-sky-100 text-sky-700",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    slate: "bg-slate-100 text-slate-600",
  };

  const statusDotClasses: Record<string, string> = {
    amber: "bg-amber-500",
    blue: "bg-sky-500",
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
      (p.shop_name || "").toLowerCase().includes(q) ||
      (p.items || []).some((it: any) => (it.product_name || "").toLowerCase().includes(q));
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

  const activePurchases = purchases.filter((p) => p.status !== "cancelled");
  const totalSpent = activePurchases.reduce((s, p) => s + (Number(p.total_amount) || 0), 0);
  const pendingCount = purchases.filter((x) => x.status === "ordered" || x.status === "partial").length;
  const receivedCount = purchases.filter((x) => x.status === "received").length;

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
        {connectionError && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              You&apos;re offline. New orders are saved on this device and sync when you reconnect.
            </span>
            <button onClick={testConnection} className="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-800 text-xs font-semibold hover:bg-amber-100">
              Retry
            </button>
          </div>
        )}

        {/* Header — same layout as the Stock page */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Purchasing
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Purchases</h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full md:w-auto"
          >
            <div className="relative group w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors w-4 h-4" />
              <input
                type="text"
                placeholder="Search PO, supplier, shop, product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all w-full sm:w-64"
              />
            </div>

            <div className="relative w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none w-full bg-white border border-slate-200 rounded-xl pl-4 pr-9 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer"
              >
                <option value="all">All status</option>
                <option value="ordered">Ordered</option>
                <option value="partial">Partly received</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>

            <button
              onClick={fetchData}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-95 disabled:opacity-50 transition-all shadow-sm w-full sm:w-auto"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-200 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              New Purchase
            </button>
          </motion.div>
        </div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: "Purchases", value: activePurchases.length.toLocaleString(), icon: ShoppingCart, tone: "bg-blue-50 text-blue-600" },
            { label: "Total Spent", value: formatCurrency(totalSpent), icon: Wallet, tone: "bg-emerald-50 text-emerald-600" },
            { label: "Awaiting Delivery", value: pendingCount.toLocaleString(), icon: Truck, tone: "bg-amber-50 text-amber-600" },
            { label: "Received", value: receivedCount.toLocaleString(), icon: Package, tone: "bg-sky-50 text-sky-600" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-4 rounded-2xl flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.tone}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-lg font-bold text-slate-900 truncate">{stat.value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50"
        >
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Purchase</th>
                  <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Supplier</th>
                  <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Shop</th>
                  <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Items</th>
                  <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Total</th>
                  <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Status</th>
                  <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedPurchases.map((p) => {
                  const status = getStatusInfo(p.status);
                  const items = p.items || [];
                  const units = items.reduce((n: number, it: any) => n + Number(it.ordered_quantity || 0), 0);
                  const names = items.map((it: any) => it.product_name || "Unknown");
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/dashboard/purchases/details?id=${p.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{p.purchase_number}</div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{p.supplier_name}</td>
                      <td className="px-6 py-4 text-slate-600">{p.shop_name}</td>
                      <td className="px-6 py-4 max-w-[280px]">
                        <div className="font-medium text-slate-900">
                          {items.length} product{items.length === 1 ? "" : "s"}
                          <span className="text-slate-400 font-normal"> · {units.toLocaleString()} units</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate" title={names.join(", ")}>
                          {names.length ? names.join(", ") : "No items"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(Number(p.total_amount) || 0)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColorClasses[status.color]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDotClasses[status.color]}`} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          {p.status !== "received" && p.status !== "cancelled" && (
                            <button
                              onClick={() => router.push(`/dashboard/purchases/details?id=${p.id}`)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                              title="Receive goods"
                            >
                              Receive
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/dashboard/purchases/details?id=${p.id}&edit=1`)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/purchases/details?id=${p.id}`)}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                            title="View"
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredPurchases.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                          <Package className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No purchases found</h3>
                        <p className="text-slate-500 max-w-xs mx-auto mt-1">
                          {purchases.length ? "Try a different search or status." : "Record your first delivery from a supplier."}
                        </p>
                        {!purchases.length && (
                          <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-5 inline-flex items-center gap-2 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-slate-800"
                          >
                            <Plus className="w-4 h-4" /> New Purchase
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-slate-100">
            {paginatedPurchases.map((p) => {
              const status = getStatusInfo(p.status);
              const items = p.items || [];
              return (
                <button
                  key={p.id}
                  onClick={() => router.push(`/dashboard/purchases/details?id=${p.id}`)}
                  className="w-full text-left p-4 space-y-2 bg-white hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{p.purchase_number}</p>
                      <p className="text-xs text-slate-500 truncate">{p.supplier_name} · {p.shop_name}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColorClasses[status.color]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDotClasses[status.color]}`} />
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{items.length} product{items.length === 1 ? "" : "s"}</span>
                    <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(Number(p.total_amount) || 0)}</span>
                  </div>
                </button>
              );
            })}
            {filteredPurchases.length === 0 && (
              <div className="px-6 py-16 text-center">
                <Package className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-900">No purchases found</p>
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
