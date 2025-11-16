"use client";

import { useState } from "react";
import { createTransfer } from "@/apiCalls";
import { toast } from "react-toastify";

interface StockRow {
  id?: string;
  product_id: string;
  productName: string;
  currentStock: number;
  shop_id?: string;
}

interface Shop {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  row: StockRow;
  shops: Shop[];
  currentShopId?: string;
  onSuccess: () => void;
  isAdmin: boolean;
}

export default function TransferStockModal({
  open,
  onClose,
  row,
  shops,
  currentShopId,
  onSuccess,
  isAdmin,
}: Props) {
  const [fromShopId, setFromShopId] = useState<string>(
    currentShopId || ""
  );
  const [toShopId, setToShopId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  if (!open || !isAdmin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromShopId || !toShopId) {
      toast.error("Select both source and destination shop");
      return;
    }
    if (fromShopId === toShopId) {
      toast.error("Cannot transfer to the same shop");
      return;
    }
    if (!quantity || quantity <= 0) {
      toast.error("Enter a valid quantity to transfer");
      return;
    }

    setLoading(true);
    try {
      await createTransfer({
        from_shop_id: fromShopId,
        to_shop_id: toShopId,
        product_id: row.product_id,
        quantity,
      });
      toast.success("Stock transferred");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to transfer stock"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">
            Transfer Stock – {row.productName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-lg"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-sm">
          <p className="text-xs text-gray-600">
            Current stock in selected shop:{" "}
            <span className="font-semibold text-gray-900">
              {row.currentStock}
            </span>
          </p>

          {/* FROM SHOP */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              From Shop
            </label>
            <select
              value={fromShopId}
              onChange={(e) => setFromShopId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select source shop</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* TO SHOP */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              To Shop
            </label>
            <select
              value={toShopId}
              onChange={(e) => setToShopId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select destination shop</option>
              {shops
                .filter((s) => s.id !== fromShopId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>

          {/* QTY */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min={1}
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !fromShopId || !toShopId || !quantity}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Transferring..." : "Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
