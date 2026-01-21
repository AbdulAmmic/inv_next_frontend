"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { getStocks, adjustStock, createTransfer, getShops, updateStock } from "@/apiCalls";
import { toast } from "react-toastify";
import { ArrowLeftRight, RefreshCw, Wrench, Edit, Search, Download } from "lucide-react";
import jsPDF from "jspdf";

// --------------------------------------------------
// TYPES
// --------------------------------------------------
interface StockRow {
  id?: string;
  product_id: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number | null;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  lastUpdated: string | null;
  status: string;
  shop_id: string;
}

interface Shop {
  id: string;
  name: string;
}

// --------------------------------------------------
// PAGE COMPONENT
// --------------------------------------------------
export default function StockPage() {
  const [stock, setStock] = useState<StockRow[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<StockRow | null>(null);
  const [modalType, setModalType] = useState<"adjust" | "transfer" | "edit" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen((s) => !s);

  const selectedShopId =
    typeof window !== "undefined"
      ? localStorage.getItem("selected_shop_id") || ""
      : "";

  // --------------------------------------------------
  // FETCH STOCK
  // --------------------------------------------------
  const fetchData = async () => {
    try {
      setLoading(true);

      const stockRes = await getStocks(selectedShopId);

      const apiRows = Array.isArray(stockRes.data?.data)
        ? stockRes.data.data
        : [];

      const mapped: StockRow[] = apiRows.map((item: any): StockRow => ({
        id: item.id,
        product_id: item.product_id,
        productName: item.productName,
        sku: item.sku,
        category: item.category ?? "Uncategorized",
        currentStock: item.currentStock ?? 0,
        minStockLevel: item.minStockLevel ?? 0,
        maxStockLevel: item.maxStockLevel ?? null,
        unit: item.unit ?? "pcs",
        costPrice: item.costPrice ?? 0,
        sellingPrice: item.sellingPrice ?? 0,
        lastUpdated: item.lastUpdated ?? null,
        status: item.status ?? "inStock",
        shop_id: item.shop_id,
      }));

      setStock(mapped);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load stock");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // FETCH SHOPS FOR TRANSFER
  // --------------------------------------------------
  const loadShops = async () => {
    try {
      const res = await getShops();
      setShops(res.data || []);
    } catch {
      toast.error("Failed to load shops");
    }
  };

  useEffect(() => {
    fetchData();
    loadShops();
  }, []);

  // --------------------------------------------------
  // ADJUST STOCK HANDLER
  // --------------------------------------------------
  const handleAdjustStock = async (qty: number) => {
    if (!selectedRow) return;

    try {
      await adjustStock({
        shop_id: selectedRow.shop_id,
        product_id: selectedRow.product_id,
        quantity: qty,
        reason: qty > 0 ? "increase" : "decrease",
      });

      toast.success("Stock adjusted");
      setModalType(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to adjust stock");
    }
  };

  // --------------------------------------------------
  // TRANSFER STOCK HANDLER
  // --------------------------------------------------
  const handleTransferStock = async (
    toShop: string,
    qty: number
  ) => {
    if (!selectedRow) return;

    try {
      await createTransfer({
        from_shop_id: selectedRow.shop_id,
        to_shop_id: toShop,
        product_id: selectedRow.product_id,
        quantity: qty,
      });

      toast.success("Stock transferred successfully!");
      setModalType(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Transfer failed");
    }
  };

  // --------------------------------------------------
  // UPDATE STOCK HANDLER
  // --------------------------------------------------
  const handleUpdateStock = async (data: any) => {
    if (!selectedRow?.id) return;
    try {
      await updateStock(selectedRow.id, data);
      toast.success("Stock details updated");
      setModalType(null);
      fetchData();
    } catch (err: any) {
      toast.error("Failed to update stock");
    }
  }

  // --------------------------------------------------
  // STOCK ROW CARD STYLING
  // --------------------------------------------------
  const statusColor = (status: string) =>
    status === "outOfStock"
      ? "bg-red-100 text-red-700"
      : status === "lowStock"
        ? "bg-amber-100 text-amber-700"
        : "bg-green-100 text-green-700";

  // --------------------------------------------------
  // FILTER & PDF
  // --------------------------------------------------
  const filteredStock = stock.filter(item =>
    item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Stock Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    let y = 40;

    // Header
    doc.setFont("helvetica", "bold");
    doc.text("Product", 14, y);
    doc.text("Category", 80, y);
    doc.text("Stock", 130, y);
    doc.text("Status", 160, y);
    y += 10;
    doc.setFont("helvetica", "normal");

    filteredStock.forEach((item) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const name = item.productName.length > 30 ? item.productName.substring(0, 30) + "..." : item.productName;
      doc.text(name, 14, y);
      doc.text(item.category, 80, y);
      doc.text(String(item.currentStock), 130, y);
      doc.text(item.status, 160, y);
      y += 8;
    });

    doc.save("stock_report.pdf");
    toast.success("PDF exported");
  };

  // --------------------------------------------------
  // PAGE UI
  // --------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} isMobile={false} />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-6 lg:p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Stock Overview</h1>

            <div className="flex-1 flex gap-4 justify-end">
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={exportPDF}
                className="flex gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700"
              >
                <Download className="w-4 h-4" /> PDF
              </button>

              <button
                onClick={fetchData}
                className="flex gap-2 px-4 py-2 bg-white border rounded-lg shadow-sm hover:shadow-md"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading...</div>
          ) : filteredStock.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No stock found for this shop.
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">Product</th>
                    <th className="p-3 text-left">SKU</th>
                    <th className="p-3 text-left">Category</th>
                    <th className="p-3 text-left">Qty</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStock.map((row) => (
                    <tr key={row.product_id} className="border-b">
                      <td className="p-3">{row.productName}</td>
                      <td className="p-3">{row.sku}</td>
                      <td className="p-3">{row.category}</td>
                      <td className="p-3 font-semibold">{row.currentStock}</td>

                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs ${statusColor(
                            row.status
                          )}`}
                        >
                          {row.status}
                        </span>
                      </td>

                      <td className="p-3 flex gap-3">
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            setSelectedRow(row);
                            setModalType("adjust");
                          }}
                        >
                          <Wrench size={18} />
                        </button>

                        <button
                          className="text-gray-600 hover:text-gray-900"
                          onClick={() => {
                            setSelectedRow(row);
                            setModalType("edit");
                          }}
                          title="Edit Details"
                        >
                          <Edit size={18} />
                        </button>

                        {/* Admin only transfer control will be added later */}
                        <button
                          className="text-amber-600 hover:text-amber-800"
                          onClick={() => {
                            setSelectedRow(row);
                            setModalType("transfer");
                          }}
                        >
                          <ArrowLeftRight size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* ------------------------ */}
      {/* MODAL: ADJUST STOCK */}
      {/* ------------------------ */}
      {modalType === "adjust" && selectedRow && (
        <AdjustModal
          row={selectedRow}
          onClose={() => setModalType(null)}
          onAdjust={handleAdjustStock}
        />
      )}

      {/* ------------------------ */}
      {/* MODAL: TRANSFER STOCK */}
      {/* ------------------------ */}
      {modalType === "transfer" && selectedRow && (
        <TransferModal
          row={selectedRow}
          shops={shops}
          onClose={() => setModalType(null)}
          onTransfer={handleTransferStock}
        />
      )}

      {/* ------------------------ */}
      {/* MODAL: EDIT STOCK DETAILS */}
      {/* ------------------------ */}
      {modalType === "edit" && selectedRow && (
        <EditStockModal
          row={selectedRow}
          onClose={() => setModalType(null)}
          onUpdate={handleUpdateStock}
        />
      )}
    </div>
  );
}

//
// --------------------------------------------------
// ADJUST MODAL
// --------------------------------------------------
function AdjustModal({
  row,
  onClose,
  onAdjust,
}: {
  row: StockRow;
  onClose: () => void;
  onAdjust: (qty: number) => void;
}) {
  const [qty, setQty] = useState(0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-5 rounded-xl w-full max-w-md">
        <h2 className="text-lg font-semibold mb-3">
          Adjust Stock — {row.productName}
        </h2>

        <input
          type="number"
          className="w-full border rounded-lg px-3 py-2 mb-4"
          placeholder="Enter quantity (+ or -)"
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
        />

        <div className="flex gap-3">
          <button
            className="flex-1 py-2 border rounded-lg"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg"
            onClick={() => onAdjust(qty)}
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}

//
// --------------------------------------------------
// TRANSFER MODAL
// --------------------------------------------------
function TransferModal({
  row,
  shops,
  onClose,
  onTransfer,
}: {
  row: StockRow;
  shops: Shop[];
  onClose: () => void;
  onTransfer: (shop: string, qty: number) => void;
}) {
  const [qty, setQty] = useState(0);
  const [toShop, setToShop] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-5 rounded-xl w-full max-w-md">
        <h2 className="text-lg font-semibold mb-3">
          Transfer Stock — {row.productName}
        </h2>

        <select
          className="w-full border rounded-lg px-3 py-2 mb-3"
          value={toShop}
          onChange={(e) => setToShop(e.target.value)}
        >
          <option value="">Select destination shop</option>
          {shops
            .filter((s) => s.id !== row.shop_id)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>

        <input
          type="number"
          className="w-full border rounded-lg px-3 py-2 mb-4"
          placeholder="Quantity"
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
        />

        <div className="flex gap-3">
          <button
            className="flex-1 py-2 border rounded-lg"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            disabled={!toShop || qty <= 0}
            className="flex-1 py-2 bg-amber-600 text-white rounded-lg disabled:opacity-50"
            onClick={() => onTransfer(toShop, qty)}
          >
            Transfer
          </button>
        </div>
      </div>
    </div>
  );
}

//
// --------------------------------------------------
// EDIT STOCK MODAL
// --------------------------------------------------
function EditStockModal({
  row,
  onClose,
  onUpdate
}: {
  row: StockRow,
  onClose: () => void,
  onUpdate: (data: any) => void
}) {
  const [formData, setFormData] = useState({
    min_quantity: String(row.minStockLevel),
    max_quantity: row.maxStockLevel ? String(row.maxStockLevel) : "",
    shop_price: row.sellingPrice ? String(row.sellingPrice) : "",
    shop_cost_price: row.costPrice ? String(row.costPrice) : ""
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const payload: any = {};
    if (formData.min_quantity !== "") payload.min_quantity = Number(formData.min_quantity);
    payload.max_quantity = formData.max_quantity === "" ? null : Number(formData.max_quantity);
    payload.shop_price = formData.shop_price === "" ? null : Number(formData.shop_price);
    payload.shop_cost_price = formData.shop_cost_price === "" ? null : Number(formData.shop_cost_price);

    onUpdate(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Edit Stock Details — {row.productName}</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
            <input
              type="number"
              name="min_quantity"
              value={formData.min_quantity}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock Level</label>
            <input
              type="number"
              name="max_quantity"
              value={formData.max_quantity}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Unlimited"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (Override)</label>
            <input
              type="number"
              name="shop_price"
              value={formData.shop_price}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Default"
            />
            <p className="text-xs text-gray-400 mt-1">Leave empty to use global price</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (Override)</label>
            <input
              type="number"
              name="shop_cost_price"
              value={formData.shop_cost_price}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Default"
            />
            <p className="text-xs text-gray-400 mt-1">Leave empty to use global cost</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
        </div>
      </div>
    </div>
  );
}
