"use client";

import { useState } from "react";
import { adjustStock } from "@/apiCalls";
import { toast } from "react-toastify";

interface StockRow {
  id?: string;
  product_id: string;
  productName: string;
  currentStock: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  row: StockRow;
  shopId: string;
  onSuccess: () => void;
}

export default function AdjustStockModal({
  open,
  onClose,
  row,
  shopId,
  onSuccess,
}: Props) {
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState<string>("manual");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) {
      toast.error("Shop is required for stock adjustment");
      return;
    }
    if (!quantity) {
      toast.error("Enter quantity to adjust (positive or negative)");
      return;
    }

    setLoading(true);
    try {
      await adjustStock({
        shop_id: shopId,
        product_id: row.product_id,
        quantity,
        reason,
      });
      toast.success("Stock adjusted");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to adjust stock"
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
            Adjust Stock – {row.productName}
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
          <p className="text-gray-600 text-xs">
            Current stock:{" "}
            <span className="font-semibold text-gray-900">
              {row.currentStock}
            </span>
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Quantity Change
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. 5 (add) or -3 (reduce)"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Correction, damage, physical count..."
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
              disabled={loading || !quantity}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Saving..." : "Apply Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
