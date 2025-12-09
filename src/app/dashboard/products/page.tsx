"use client";

import { useEffect, useState } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import ProductsStats from "@/components/productsStats";
import ProductsTable from "@/components/productsTable";
import ProductFormModal from "@/components/productsModal";
import DeleteProductModal from "@/components/deleteProductsModal";
import { Plus, RefreshCw, Filter, AlertCircle } from "lucide-react";
import { getProducts, deleteProduct, getShops } from "@/apiCalls";
import type { Product, StockStatus } from "@/app/types/products";
import { toast } from "react-toastify";

interface Shop {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>("");

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
    // Filter products where stockQuantity is 0
    const outOfStockProducts = products.filter((p) => p.stockQuantity === 0);
    setFilteredProducts(outOfStockProducts);
    setStockFilter("outOfStock"); // Set the dropdown to match
    toast.info(`Showing ${outOfStockProducts.length} out-of-stock products`);
  };

  // ------------------------------------------------
  // CLEAR FILTERS
  // ------------------------------------------------
  const handleClearFilters = () => {
    setStockFilter("");
    setFilteredProducts(products);
    setSearch("");
    toast.info("Filters cleared");
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------
  // MAIN UI
  // ------------------------------------------------
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        isMobile={false}
        toggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <div className="flex flex-1 flex-col transition-all duration-300">
        <Header />

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {/* Top bar */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                Products
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your inventory and product catalog by shop
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm hover:shadow disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </button>
            </div>
          </div>

          {/* Search + Filter Bar */}
          <div className="mb-4 flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name, SKU, or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Out of Stock Button */}
                <button
                  onClick={handleShowOutOfStock}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    stockFilter === "outOfStock"
                      ? "bg-red-100 text-red-700 ring-2 ring-red-300"
                      : "bg-white text-gray-700 hover:bg-red-50 hover:text-red-600"
                  } border border-gray-200 shadow-sm`}
                >
                  <AlertCircle className="h-4 w-4" />
                  Show Out of Stock
                </button>

                {/* Stock Filter Dropdown */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value as any)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Products</option>
                    <option value="inStock">In Stock</option>
                    <option value="lowStock">Low Stock</option>
                    <option value="outOfStock">Out of Stock</option>
                  </select>
                </div>

                {/* Clear Filters Button */}
                {(stockFilter || search) && (
                  <button
                    onClick={handleClearFilters}
                    className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Active Filters Indicator */}
            {stockFilter && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Showing:</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                  {stockFilter === "outOfStock" && "Out of Stock Products"}
                  {stockFilter === "lowStock" && "Low Stock Products"}
                  {stockFilter === "inStock" && "In Stock Products"}
                  <button
                    onClick={handleClearFilters}
                    className="ml-1 rounded-full p-0.5 hover:bg-blue-200"
                  >
                    ×
                  </button>
                </span>
                <span className="text-sm text-gray-500">
                  ({filteredProducts.length} products)
                </span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mb-4">
            <ProductsStats products={filteredProducts} />
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
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
            />
          </div>
        </main>
      </div>

      {/* MODALS */}
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
    </div>
  );
}