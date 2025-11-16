"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Sidebar from "@/components/sidebar";
import Header from "@/components/header";

import {
  ArrowLeft,
  Store,
  User,
  FileText,
  Package,
  CheckCircle,
  XCircle,
  Edit,
  Save,
} from "lucide-react";

import {
  getPurchase,
  updatePurchase,
  receivePurchase,
} from "@/apiCalls";

export default function PurchaseDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState<any>(null);
  const [editingContainer, setEditingContainer] = useState(false);
  const [containerNumber, setContainerNumber] = useState("");
  const [savingContainer, setSavingContainer] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  /** -----------------------------------------
   * Fetch Purchase Details
   * ---------------------------------------- */
  const fetchPurchase = async () => {
    try {
      setLoading(true);
      const res = await getPurchase(id as string);

      setPurchase(res.data);
      setContainerNumber(res.data.container_number || "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchPurchase();
  }, [id]);

  /** -----------------------------------------
   * Save Container Number
   * ---------------------------------------- */
  const handleSaveContainer = async () => {
    try {
      setSavingContainer(true);

      await updatePurchase(id as string, {
        container_number: containerNumber.trim(),
      });

      setEditingContainer(false);
      fetchPurchase();
    } catch (e) {
      console.error(e);
      alert("Failed to save container number");
    } finally {
      setSavingContainer(false);
    }
  };

  /** -----------------------------------------
   * Mark All Items Received
   * ---------------------------------------- */
  const handleReceiveAll = async () => {
    if (!confirm("Mark all ordered items as received?")) return;

    try {
      setUpdatingStatus(true);
      await receivePurchase(id as string, { receive_now: true });

      fetchPurchase();
      alert("Purchase marked as fully received.");
    } catch (e) {
      console.error(e);
      alert("Failed to update purchase.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading || !purchase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading purchase details...</p>
      </div>
    );
  }

  const safeItems = Array.isArray(purchase.items) ? purchase.items : [];
  const shortId = purchase.id.slice(0, 8);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar isOpen={true} toggleSidebar={() => {}} isMobile={false} />

      <div className="flex-1">
        <Header />

        <main className="p-6 space-y-6">
          {/* Back Button */}
          <button
            onClick={() => router.push("/dashboard/purchases")}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Purchases
          </button>

          {/* MAIN CARD */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Purchase #{shortId}
            </h1>

            {/* INFO GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              <InfoCard
                icon={<Store className="w-5 h-5 text-gray-500" />}
                label="Shop"
                value={purchase.shop_name || purchase.shop_id}
              />

              <InfoCard
                icon={<User className="w-5 h-5 text-gray-500" />}
                label="Supplier"
                value={purchase.supplier_name || "Unknown"}
              />

              <InfoCard
                icon={<FileText className="w-5 h-5 text-gray-500" />}
                label="Status"
                value={purchase.status || "N/A"}
              />

              <InfoCard
                icon={<Package className="w-5 h-5 text-gray-500" />}
                label="Total Amount"
                value={`₦${Number(purchase.total_amount).toLocaleString()}`}
              />
            </div>

            {/* CONTAINER NUMBER */}
            <div className="bg-gray-50 p-4 border rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Container Number</p>

              {!editingContainer ? (
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">
                    {purchase.container_number || "*******"}
                  </p>

                  <button
                    onClick={() => setEditingContainer(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={containerNumber}
                    onChange={(e) => setContainerNumber(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 flex-1"
                    placeholder="Enter container number"
                  />
                  <button
                    disabled={savingContainer}
                    onClick={handleSaveContainer}
                    className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4" />
                    {savingContainer ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>

            {/* ITEMS TABLE */}
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-4 text-left text-gray-700">Product</th>
                    <th className="p-4 text-left text-gray-700">Ordered</th>
                    <th className="p-4 text-left text-gray-700">Received</th>
                    <th className="p-4 text-left text-gray-700">Cost</th>
                    <th className="p-4 text-left text-gray-700">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {safeItems.map((item: any) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        {item.product_name || item.product_id}
                      </td>
                      <td className="p-4">{item.ordered_quantity}</td>
                      <td className="p-4">{item.received_quantity}</td>

                      <td className="p-4">
                        ₦{Number(item.cost).toLocaleString()}
                      </td>

                      <td className="p-4 font-semibold">
                        ₦{(item.cost * item.ordered_quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-4 mt-4">

              {/* MARK AS RECEIVED */}
              <button
                disabled={updatingStatus}
                onClick={handleReceiveAll}
                className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {updatingStatus ? "Processing..." : "Mark All Received"}
              </button>

              {/* CANCELLED PURCHASE FEATURE CAN BE ADDED LATER */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/** SMALL CARD COMPONENT */
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
