"use client";

import { useState, useEffect } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Menu, Package, AlertTriangle, Search, Plus, Filter, RefreshCw, BarChart3 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  threshold: number;
  lastRestock: string;
  supplier: string;
}

const initialProducts: Product[] = [
  { id: "1", name: "Wireless Headphones", sku: "WH-1000XM4", category: "Audio", stock: 0, threshold: 10, lastRestock: "2023-10-05", supplier: "Sony Electronics" },
  { id: "2", name: "Mechanical Keyboard", sku: "MK-RGB-Pro", category: "Computer", stock: 2, threshold: 15, lastRestock: "2023-10-12", supplier: "Keychron" },
  { id: "3", name: "Gaming Mouse", sku: "GM-502", category: "Computer", stock: 0, threshold: 20, lastRestock: "2023-09-28", supplier: "Logitech" },
  { id: "4", name: "USB-C Charger", sku: "UC-65W", category: "Accessories", stock: 0, threshold: 25, lastRestock: "2023-10-15", supplier: "Anker" },
  { id: "5", name: "Bluetooth Speaker", sku: "BS-Xtreme", category: "Audio", stock: 5, threshold: 8, lastRestock: "2023-10-18", supplier: "JBL" },
];

const productCategories = [
  "All Categories",
  "Audio",
  "Computer",
  "Accessories",
  "Phones",
  "Tablets",
  "Wearables"
];

export default function OutOfStockPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(initialProducts);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [stockFilter, setStockFilter] = useState("Out of Stock");

  // Filter products based on search query and category filter
  useEffect(() => {
    let filtered = products.filter(product => 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (categoryFilter !== "All Categories") {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }
    
    if (stockFilter === "Out of Stock") {
      filtered = filtered.filter(product => product.stock === 0);
    } else if (stockFilter === "Low Stock") {
      filtered = filtered.filter(product => product.stock > 0 && product.stock <= product.threshold);
    }
    
    setFilteredProducts(filtered);
  }, [searchQuery, products, categoryFilter, stockFilter]);

  const toggleSidebar = () => setIsSidebarOpen(v => !v);

  const handleRestock = (id: string) => {
    setProducts(products.map(product => 
      product.id === id ? { ...product, stock: product.threshold + 10, lastRestock: new Date().toISOString().split('T')[0] } : product
    ));
  };

  const getStockStatus = (stock: number, threshold: number) => {
    if (stock === 0) return { text: "Out of Stock", color: "bg-red-100 text-red-800" };
    if (stock <= threshold) return { text: "Low Stock", color: "bg-yellow-100 text-yellow-800" };
    return { text: "In Stock", color: "bg-green-100 text-green-800" };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.threshold).length;
  const totalProducts = products.length;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} isMobile={false} />
      <div className="flex-1 flex flex-col transition-all duration-300">
        <Header />
        <main className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
            <div className="flex items-center">
              <button
                onClick={toggleSidebar}
                className="mr-3 p-2 rounded-lg bg-white border border-gray-200 shadow-sm lg:hidden"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
            </div>
            
            <div className="flex-1 flex flex-col md:flex-row gap-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {productCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={stockFilter}
                onChange={e => setStockFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Out of Stock">Out of Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="All Stock">All Stock</option>
              </select>
            </div>
           
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">Out of Stock Items</h3>
                <Package className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-gray-800 mt-2">{outOfStockCount}</p>
              <p className="text-xs text-gray-500 mt-1">Items needing immediate restock</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">Low Stock Items</h3>
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-gray-800 mt-2">{lowStockCount}</p>
              <p className="text-xs text-gray-500 mt-1">Items below threshold</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">Total Products</h3>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-800 mt-2">{totalProducts}</p>
              <p className="text-xs text-gray-500 mt-1">Products in inventory</p>
            </div>
          </div>

          {/* Products Table */}
          {filteredProducts.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Threshold</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Restock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.map((product) => {
                      const status = getStockStatus(product.stock, product.threshold);
                      return (
                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">{product.category}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 font-mono">{product.sku}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{product.stock}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">{product.threshold}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                              {status.text}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{formatDate(product.lastRestock)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">{product.supplier}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleRestock(product.id)}
                                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                disabled={product.stock > product.threshold}
                              >
                                <RefreshCw className="w-4 h-4" />
                                Restock
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || categoryFilter !== "All Categories" ? "Try adjusting your search or filter criteria" : "All products are adequately stocked"}
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("All Categories");
                  setStockFilter("All Stock");
                }}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Filter className="w-5 h-5" />
                Clear Filters
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}