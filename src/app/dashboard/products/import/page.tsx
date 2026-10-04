"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { ArrowRight, Lock } from "lucide-react";
import { getShops } from "@/apiCalls";
import ImportProductsModal from "@/components/ImportProductsModal";
import Loader from "@/components/Loader";

export default function BulkImportPage() {
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [role, setRole] = useState("");
  const [userShopId, setUserShopId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setRole((user.role || "").toLowerCase());
      setUserShopId(user.shop_id || "");
    } catch { /* no session */ }
    getShops()
      .then((res) => setShops(res.data || []))
      .catch(() => toast.error("Couldn't load shops"))
      .finally(() => setLoading(false));
  }, []);

  const canImport = ["admin", "subadmin", "manager"].includes(role);
  const isAdmin = role === "admin";
  // Non-admins can only import into their own shop (the server enforces this too)
  const availableShops = isAdmin ? shops : shops.filter((s) => s.id === userShopId);
  const defaultShop =
    (typeof window !== "undefined" && localStorage.getItem("selected_shop_id")) || availableShops[0]?.id || "";

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 lg:space-y-8 max-w-[100vw] overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">Inventory</div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Bulk Import</h1>
          <p className="text-slate-500 text-sm mt-1">Add or update many products at once from an Excel or CSV file.</p>
        </motion.div>
        <Link
          href="/dashboard/products"
          className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
        >
          View products <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <Loader text="Loading..." subText="" />
      ) : !canImport ? (
        <div className="glass-card rounded-2xl p-12 text-center max-w-lg mx-auto">
          <Lock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h2 className="font-bold text-slate-900">Admins and managers only</h2>
          <p className="text-sm text-slate-500 mt-1">Ask an admin to import products for your shop.</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="max-w-4xl">
          <ImportProductsModal
            asPage
            shops={availableShops}
            defaultShopId={availableShops.some((s) => s.id === defaultShop) ? defaultShop : availableShops[0]?.id || ""}
            canChooseShop={isAdmin}
            onImported={() => {}}
          />
        </motion.div>
      )}
    </main>
  );
}
