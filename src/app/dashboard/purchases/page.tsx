"use client";

import { useState, useEffect } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import {
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Search,
  ChevronDown,
  Package,
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

import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

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

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // ==========================
  // 🔍 Test API Connection
  // ==========================
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

  // ==========================
  // 📦 Fetch Data
  // ==========================
  const fetchData = async () => {
    try {
      setLoading(true);
      const connected = await testConnection();
      if (!connected) {
        toast.error("Cannot connect to server. Please ensure backend is running.");
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
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ==========================
  // 🔄 Refresh
  // ==========================
  const refreshData = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success("Purchases updated");
  };

  // ==========================
  // ➕ Create Purchase
  // ==========================
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

      toast.success("Purchase created!");
      setShowCreateModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create purchase");
    }
  };

  // ==========================
  // 🎨 Status Badge
  // ==========================
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ordered: "bg-amber-50 text-amber-700",
      receiving: "bg-blue-50 text-blue-700",
      received: "bg-emerald-50 text-emerald-700",
      cancelled: "bg-rose-50 text-rose-700",
    };

    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          colors[status] || "bg-gray-100 text-gray-600"
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // ==========================
  // 🔍 Filtering
  // ==========================
  const filteredPurchases = purchases.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.purchase_number?.toLowerCase().includes(q) ||
      p.supplier_name?.toLowerCase().includes(q) ||
      p.shop_name?.toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ==========================
  // ⏳ Loading Screen
  // ==========================
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm">Loading purchases...</p>
        </div>
      </div>
    );
  }

  // ==========================
  // MAIN PAGE
  // ==========================
  return (
    <div className="min-h-screen flex bg-white">
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isMobile={false}
      />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {/* Connection Error */}
          {connectionError && (
            <div className="mb-6 p-4 bg-rose-50 rounded-lg flex items-center gap-3 border border-rose-200">
              <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-rose-800">Connection lost</p>
              </div>
              <button
                onClick={testConnection}
                className="text-sm text-rose-700 hover:text-rose-800 font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* PAGE HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Purchases</h1>
              <p className="text-gray-500 text-sm mt-1">Manage supplier purchases</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                New Purchase
              </button>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="text-xl font-semibold text-gray-900">{purchases.length}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="text-xl font-semibold text-gray-900">
                ₦{purchases.reduce((s, p) => s + (p.total_amount || 0), 0).toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Received</p>
              <p className="text-xl font-semibold text-gray-900">
                {purchases.filter((x) => x.status === "received").length}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Ordered</p>
              <p className="text-xl font-semibold text-gray-900">
                {purchases.filter((x) => x.status === "ordered").length}
              </p>
            </div>
          </div>

          {/* FILTERS */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search purchases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 text-sm"
              />
            </div>

            <div className="relative min-w-[140px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-gray-300 text-sm appearance-none"
              >
                <option value="all">All Status</option>
                <option value="ordered">Ordered</option>
                <option value="receiving">Receiving</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase No
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shop
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredPurchases.length > 0 ? (
                  filteredPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-gray-900 text-sm">
                          {p.purchase_number || `PO-${p.id.slice(0, 8)}`}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="text-gray-700 text-sm">{p.supplier_name}</div>
                      </td>

                      <td className="p-4">
                        <div className="text-gray-700 text-sm">{p.shop_name}</div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-gray-900 text-sm">
                          ₦{(p.total_amount || 0).toLocaleString()}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="text-gray-600 text-sm">
                          {new Date(p.date).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="p-4">
                        {getStatusBadge(p.status)}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/purchases/${p.id}?edit=1`)}
                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => router.push(`/dashboard/purchases/${p.id}`)}
                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Package className="w-8 h-8 text-gray-300" />
                        <div>
                          <p className="text-gray-500 text-sm font-medium">No purchases found</p>
                          <p className="text-gray-400 text-xs mt-1">Try adjusting your search or filters</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* CREATE PURCHASE MODAL */}
          <PurchaseModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSave={handleCreatePurchase}
            suppliers={suppliers}
            shops={shops}
            products={products}
          />
        </main>
      </div>
    </div>
  );
}