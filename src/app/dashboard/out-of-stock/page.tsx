"use client";

import { useState, useEffect } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Menu, Package, AlertTriangle, Search, Filter, RefreshCw, BarChart3, Download } from "lucide-react";
import { getStocks } from "@/apiCalls"; // Import API call
import { toast } from "react-toastify";
import jsPDF from "jspdf";

interface StockItem {
  id: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  status: string;
  lastUpdated: string | null;
  demand_percentage?: number; // Added from backend
}

export default function OutOfStockPage() {
  const [products, setProducts] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default closed on desktop roughly or use layout preference

  const selectedShopId =
    typeof window !== "undefined"
      ? localStorage.getItem("selected_shop_id") || ""
      : "";

  const toggleSidebar = () => setIsSidebarOpen(v => !v);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const res = await getStocks(selectedShopId);
      const apiRows = Array.isArray(res.data?.data) ? res.data.data : [];

      // Map API response to StockItem interface, handling null/undefined values
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

      // Filter for strict Out of Stock (quantity <= 0)
      const outOfStockItems = allStocks.filter((item) => item.currentStock <= 0);
      setProducts(outOfStockItems);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load stock data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  // Client-side search filtering
  const filteredProducts = products.filter(product =>
    product.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Out of Stock Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    let y = 40;
    doc.setFontSize(10);
    // Be careful with page height in loop

    // Simple Header
    doc.setFont("helvetica", "bold");
    doc.text("Product", 14, y);
    doc.text("Category", 80, y);
    doc.text("Demand %", 140, y);
    doc.text("Status", 170, y);
    y += 10;
    doc.setFont("helvetica", "normal");

    filteredProducts.forEach((item) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const name = item.productName.length > 30 ? item.productName.substring(0, 30) + "..." : item.productName;
      doc.text(name, 14, y);
      doc.text(item.category, 80, y);
      doc.text(`${item.demand_percentage}%`, 140, y);
      doc.text("Out of Stock", 170, y);
      y += 8;
    });

    doc.save("out_of_stock_report.pdf");
    toast.success("PDF exported");
  };

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
              <h1 className="text-2xl font-bold text-gray-800">Out of Stock</h1>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-4 justify-end">
              <div className="relative max-w-md w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={exportPDF}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-gray-500">Loading stock data...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No out-of-stock items found</h3>
              <p className="text-gray-500 mb-4">
                Great job! All inventory levels are healthy.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Demand %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{product.productName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">{product.category}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 font-mono">{product.sku}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{product.demand_percentage ?? 0}%</span>
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-500"
                                style={{ width: `${Math.min(product.demand_percentage || 0, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            Out of Stock
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}