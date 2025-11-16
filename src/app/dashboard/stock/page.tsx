"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { getStocks, adjustStock, createTransfer, getShops } from "@/apiCalls";
import { toast } from "react-toastify";
import { ArrowLeftRight, RefreshCw, Wrench } from "lucide-react";

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
  const [modalType, setModalType] = useState<"adjust" | "transfer" | null>(null);

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
  // STOCK ROW CARD STYLING
  // --------------------------------------------------
  const statusColor = (status: string) =>
    status === "outOfStock"
      ? "bg-red-100 text-red-700"
      : status === "lowStock"
      ? "bg-amber-100 text-amber-700"
      : "bg-green-100 text-green-700";

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

            <button
              onClick={fetchData}
              className="flex gap-2 px-4 py-2 bg-white border rounded-lg shadow-sm hover:shadow-md"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading...</div>
          ) : stock.length === 0 ? (
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
                  {stock.map((row) => (
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
