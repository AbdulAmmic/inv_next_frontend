"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboardLayout";
import ProductsStats from "@/components/productsStats";
import ProductsTable from "@/components/productsTable";
import ProductFormModal from "@/components/productsModal";
import DeleteProductModal from "@/components/deleteProductsModal";
import { getProducts, updateProduct, deleteProduct, getShops, getSuppliers, createProduct } from "@/apiCalls";
import type { Product, StockStatus } from "@/app/types/products";
import { toast } from "react-hot-toast";
import { Plus, Search, Filter, MoreVertical, LayoutGrid, List as ListIcon, Download, RefreshCw, Package, ArrowUpRight, TrendingUp, AlertCircle, Trash2, Edit2, Image as ImageIcon, Camera, X, Loader2, Save, ShoppingCart, Truck, Store, BarChart3, ChevronDown } from "lucide-react";
import Loader from "@/components/Loader";
import { motion, AnimatePresence } from "framer-motion";

interface Shop {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");

  const [stockFilter, setStockFilter] = useState<
    "" | "outOfStock" | "lowStock" | "inStock"
  >("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ------------------------------------------------
  // UTIL – determine stock status
  // ------------------------------------------------
  const getStockStatus = (quantity: number, minQty: number): StockStatus => {
    if (quantity <= 0) return "outOfStock";
    if (quantity <= minQty) return "lowStock";
    return "inStock";
  };

  // ------------------------------------------------
  // INIT: load shops + set current shop
  // ------------------------------------------------
  useEffect(() => {
    const init = async () => {
      try {
        const res = await getShops();
        const list: Shop[] = res.data || [];
        setShops(list);

        let initialShopId = "";

        if (typeof window !== "undefined") {
          const storedShop = localStorage.getItem("selected_shop_id");
          const userRaw = localStorage.getItem("user");

          if (storedShop) {
            initialShopId = storedShop;
          } else if (userRaw) {
            try {
              const user = JSON.parse(userRaw);
              if (user.role) {
                setUserRole(user.role);
              }
              if (user.role !== "admin" && user.shop_id) {
                initialShopId = user.shop_id;
              }
            } catch {
              // ignore JSON errors
            }
          }
        }

        if (!initialShopId && list.length > 0) {
          initialShopId = list[0].id;
        }

        setSelectedShop(initialShopId);
        if (initialShopId && typeof window !== "undefined") {
          localStorage.setItem("selected_shop_id", initialShopId);
        }

        await fetchProducts(initialShopId);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load shops/products");
        setLoading(false);
      }
    };

    init();
  }, []);

  // ------------------------------------------------
  // FETCH PRODUCTS
  // ------------------------------------------------
  const fetchProducts = async (shopId: string) => {
    try {
      setLoading(true);
      const res = await getProducts({
        shop_id: shopId || undefined,
        include_stock: true,
      });

      const raw: any[] = res.data || [];

      const mapped: Product[] = raw.map((p) => {
        const stock = p.stock || {};
        const quantity = stock.quantity ?? 0;
        const minQty = stock.min_quantity ?? 0;
        const maxQty = stock.max_quantity ?? undefined;

        const price =
          stock.price != null ? Number(stock.price) : Number(p.price || 0);

        const cost =
          stock.cost_price != null
            ? Number(stock.cost_price)
            : Number(p.cost_price || 0);

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          category: p.category,
          description: p.description,
          costPrice: cost,
          sellingPrice: price,
          profitMargin: price - cost,
          stockQuantity: quantity,
          min_quantity: minQty,
          max_quantity: maxQty,
          shop_id: shopId || null,
          status: getStockStatus(quantity, minQty),
        };
      });

      setProducts(mapped);
      setFilteredProducts(mapped);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------
  // REFRESH
  // ------------------------------------------------
  const handleRefresh = async () => {
    if (!selectedShop) return;
    setRefreshing(true);
    await fetchProducts(selectedShop);
    setRefreshing(false);
    toast.success("Products refreshed");
  };

  // ------------------------------------------------
  // FILTER HANDLER (Search + Stock)
  // ------------------------------------------------
  useEffect(() => {
    let list = [...products];

    // Search filter
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(term) ||
          (p.sku || "").toLowerCase().includes(term) ||
          (p.category || "").toLowerCase().includes(term)
      );
    }

    // Stock status filter
    if (stockFilter) {
      list = list.filter((p) => p.status === stockFilter);
    }

    setFilteredProducts(list);
  }, [search, stockFilter, products]);

