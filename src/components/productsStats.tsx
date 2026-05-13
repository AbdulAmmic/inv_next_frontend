"use client";

import React from "react";
import { Package, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";

interface ProductStatsProps {
  products: any[];
}

export default function ProductsStats({ products }: ProductStatsProps) {
  const total = products.length;
  const inStock = products.filter((p) => p.status === "inStock").length;
  const lowStock = products.filter((p) => p.status === "lowStock").length;
  const outOfStock = products.filter((p) => p.status === "outOfStock").length;

  const stats = [
    { label: "Total Products", value: total, icon: Package, color: "blue", delay: 0 },
    { label: "In Stock", value: inStock, icon: CheckCircle, color: "emerald", delay: 0.1 },
    { label: "Low Stock", value: lowStock, icon: AlertTriangle, color: "amber", delay: 0.2 },
    { label: "Out of Stock", value: outOfStock, icon: XCircle, color: "rose", delay: 0.3 },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: stat.delay }}
          className="glass-card p-5 md:p-6 rounded-[1.5rem] flex items-center gap-4 border border-white hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
        >
          <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
            <stat.icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className="text-xl md:text-2xl font-black text-slate-900 mt-0.5">{stat.value}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
