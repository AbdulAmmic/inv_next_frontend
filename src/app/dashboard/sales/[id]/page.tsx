"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { getSale, refundSale } from "@/apiCalls";
import {
  ArrowLeft,
  User,
  Store,
  ShoppingCart,
  Receipt,
  RotateCcw,
} from "lucide-react";

export default function SaleDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refundLoading, setRefundLoading] = useState(false);

  /** ---------------------------
   *  FETCH SALE DETAILS
   * --------------------------- */
  useEffect(() => {
    if (!id) return;

    const fetchSale = async () => {
      try {
        setLoading(true);

        const res = await getSale(id as string);

        setSale({
          ...res.data.sale,
          items: res.data.items || [],
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSale();
  }, [id]);

  /** ---------------------------
   *  REFUND SALE
   * --------------------------- */
  const handleRefund = async () => {
    if (!confirm("Are you sure you want to refund this sale?")) return;

    try {
      setRefundLoading(true);
      await refundSale(id as string);
      alert("Sale refunded successfully!");
      router.push("/dashboard/sales");
    } catch (err) {
      console.error(err);
      alert("Failed to refund sale.");
    } finally {
      setRefundLoading(false);
    }
  };

  /** ---------------------------
   *  LOADING
   * --------------------------- */
  if (loading || !sale) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading sale details...</p>
      </div>
    );
  }

  const safeId = sale.id ? sale.id.slice(0, 8) : "N/A";
  const safeItems = Array.isArray(sale.items) ? sale.items : [];

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar isOpen={true} toggleSidebar={() => {}} isMobile={false} />

      <div className="flex-1">
        <Header />

        <main className="p-6 space-y-6">
          {/* BACK BUTTON */}
          <button
            onClick={() => router.push("/dashboard/sales")}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sales
          </button>

          {/* MAIN CARD */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Sale #{safeId}
            </h1>

            {/* INFO GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Shop */}
              <InfoCard
                icon={<Store className="w-5 h-5 text-gray-500" />}
                label="Shop"
                value={sale.shop_name || sale.shop_id || "Unknown"}
              />

              {/* Staff */}
              <InfoCard
                icon={<User className="w-5 h-5 text-gray-500" />}
                label="Staff"
                value={sale.staff_name || sale.staff_id || "Unknown"}
              />

              {/* ✔ CUSTOMER */}
              <InfoCard
                icon={<User className="w-5 h-5 text-blue-500" />}
                label="Customer"
                value={sale.customer_name || "Walk-in"}
              />

              {/* Payment */}
              <InfoCard
                icon={<ShoppingCart className="w-5 h-5 text-gray-500" />}
                label="Payment"
                value={sale.payment_method}
              />

              {/* Total */}
              <InfoCard
                icon={<Receipt className="w-5 h-5 text-gray-500" />}
                label="Total"
                value={`₦${Number(sale.total_amount || 0).toLocaleString()}`}
              />
            </div>

            {/* ITEMS TABLE */}
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-4 text-left text-gray-700">Product</th>
                    <th className="p-4 text-left text-gray-700">Qty</th>
                    <th className="p-4 text-left text-gray-700">Unit Price</th>
                    <th className="p-4 text-left text-gray-700">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {safeItems.map((item: any) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        {item.product_name || item.product_id}
                      </td>
                      <td className="p-4">{item.quantity}</td>
                      <td className="p-4">
                        ₦{Number(item.unit_price || 0).toLocaleString()}
                      </td>
                      <td className="p-4 font-semibold">
                        ₦{Number(item.total_price || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                Print Receipt
              </button>

              <button
                onClick={handleRefund}
                disabled={refundLoading}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {refundLoading ? "Processing..." : "Refund Sale"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/** Simple reusable component */
function InfoCard({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="p-4 bg-gray-50 border rounded-lg flex items-center gap-3">
      {icon}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
