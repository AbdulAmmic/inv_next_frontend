"use client";

import { useState, useEffect } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import ProductsHeader from "@/components/productsHeader";
import ProductsFilters from "@/components/productsFilter";
import ProductsStats from "@/components/productsStats";
import ProductsTable from "@/components/productsTable";
import ProductFormModal from "@/components/productsModal";
import DeleteProductModal from "@/components/deleteProductsModal";
import { Menu } from "lucide-react";

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Check if on mobile and adjust sidebar
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Mock data
  useEffect(() => {
    const mockProducts: Product[] = [
      {
        id: "1",
        name: "Sample Product",
        sku: "SKU123",
        category: "Electronics",
        stockQuantity: 25,
        unit: "pcs",
        costPrice: 100,
        sellingPrice: 150,
        profitMargin: 50,
        unitsSold: 10,
        variants: 0,
        store: "Main Store",
      },
    ];
    setProducts(mockProducts);
    setFilteredProducts(mockProducts);
  }, []);

  // Filters
  useEffect(() => {
    let result = products;

    if (searchTerm) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (selectedStatus !== "all") {
      if (selectedStatus === "inStock") {
        result = result.filter((p) => p.stockQuantity > 0);
      } else if (selectedStatus === "outOfStock") {
        result = result.filter((p) => p.stockQuantity === 0);
      } else if (selectedStatus === "lowStock") {
        result = result.filter((p) => p.stockQuantity < 10);
      }
    }

    setFilteredProducts(result);
  }, [products, searchTerm, selectedCategory, selectedStatus]);

  const handleAddProduct = (product: Omit<Product, "id">) => {
    const newProduct = { ...product, id: Math.random().toString(36).substr(2, 9) };
    setProducts([...products, newProduct]);
  };

  const handleEditProduct = (product: Product | Omit<Product, 'id'>) => {
    // If product has id, it's an edit; otherwise, ignore (shouldn't happen for edit modal)
    if ('id' in product) {
      setProducts(products.map((p) => (p.id === product.id ? product as Product : p)));
    }
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} isMobile={isMobile} toggleSidebar={toggleSidebar} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col transition-all duration-300">
        <Header />

        <main className="p-6 overflow-y-auto">
          <div className="flex items-center mb-6">
            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="mr-3 p-2 rounded-lg bg-white border border-gray-200 shadow-sm"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-800">Products</h1>
          </div>

          {/* Page sections */}
          <ProductsHeader onAddProduct={() => setIsAddModalOpen(true)} />
          <ProductsFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
          />
          <ProductsStats products={filteredProducts} />
          <ProductsTable
            products={filteredProducts}
            selectedProducts={selectedProducts}
            onSelectProduct={setSelectedProducts}
            onEditProduct={(product) => {
              setSelectedProduct(product);
              setIsEditModalOpen(true);
            }}
            onDeleteProduct={(product) => {
              setSelectedProduct(product);
              setIsDeleteModalOpen(true);
            }}
          />
        </main>
      </div>

      {/* Modals */}
      {isAddModalOpen && (
        <ProductFormModal
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleAddProduct}
        />
      )}
      {isEditModalOpen && selectedProduct && (
        <ProductFormModal
          product={selectedProduct}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleEditProduct}
        />
      )}
      {isDeleteModalOpen && selectedProduct && (
        <DeleteProductModal
          product={selectedProduct}
          onClose={() => setIsDeleteModalOpen(false)}
          onDelete={handleDeleteProduct}
        />
      )}
    </div>
  );
};

export default ProductsPage;
