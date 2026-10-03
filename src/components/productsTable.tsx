"use client";

import { useState } from "react";
import { Pencil, Trash2, ChevronDown, ChevronUp, MoreVertical, Package, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProductsTableProps {
  products: any[];
  selectedProducts: string[];
  onSelectProduct: (ids: string[]) => void;
  onEditProduct: (product: any) => void;
  onDeleteProduct: (product: any) => void;
  onBulkDelete: () => void;
  userRole?: string;
}

export default function ProductsTable({
  products,
  selectedProducts,
  onSelectProduct,
  onEditProduct,
  onDeleteProduct,
  onBulkDelete,
  userRole,
}: ProductsTableProps) {
  const [sortField, setSortField] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    const valA = a[sortField] ?? "";
    const valB = b[sortField] ?? "";
    if (sortOrder === "asc") return valA > valB ? 1 : -1;
    return valA < valB ? 1 : -1;
  });

  const toggleSelect = (id: string) => {
    if (selectedProducts.includes(id)) {
      onSelectProduct(selectedProducts.filter((x) => x !== id));
    } else {
      onSelectProduct([...selectedProducts, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      onSelectProduct([]);
    } else {
      onSelectProduct(products.map((p) => p.id));
    }
  };

  const sortIcon = (field: string) =>
    sortField !== field ? (
      <ChevronDown className="w-3.5 h-3.5 opacity-30" />
    ) : sortOrder === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-slate-700" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-slate-700" />
    );

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "inStock":
        return {
          label: "In Stock",
          icon: CheckCircle,
          badgeBg: "bg-emerald-100",
          badgeText: "text-emerald-700",
        };
      case "lowStock":
        return {
          label: "Low Stock",
          icon: AlertTriangle,
          badgeBg: "bg-amber-100",
          badgeText: "text-amber-700",
        };
      case "outOfStock":
        return {
          label: "Out of Stock",
          icon: XCircle,
          badgeBg: "bg-rose-100",
          badgeText: "text-rose-700",
        };
      default:
        return {
          label: status,
          icon: Package,
          badgeBg: "bg-slate-100",
          badgeText: "text-slate-700",
        };
    }
  };

  const getSelectButtonClassName = (isSelected: boolean) => {
    if (isSelected) {
      return "rounded-full px-3 py-1 text-xs font-semibold transition bg-slate-900 text-white";
    }
    return "rounded-full px-3 py-1 text-xs font-semibold transition bg-slate-100 text-slate-700 hover:bg-slate-200";
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {selectedProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-3 px-6 py-3 bg-amber-50 border-b border-amber-100 text-slate-900 sticky top-0 z-20 md:flex-row md:items-center md:justify-between"
          >
            <p className="font-bold text-sm">
              {selectedProducts.length} products selected
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => onSelectProduct([])}
                className="px-3 py-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                Deselect All
              </button>
              <button
                onClick={onBulkDelete}
                className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors"
              >
                Delete Selected
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
          <thead>
          <tr className="bg-slate-50/50 border-b border-slate-100">
            <th className="px-6 py-4 w-10">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300"
                checked={products.length > 0 && selectedProducts.length === products.length}
                onChange={toggleSelectAll}
              />
            </th>
            <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px] cursor-pointer" onClick={() => toggleSort("name")}>
              <div className="flex items-center gap-2">Product {sortIcon("name")}</div>
            </th>
            <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Category</th>
            <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Shelf</th>
            <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px] cursor-pointer text-center" onClick={() => toggleSort("stockQuantity")}>
              <div className="flex items-center justify-center gap-2">Quantity {sortIcon("stockQuantity")}</div>
            </th>
            {userRole === "admin" || userRole === "subadmin" ? (
              <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Cost</th>
            ) : null}
            <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Price</th>
            <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Status</th>
            <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]">Expiry</th>
            <th className="px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px] text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-50">
          <AnimatePresence mode="popLayout">
            {sortedProducts.map((product, idx) => {
              const status = getStatusInfo(product.status);
              const StatusIcon = status.icon;
              return (
                <motion.tr
                  layout
                  key={product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`hover:bg-slate-50/70 transition-colors group ${selectedProducts.includes(product.id) ? 'bg-amber-50/40' : ''}`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleSelect(product.id)}
                    />
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{product.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium font-mono">{product.sku || "No SKU"}</div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-slate-600">{product.category || "Uncategorized"}</span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-slate-600">
                      {product.shelfLocation || "—"}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className="font-bold text-slate-900">{product.stockQuantity}</span>
                    <span className="text-[10px] text-slate-400 font-medium ml-1">{product.unit || ""}</span>
                  </td>

                  {userRole === "admin" || userRole === "subadmin" ? (
                    <td className="px-6 py-4">
                      <span className="text-slate-600">₦{Number(product.costPrice).toLocaleString()}</span>
                    </td>
                  ) : null}

                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900">₦{Number(product.sellingPrice).toLocaleString()}</span>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.badgeBg} ${status.badgeText}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {product.nearestExpiry ? (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        product.expiryStatus === "expired"
                          ? "bg-rose-100 text-rose-700"
                          : product.expiryStatus === "expiringSoon"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }`}>
                        {product.nearestExpiry}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEditProduct(product)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Edit Product"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => onDeleteProduct(product)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Delete Product"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>

          {!products.length && (
            <tr>
              <td colSpan={10} className="p-20 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                    <Package className="w-8 h-8 text-slate-200" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">No products found</h3>
                  <p className="text-slate-500 max-w-xs mx-auto mt-1">There are no products in this shop yet.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-slate-100">
        {sortedProducts.map((product) => {
          const status = getStatusInfo(product.status);
          const StatusIcon = status.icon;
          return (
            <div key={product.id} className="bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                    {product.name}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">SKU: {product.sku || "No SKU"}</p>
                  <p className="text-xs text-slate-500 mt-1">Category: {product.category || "Uncategorized"}</p>
                  <p className="text-xs text-slate-500 mt-1">Shelf: {product.shelfLocation || "—"}</p>
                  {product.nearestExpiry && (
                    <p className={`text-xs mt-1 font-semibold ${product.expiryStatus === "expired" ? "text-rose-600" : product.expiryStatus === "expiringSoon" ? "text-amber-600" : "text-slate-500"}`}>
                      Expires: {product.nearestExpiry}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${status.badgeBg} ${status.badgeText}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                  <button
                    onClick={() => toggleSelect(product.id)}
                    className={getSelectButtonClassName(selectedProducts.includes(product.id))}
                  >
                    {selectedProducts.includes(product.id) ? 'Selected' : 'Select'}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stock</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {product.stockQuantity} <span className="text-xs font-medium text-slate-400">{product.unit || ""}</span>
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sale Price</p>
                  <p className="mt-2 font-semibold text-slate-900">₦{Number(product.sellingPrice).toLocaleString()}</p>
                </div>
                {(userRole === "admin" || userRole === "subadmin") && (
                  <div className="rounded-lg bg-slate-50 p-3 col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unit Cost</p>
                    <p className="mt-2 font-semibold text-slate-900">₦{Number(product.costPrice).toLocaleString()}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">
                  {product.description || 'No description available.'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onEditProduct(product)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteProduct(product)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
