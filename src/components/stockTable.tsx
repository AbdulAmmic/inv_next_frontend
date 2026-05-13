"use client";

import StockStatusBadge from "./stockStatusBadge";
import { ArrowLeftRight, Wrench } from "lucide-react";

interface StockRow {
  id?: string;
  product_id: string;
  productName: string;
  sku?: string;
  category?: string;
  shop_id?: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel?: number | null;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  lastUpdated?: string | null;
  status: string;
}

interface Props {
  rows: StockRow[];
  loading?: boolean;
  onAdjust: (row: StockRow) => void;
  onTransfer: (row: StockRow) => void;
  canTransfer: boolean;
  currentShopId?: string;
}

export default function StockTable({
  rows,
  loading,
  onAdjust,
  onTransfer,
  canTransfer,
}: Props) {
  if (!loading && rows.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">
        No stock records found. Once you add products and purchases, stock will appear here.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-gray-600">
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium hidden sm:table-cell">SKU</th>
            <th className="px-4 py-3 font-medium hidden md:table-cell">Category</th>
            <th className="px-4 py-3 font-medium text-right">Qty</th>
            <th className="px-4 py-3 font-medium hidden sm:table-cell text-right">
              Min / Max
            </th>
            <th className="px-4 py-3 font-medium hidden md:table-cell text-right">
              Cost
            </th>
            <th className="px-4 py-3 font-medium hidden md:table-cell text-right">
              Price
            </th>
            <th className="px-4 py-3 font-medium text-center">Status</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={`${row.product_id}-${row.shop_id ?? "global"}`} className="hover:bg-gray-50/60">
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900 text-sm">
                    {row.productName}
                  </span>
                  <span className="text-xs text-gray-500">
                    {row.unit || "pcs"}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell text-gray-600">
                {row.sku || "-"}
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                {row.category || "-"}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-gray-900">
                {row.currentStock}
              </td>
              <td className="px-4 py-3 hidden sm:table-cell text-right text-gray-600 text-xs">
                {row.minStockLevel}{" "}
                {row.maxStockLevel != null ? ` / ${row.maxStockLevel}` : ""}
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-right text-gray-600">
                ₦{row.costPrice.toLocaleString()}
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-right text-gray-600">
                ₦{row.sellingPrice.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-center">
                <StockStatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onAdjust(row)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-gray-200 text-xs text-gray-700 hover:bg-gray-50"
                    title="Adjust Stock"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Adjust
                  </button>
                  {canTransfer && (
                    <button
                      onClick={() => onTransfer(row)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-blue-200 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100"
                      title="Transfer Stock"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      Transfer
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {loading && (
            <tr>
              <td colSpan={9} className="px-4 py-6 text-center text-gray-500 text-sm">
                Loading...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
