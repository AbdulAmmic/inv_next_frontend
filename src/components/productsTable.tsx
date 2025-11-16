"use client";

import { useState } from "react";
import { Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";

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
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );

  return (
    <div className="overflow-x-auto">
      {selectedProducts.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-red-50 border-b border-red-200">
          <p className="text-red-600 font-medium">
            {selectedProducts.length} selected
          </p>
          <button
            onClick={onBulkDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete Selected
          </button>
        </div>
      )}

      <table className="w-full text-left min-w-[900px]">
        <thead>
          <tr className="bg-gray-100 border-b text-sm">
            <th className="p-3"></th>
            <th className="p-3 cursor-pointer" onClick={() => toggleSort("name")}>
              Name {sortIcon("name")}
            </th>
            <th className="p-3">Category</th>
            <th className="p-3 cursor-pointer" onClick={() => toggleSort("stockQuantity")}>
              Stock {sortIcon("stockQuantity")}
            </th>
            <th className="p-3">Cost</th>
            <th className="p-3">Price</th>
            <th className="p-3">Status</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          {sortedProducts.map((product) => (
            <tr key={product.id} className="border-b hover:bg-gray-50 text-sm">
              <td className="p-3">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product.id)}
                  onChange={() => toggleSelect(product.id)}
                />
              </td>

              <td className="p-3 font-medium">{product.name}</td>
              <td className="p-3">{product.category}</td>
              <td className="p-3">{product.stockQuantity}</td>
              <td className="p-3">₦{product.costPrice}</td>
              <td className="p-3">₦{product.sellingPrice}</td>

              <td className="p-3">
                {product.status === "inStock" && (
                  <span className="text-green-600 font-medium">In stock</span>
                )}
                {product.status === "lowStock" && (
                  <span className="text-amber-600 font-medium">Low stock</span>
                )}
                {product.status === "outOfStock" && (
                  <span className="text-red-600 font-medium">Out of stock</span>
                )}
              </td>

              <td className="p-3 flex justify-end gap-3">
                <button
                  onClick={() => onEditProduct(product)}
                  className="p-2 rounded hover:bg-blue-50 text-blue-600"
                >
                  <Pencil size={17} />
                </button>
                <button
                  onClick={() => onDeleteProduct(product)}
                  className="p-2 rounded hover:bg-red-50 text-red-600"
                >
                  <Trash2 size={17} />
                </button>
              </td>
            </tr>
          ))}

          {!products.length && (
            <tr>
              <td colSpan={8} className="p-6 text-center text-gray-500">
                No products available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