  // ------------------------------------------------
  // OUT OF STOCK BUTTON HANDLER
  // ------------------------------------------------
  const handleShowOutOfStock = () => {
    const outOfStockProducts = products.filter((p) => p.stockQuantity === 0);
    setFilteredProducts(outOfStockProducts);
    setStockFilter("outOfStock");
    toast(`Showing ${outOfStockProducts.length} out-of-stock products`, { icon: '📦' });
  };

  // ------------------------------------------------
  // CLEAR FILTERS
  // ------------------------------------------------
  const handleClearFilters = () => {
    setStockFilter("");
    setFilteredProducts(products);
    setSearch("");
    toast.success("Filters cleared");
  };

  // ------------------------------------------------
  // ADD / EDIT / DELETE HANDLERS
  // ------------------------------------------------
  const handleProductSaved = () => {
    fetchProducts(selectedShop);
  };

  const handleDeleteSingle = async (id: string) => {
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Product deleted");
      setShowDeleteModal(false);
      setSelectedProduct(null);
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to delete product");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedProducts.length) return;
    try {
      await Promise.all(selectedProducts.map((id) => deleteProduct(id)));
      setProducts((prev) =>
        prev.filter((p) => !selectedProducts.includes(p.id))
      );
      setSelectedProducts([]);
      toast.success("Selected products deleted");
    } catch {
      toast.error("Failed to delete some products");
    }
  };

  // ------------------------------------------------
  // LOADING STATE
  // ------------------------------------------------
  if (loading && products.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader text="Initializing Catalog..." subText="Loading your global inventory" />
        </div>
      </DashboardLayout>
    );
  }

  // ------------------------------------------------
  // MAIN UI
  // ------------------------------------------------
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
              <div className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Catalog
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Products
            </h1>
            <p className="text-slate-500 font-medium mt-1">Manage physical inventory and digital catalog</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 group"
            >
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
              Add Product
            </button>
          </motion.div>
        </div>

        {/* Filters & Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 rounded-[1.5rem] flex flex-col md:flex-row gap-4 shadow-xl shadow-slate-200/50"
        >
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors w-4 h-4" />
            <input
              type="text"
              placeholder="Search products by name, SKU, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50/50 border border-slate-100 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium text-slate-700 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleShowOutOfStock}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${stockFilter === "outOfStock"
                ? "bg-rose-50 border-rose-200 text-rose-600 ring-4 ring-rose-50"
                : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50 border-slate-200 shadow-sm"
                }`}
            >
              <AlertCircle className="w-4 h-4" />
              Out of Stock
            </button>

            <div className="relative group/select">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm cursor-pointer"
              >
                <option value="">All Status</option>
                <option value="inStock">In Stock</option>
                <option value="lowStock">Low Stock</option>
                <option value="outOfStock">Out of Stock</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none group-focus-within/select:rotate-180 transition-transform" />
            </div>

            {(stockFilter || search) && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </motion.div>

        {/* Stats Section */}
        <ProductsStats products={filteredProducts} />

        {/* Main Content Table Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50"
        >
          <ProductsTable
            products={filteredProducts}
            selectedProducts={selectedProducts}
            onSelectProduct={setSelectedProducts}
            onEditProduct={(p: Product) => {
              setSelectedProduct(p);
              setShowEditModal(true);
            }}
            onDeleteProduct={(p: Product) => {
              setSelectedProduct(p);
              setShowDeleteModal(true);
            }}
            onBulkDelete={handleBulkDelete}
            userRole={userRole}
          />
        </motion.div>
      </main>

      {/* MODALS */}
      <AnimatePresence>
        {showAddModal && (
          <ProductFormModal
            onClose={() => setShowAddModal(false)}
            onSave={handleProductSaved}
          />
        )}

        {showEditModal && selectedProduct && (
          <ProductFormModal
            product={selectedProduct}
            onClose={() => {
              setShowEditModal(false);
              setSelectedProduct(null);
            }}
            onSave={handleProductSaved}
          />
        )}

        {showDeleteModal && selectedProduct && (
          <DeleteProductModal
            product={selectedProduct}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedProduct(null);
            }}
            onDelete={(id) => handleDeleteSingle(id)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}