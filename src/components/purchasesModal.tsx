"use client";

import { useState, useEffect } from "react";
import { X, MinusCircle, PlusCircle } from "lucide-react";
import { updatePurchase } from "@/apiCalls";

interface PurchaseItem {
  id: string;
  product_name: string;
}

interface CancelledItem {
  id: string;
  product_name: string;
  reason: string;
  money_lost: boolean;
}

interface EditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: any;
  onSuccess: () => void;
}

export default function EditPurchaseModal({
  isOpen,
  onClose,
  purchase,
  onSuccess
}: EditPurchaseModalProps) {

  const [containerNo, setContainerNo] = useState("");
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatPercentage, setVatPercentage] = useState(7.5);
  const [shippingCost, setShippingCost] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("ordered");

  const [cancelledItems, setCancelledItems] = useState<CancelledItem[]>([]);

  useEffect(() => {
    if (purchase) {
      setContainerNo(purchase.container_number || "");
      setVatEnabled(purchase.vat_enabled || false);
      setVatPercentage(purchase.vat_percentage || 7.5);
      setShippingCost(purchase.shipping_cost || 0);
      setOtherCharges(purchase.other_charges || 0);
      setNote(purchase.note || "");
      setStatus(purchase.status || "ordered");

      // build cancelled list structure
      setCancelledItems(
        (purchase.items || []).map((item: any) => ({
          id: item.product_id,
          product_name: item.product_name || "Unknown Product",
          reason: "",
          money_lost: false,
        }))
      );
    }
  }, [purchase]);

  if (!isOpen) return null;

  const handleCancelReasonChange = (id: string, field: keyof CancelledItem, value: string | boolean) => {
    setCancelledItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        container_number: containerNo,
        vat_enabled: vatEnabled,
        vat_percentage: vatEnabled ? vatPercentage : 0,
        shipping_cost: Number(shippingCost),
        other_charges: Number(otherCharges),
        note,
        status,
        cancelled_items: cancelledItems.filter((i) => i.reason.length > 0)
      };

      await updatePurchase(purchase.id, payload);

      alert("Purchase updated successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      alert("Failed to update purchase");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Edit Purchase</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 space-y-6">

          {/* Container Number */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium">Container Number</label>
            <input
              value={containerNo}
              onChange={(e) => setContainerNo(e.target.value)}
              placeholder="Enter container number"
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* VAT */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={vatEnabled}
              onChange={() => setVatEnabled(!vatEnabled)}
              className="w-5 h-5"
            />
            <label className="font-medium text-gray-700">Enable VAT</label>
          </div>

          {vatEnabled && (
            <div>
              <label className="block text-gray-700 mb-1 font-medium">VAT Percentage (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={vatPercentage}
                onChange={(e) => setVatPercentage(Number(e.target.value))}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Charges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Shipping Cost</label>
              <input
                type="number"
                value={shippingCost}
                onChange={(e) => setShippingCost(Number(e.target.value))}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-1 font-medium">Other Charges</label>
              <input
                type="number"
                value={otherCharges}
                onChange={(e) => setOtherCharges(Number(e.target.value))}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ordered">Ordered</option>
              <option value="partial">Partial</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Cancelled Items */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Cancelled Items</h3>

            {cancelledItems.map((item) => (
              <div key={item.id} className="bg-gray-50 p-4 rounded-lg border mb-3">
                <p className="font-medium text-gray-800">{item.product_name}</p>

                {/* Reason */}
                <div className="mt-2">
                  <label className="text-gray-600 text-sm">Reason for cancellation:</label>
                  <input
                    type="text"
                    value={item.reason}
                    onChange={(e) =>
                      handleCancelReasonChange(item.id, "reason", e.target.value)
                    }
                    placeholder="e.g. Supplier out of stock"
                    className="w-full mt-1 border rounded-lg px-3 py-2"
                  />
                </div>

                {/* Money Lost */}
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="checkbox"
                    checked={item.money_lost}
                    onChange={(e) =>
                      handleCancelReasonChange(item.id, "money_lost", e.target.checked)
                    }
                    className="w-5 h-5"
                  />
                  <span className="text-gray-700">Money Lost?</span>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-gray-700 mb-1 font-medium">Notes</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
}
