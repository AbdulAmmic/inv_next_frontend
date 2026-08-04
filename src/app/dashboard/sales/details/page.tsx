"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSale, refundSale, markSalePaid } from "@/apiCalls";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  User,
  Store,
  ShoppingCart,
  Receipt,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";

function SaleDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();

  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refundLoading, setRefundLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const [settleMethod, setSettleMethod] = useState<"cash" | "pos" | "transfer">("cash");
  const [markingPaid, setMarkingPaid] = useState(false);

  /** ---------------------------
   *  FETCH SALE DETAILS
   * --------------------------- */
  useEffect(() => {
    if (!id) return;

    const fetchSale = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await getSale(id as string);
        const sale = res.data.sale;

        if (!sale) {
          throw new Error('Sale details not found');
        }

        setSale({
          ...sale,
          items: Array.isArray(res.data.items) ? res.data.items : [],
        });
      } catch (err: any) {
        console.error(err);
        setError(err?.message || 'Failed to load sale details');
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
   *  MARK CREDIT SALE AS PAID
   * --------------------------- */
  const handleMarkPaid = async () => {
    try {
      setMarkingPaid(true);
      await markSalePaid(id as string, settleMethod);
      setSale((prev: any) => prev && { ...prev, payment_method: settleMethod });
      toast.success(`Marked as paid via ${settleMethod}`);
      setShowMarkPaid(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark sale as paid");
    } finally {
      setMarkingPaid(false);
    }
  };

  /** ---------------------------
   *  LOADING
   * --------------------------- */
  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">No sale ID provided.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading sale details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-xl w-full bg-white border border-red-200 rounded-xl p-8 text-center">
          <p className="text-red-700 font-semibold mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard/sales')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Sales
          </button>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Sale details could not be loaded.</p>
      </div>
    );
  }

  const safeId = sale.id ? sale.id.slice(0, 8) : "N/A";
  const safeItems = Array.isArray(sale.items) ? sale.items : [];

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[100vw] overflow-hidden">
          {/* BACK BUTTON */}
          <button
            onClick={() => router.push("/dashboard/sales")}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sales
          </button>

          {/* MAIN CARD */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
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
                icon={<ShoppingCart className={`w-5 h-5 ${sale.payment_method === "credit" ? "text-amber-500" : "text-gray-500"}`} />}
                label="Payment"
                value={sale.payment_method === "credit" ? "Credit (unpaid)" : sale.payment_method}
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
              <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[560px]">
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

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {safeItems.map((item: any) => (
                  <div key={item.id} className="p-4 space-y-3 bg-white">
                    <p className="font-semibold text-gray-900">{item.product_name || item.product_id}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-3 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Qty</p>
                        <p className="font-medium">{item.quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Unit Price</p>
                        <p className="font-medium">₦{Number(item.unit_price || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-sm text-gray-500">Total</span>
                      <span className="font-bold text-gray-900">₦{Number(item.total_price || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                Print Receipt
              </button>

              <button
                onClick={handleRefund}
                disabled={refundLoading || sale.status === "refunded"}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {refundLoading ? "Processing..." : "Refund Sale"}
              </button>

              {sale.payment_method === "credit" && (
                <button
                  onClick={() => setShowMarkPaid(true)}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as Paid
                </button>
              )}
            </div>

            {/* MARK AS PAID PANEL */}
            {showMarkPaid && (
              <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-emerald-900">
                  This sale was made on credit. How did the customer pay?
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={settleMethod}
                    onChange={(e) => setSettleMethod(e.target.value as any)}
                    className="border border-emerald-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="cash">Cash</option>
                    <option value="pos">POS</option>
                    <option value="transfer">Bank Transfer</option>
                  </select>
                  <button
                    onClick={handleMarkPaid}
                    disabled={markingPaid}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {markingPaid ? "Saving..." : "Confirm Payment"}
                  </button>
                  <button
                    onClick={() => setShowMarkPaid(false)}
                    className="px-4 py-2 bg-white border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
    </main>
  );
}

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
    <div className="p-4 bg-gray-50 border rounded-lg flex items-center gap-3 min-w-0">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium text-gray-900 break-words">{value}</p>
      </div>
    </div>
  );
}

export default function SaleDetailPage() {
  return (
    <Suspense fallback={<div>Loading sale...</div>}>
      <SaleDetailContent />
    </Suspense>
  );
}
