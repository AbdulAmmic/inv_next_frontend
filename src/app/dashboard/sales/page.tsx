"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { getSales } from "@/apiCalls";
import { Eye } from "lucide-react";

export default function SalesPage() {
  const router = useRouter();

  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);

  const fetchSales = async (shopId: string) => {
    try {
      setLoading(true);

      const res = await getSales(shopId);
      const data = res.data.data || [];

      const cleaned = data.map((s: any) => {
        const isReturned = s.status === "refunded";

        return {
          id: s.id,
          sale_number: s.sale_number,      // ⬅️ backend already provides
          shop_name: s.shop_name,          // ⬅️ correct shop name
          staff_name: s.staff_name,        // ⬅️ staff name
          customer_name: s.customer_name,  // ⬅️ added customer name

          amount: isReturned
            ? -Math.abs(s.total_amount || 0)
            : s.total_amount || 0,

          payment_method: s.payment_method,
          item_count: s.item_count,        // ⬅️ backend already returns this
          created_at_display: s.created_at
            ? new Date(s.created_at).toLocaleString()
            : "Unknown",

          status: s.status,
        };
      });

      setSales(cleaned);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const shopId = localStorage.getItem("selected_shop_id");
    setSelectedShop(shopId);

    if (shopId) {
      fetchSales(shopId);
    } else {
      setLoading(false);
    }
  }, []);

  if (!selectedShop) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center text-gray-600">
          <p>Please select a shop from the header to view sales.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading sales...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar isOpen={true} toggleSidebar={() => {}} isMobile={false} />

      <div className="flex-1">
        <Header />

        <main className="p-6 space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Sales Records</h1>
          <p className="text-gray-600">
            Showing sales for shop: <b>{selectedShop}</b>
          </p>

          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Sale #</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Staff</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Customer</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Amount</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Payment</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Items</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {sales.length > 0 ? (
                  sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="p-4 font-semibold text-gray-900">{sale.sale_number}</td>

                      <td className="p-4 text-gray-700">{sale.staff_name}</td>

                      <td className="p-4 text-gray-700">
                        {sale.customer_name || "Walk-in"}
                      </td>

                      <td
                        className={`p-4 font-semibold ${
                          sale.amount < 0 ? "text-red-600" : "text-gray-900"
                        }`}
                      >
                        ₦{sale.amount.toLocaleString()}
                      </td>

                      <td className="p-4 text-gray-700">{sale.payment_method}</td>

                      <td className="p-4 text-gray-700">{sale.item_count}</td>

                      <td className="p-4">
                        {sale.status === "refunded" ? (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                            Returned
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Completed
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-gray-600">{sale.created_at_display}</td>

                      <td className="p-4">
                        <button
                          onClick={() => router.push(`/dashboard/sales/${sale.id}`)}
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-500">
                      No sales found for this shop.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
