"use client";

import React from "react";
import { Package, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";

interface ProductStatsProps {
  products: any[];
}

// Same card style as the Stock page summary. Colour classes are written out
// in full — Tailwind can't generate classes assembled at runtime.
export default function ProductsStats({ products }: ProductStatsProps) {
  const stats = [
    { label: "Total Products", value: products.length, icon: Package, tone: "bg-blue-50 text-blue-600" },
    { label: "In Stock", value: products.filter((p) => p.status === "inStock").length, icon: CheckCircle, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Low Stock", value: products.filter((p) => p.status === "lowStock").length, icon: AlertTriangle, tone: "bg-amber-50 text-amber-600" },
    { label: "Out of Stock", value: products.filter((p) => p.status === "outOfStock").length, icon: XCircle, tone: "bg-rose-50 text-rose-600" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
    >
      {stats.map((stat) => (
        <div key={stat.label} className="glass-card p-4 rounded-2xl flex items-center gap-4">
          <div className={`p-3 rounded-xl ${stat.tone}`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <p className="text-lg font-bold text-slate-900">{stat.value.toLocaleString()}</p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}
