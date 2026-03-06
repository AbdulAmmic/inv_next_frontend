"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboardLayout";
import { getStocks, adjustStock, createTransfer, getShops, updateStock } from "@/apiCalls";
import { toast } from "react-hot-toast";
import { ArrowLeftRight, RefreshCw, Wrench, Edit, Search, Download, Package, Activity, AlertTriangle, Filter, ChevronDown } from "lucide-react";
import jsPDF from "jspdf";
import Loader from "@/components/Loader";
import { motion, AnimatePresence } from "framer-motion";

// --------------------------------------------------
// TYPES
// --------------------------------------------------
interface StockRow {
  id?: string;
  product_id: string;
  productName: string;
  sku: string;
  barcode: string;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRow, setSelectedRow] = useState<StockRow | null>(null);
  const [modalType, setModalType] = useState<"adjust" | "transfer" | "edit" | null>(null);

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
        barcode: item.barcode ?? "",
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
    doc.text("Barcode", 70, y);
    doc.text("Category", 110, y);
    doc.text("Stock", 150, y);
    doc.text("Status", 175, y);
    y += 10;
    doc.setFont("helvetica", "normal");

    filteredStock.forEach((item) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const name = item.productName.length > 25 ? item.productName.substring(0, 25) + "..." : item.productName;
      doc.text(name, 14, y);
      doc.text(item.barcode || "N/A", 70, y);
      doc.text(item.category, 110, y);
      doc.text(String(item.currentStock), 150, y);
      doc.text(item.status, 175, y);
      y += 8;
    });

    doc.save("stock_report.pdf");
    toast.success("PDF exported");
  };

  // --------------------------------------------------
  // PAGE UI
  // --------------------------------------------------
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
              <div className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Inventory
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Stock Overview
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors w-4 h-4" />
              <input
                type="text"
                placeholder="Search stock..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all w-full sm:w-64"
              />
            </div>

            <button
              onClick={exportPDF}
              className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all shadow-sm"
            >
              <Download className="w-4 h-4 text-rose-500" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-slate-800 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-slate-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </motion.div>
        </div>

        {/* Quick Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Items</p>
              <p className="text-lg font-bold text-slate-900">{stock.length}</p>
            </div>
          </div>
          <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Low Stock</p>
              <p className="text-lg font-bold text-slate-900">{stock.filter(s => s.status === 'lowStock').length}</p>
            </div>
          </div>
          <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Out of Stock</p>
              <p className="text-lg font-bold text-slate-900">{stock.filter(s => s.status === 'outOfStock').length}</p>
            </div>
          </div>
          <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Categories</p>
              <p className="text-lg font-bold text-slate-900">{new Set(stock.map(s => s.category)).size}</p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader text="Syncing inventory..." subText="Fetching latest stock levels" />
          </div>
        ) : filteredStock.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-12 text-center rounded-[2rem] flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No results found</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-1">
              We couldn't find any items matching your search criteria. Try a different keyword.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Product</th>
                    <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">SKU / Barcode</th>
                    <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Category</th>
                    <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-center">Quantity</th>
                    <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Status</th>
                    <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                  <AnimatePresence mode="popLayout">
                    {filteredStock.map((row, idx) => (
                      <motion.tr
                        layout
                        key={row.product_id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="hover:bg-blue-50/30 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{row.productName}</div>
                          <div className="text-[10px] text-slate-400 font-medium">Updated: {row.lastUpdated ? new Date(row.lastUpdated).toLocaleDateString() : 'Never'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-600 font-mono tracking-tight">{row.sku}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{row.barcode || "No Barcode"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                            {row.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-base font-extrabold ${row.currentStock <= row.minStockLevel ? 'text-rose-600' : 'text-slate-900'}`}>
                            {row.currentStock}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">{row.unit}</span>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${row.status === "outOfStock"
                            ? "bg-rose-100 text-rose-700"
                            : row.status === "lowStock"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${row.status === "outOfStock" ? "bg-rose-500 animate-pulse" : row.status === "lowStock" ? "bg-amber-500" : "bg-emerald-500"}`} />
                            {row.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              onClick={() => {
                                setSelectedRow(row);
                                setModalType("adjust");
                              }}
                              title="Adjust Stock"
                            >
                              <Wrench size={18} />
                            </button>

                            <button
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              onClick={() => {
                                setSelectedRow(row);
                                setModalType("edit");
                              }}
                              title="Edit Details"
                            >
                              <Edit size={18} />
                            </button>

                            <button
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                              onClick={() => {
                                setSelectedRow(row);
                                setModalType("transfer");
                              }}
                              title="Transfer Stock"
                            >
                              <ArrowLeftRight size={18} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </main>
      {/* Modals & Overlays */}
      <AnimatePresence>
        {/* MODAL: ADJUST STOCK */}
        {modalType === "adjust" && selectedRow && (
          <AdjustModal
            row={selectedRow}
            onClose={() => setModalType(null)}
            onAdjust={handleAdjustStock}
          />
        )}

        {/* MODAL: TRANSFER STOCK */}
        {modalType === "transfer" && selectedRow && (
          <TransferModal
            row={selectedRow}
            shops={shops}
            onClose={() => setModalType(null)}
            onTransfer={handleTransferStock}
          />
        )}

        {/* MODAL: EDIT STOCK DETAILS */}
        {modalType === "edit" && selectedRow && (
          <EditStockModal
            row={selectedRow}
            onClose={() => setModalType(null)}
            onUpdate={handleUpdateStock}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white p-8 rounded-[2rem] w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
              Adjust Stock
            </h2>
            <p className="text-sm text-slate-500 font-medium">{row.productName}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Quantity Adjustment</label>
            <input
              type="number"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all font-bold text-lg"
              placeholder="e.g. +10 or -5"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
              onClick={() => onAdjust(qty)}
            >
              Update Stock
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white p-8 rounded-[2rem] w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
              Transfer Stock
            </h2>
            <p className="text-sm text-slate-500 font-medium">{row.productName}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Destination Shop</label>
            <div className="relative">
              <select
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-400 transition-all font-bold text-slate-700"
                value={toShop}
                onChange={(e) => setToShop(e.target.value)}
              >
                <option value="">Select a shop</option>
                {shops
                  .filter((s) => s.id !== row.shop_id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Transfer Quantity</label>
            <input
              type="number"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-400 transition-all font-bold text-lg"
              placeholder="0"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              disabled={!toShop || qty <= 0}
              className="flex-1 py-4 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 shadow-lg shadow-amber-200 transition-all active:scale-95 disabled:opacity-50"
              onClick={() => onTransfer(toShop, qty)}
            >
              Transfer Now
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white p-8 rounded-[2rem] w-full max-w-xl shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Edit className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
              Edit Details
            </h2>
            <p className="text-sm text-slate-500 font-medium">{row.productName}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Min Stock Level</label>
            <input
              type="number"
              name="min_quantity"
              value={formData.min_quantity}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-bold text-slate-700"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Max Stock Level</label>
            <input
              type="number"
              name="max_quantity"
              value={formData.max_quantity}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-bold text-slate-700"
              placeholder="Unlimited"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Selling Price (NGN)</label>
            <input
              type="number"
              name="shop_price"
              value={formData.shop_price}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-bold text-slate-700"
              placeholder="Default"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Cost Price (NGN)</label>
            <input
              type="number"
              name="shop_cost_price"
              value={formData.shop_cost_price}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-bold text-slate-700"
              placeholder="Default"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-10">
          <button
            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all active:scale-95"
            onClick={handleSubmit}
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
