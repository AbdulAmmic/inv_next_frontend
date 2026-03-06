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
}

export default function ProductsTable({
  products,
  selectedProducts,
  onSelectProduct,
  onEditProduct,
  onDeleteProduct,
  onBulkDelete,
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
      <ChevronDown className="w-4 h-4 opacity-40" />
    ) : sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-blue-600" />
    );

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "inStock":
        return { label: "In Stock", color: "emerald", icon: CheckCircle };
      case "lowStock":
        return { label: "Low Stock", color: "amber", icon: AlertTriangle };
      case "outOfStock":
        return { label: "Out of Stock", color: "rose", icon: XCircle };
      default:
        return { label: status, color: "slate", icon: Package };
    }
  };

  return (
    <div className="overflow-x-auto relative">
      <AnimatePresence>
        {selectedProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center justify-between p-4 bg-slate-900 text-white sticky top-0 z-20 rounded-t-2xl"
          >
            <p className="font-bold text-sm">
              {selectedProducts.length} products selected
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => onSelectProduct([])}
                className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
              >
                Deselect All
              </button>
              <button
                onClick={onBulkDelete}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-900/20"
              >
                Delete Selected
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <table className="w-full text-left min-w-[1000px]">
        <thead>
          <tr className="bg-slate-50/50 border-b border-slate-100 italic">
            <th className="px-6 py-4 w-10">
              <input
                type="checkbox"
                className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={products.length > 0 && selectedProducts.length === products.length}
                onChange={toggleSelectAll}
              />
            </th>
            <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px] cursor-pointer" onClick={() => toggleSort("name")}>
              <div className="flex items-center gap-2">Product Name {sortIcon("name")}</div>
            </th>
            <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Category</th>
            <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px] cursor-pointer text-center" onClick={() => toggleSort("stockQuantity")}>
              <div className="flex items-center justify-center gap-2">Inventory {sortIcon("stockQuantity")}</div>
            </th>
            <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Unit Cost</th>
            <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Sale Price</th>
            <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Status</th>
            <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px] text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-50">
          <AnimatePresence mode="popLayout">
            {sortedProducts.map((product, idx) => {
              const status = getStatusInfo(product.status);
              return (
                <motion.tr
                  layout
                  key={product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`hover:bg-blue-50/30 transition-colors group ${selectedProducts.includes(product.id) ? 'bg-blue-50/50' : ''}`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleSelect(product.id)}
                    />
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{product.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium tracking-tight uppercase">{product.sku || 'No SKU'}</div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      {product.category}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <div className="font-black text-slate-900 text-base">{product.stockQuantity}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Units</div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-slate-500 font-medium text-xs italic">Cost</div>
                    <div className="font-bold text-slate-900">₦{Number(product.costPrice).toLocaleString()}</div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-slate-500 font-medium text-xs italic">Price</div>
                    <div className="font-black text-blue-600">₦{Number(product.sellingPrice).toLocaleString()}</div>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-${status.color}-100 text-${status.color}-700`}>
                      <status.icon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEditProduct(product)}
                        className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-xl transition-all shadow-sm"
                        title="Edit Product"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteProduct(product)}
                        className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-xl transition-all shadow-sm"
                        title="Delete Product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>

          {!products.length && (
            <tr>
              <td colSpan={8} className="p-20 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-4">
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
  );
}
