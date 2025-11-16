"use client";

import React from "react";
import { Package, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface ProductStatsProps {
  products: any[];
}

export default function ProductsStats({ products }: ProductStatsProps) {
  const total = products.length;
  const inStock = products.filter((p) => p.status === "inStock").length;
  const lowStock = products.filter((p) => p.status === "lowStock").length;
  const outOfStock = products.filter((p) => p.status === "outOfStock").length;

  const cardStyle =
    "flex items-center gap-4 p-4 rounded-xl bg-white shadow-sm border border-gray-200 hover:shadow-md transition-all";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className={cardStyle}>
        <Package className="text-blue-600 w-8 h-8" />
        <div>
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="text-xl font-semibold">{total}</p>
        </div>
      </div>

      <div className={cardStyle}>
        <CheckCircle className="text-green-600 w-8 h-8" />
        <div>
          <p className="text-sm text-gray-500">In Stock</p>
          <p className="text-xl font-semibold">{inStock}</p>
        </div>
      </div>

      <div className={cardStyle}>
        <AlertTriangle className="text-amber-600 w-8 h-8" />
        <div>
          <p className="text-sm text-gray-500">Low Stock</p>
          <p className="text-xl font-semibold">{lowStock}</p>
        </div>
      </div>

      <div className={cardStyle}>
        <XCircle className="text-red-600 w-8 h-8" />
        <div>
          <p className="text-sm text-gray-500">Out of Stock</p>
          <p className="text-xl font-semibold">{outOfStock}</p>
        </div>
      </div>
    </div>
  );
}
