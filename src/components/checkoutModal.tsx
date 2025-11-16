import React, { useState, useRef } from "react";
import { Dialog } from "@headlessui/react";

interface Customer {
  id: number;
  name: string;
}

interface CartItem {
  id: number;
  name: string;
  qty: number;
  price: number;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  customers: Customer[];
  cartItems: CartItem[]; // ✅ new
  shopName: string; // ✅ new
  onConfirm: (customerId: number | null, paymentType: string) => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  total,
  customers,
  cartItems,
  shopName,
  onConfirm,
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [paymentType, setPaymentType] = useState<string>("Cash");
  const [search, setSearch] = useState<string>("");

  const receiptRef = useRef<HTMLDivElement>(null);

  const handleConfirm = () => {
    if (paymentType === "Debt" && !selectedCustomer) {
      alert("Please select a customer for debt payment.");
      return;
    }

    onConfirm(selectedCustomer, paymentType);
    printReceipt();
    onClose();
  };

  const printReceipt = () => {
    if (receiptRef.current) {
      const receiptContent = receiptRef.current.innerHTML;
      const printWindow = window.open("", "", "width=400,height=600");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt</title>
              <style>
                body { font-family: monospace; padding: 10px; }
                h2 { text-align: center; margin-bottom: 5px; }
                .line { border-top: 1px dashed #333; margin: 8px 0; }
                table { width: 100%; border-collapse: collapse; font-size: 14px; }
                th, td { padding: 4px; text-align: left; }
                .total { font-weight: bold; font-size: 1.1em; }
                .center { text-align: center; }
              </style>
            </head>
            <body>
              ${receiptContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onClose={onClose} as="div" className="fixed inset-0 z-50">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
          <Dialog.Title className="text-xl font-bold mb-4">Checkout</Dialog.Title>

          {/* Payment Type */}
          <div className="mb-4">
            <label className="block font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Transfer">Transfer</option>
              <option value="Debt">Debt</option>
            </select>
          </div>

          {/* Customer (always visible + searchable) */}
          <div className="mb-4">
            <label className="block font-medium text-gray-700 mb-1">Select Customer</label>
            <input
              type="text"
              placeholder="Search customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-2"
            />
            <select
              value={selectedCustomer ?? ""}
              onChange={(e) => setSelectedCustomer(Number(e.target.value) || null)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">-- Choose a Customer --</option>
              {filteredCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Order Summary */}
          <div className="border-t pt-3 mb-4">
            <div className="flex justify-between text-gray-700">
              <span>Total:</span>
              <span className="font-bold">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Confirm Checkout
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Receipt for printing */}
      <div ref={receiptRef} style={{ display: "none" }}>
        <h2>{shopName}</h2>
        <p className="center">Date: {new Date().toLocaleString()}</p>
        <div className="line" />

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Sub</th>
            </tr>
          </thead>
          <tbody>
            {cartItems.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.qty}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>${(item.qty * item.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="line" />
        <p>Payment: {paymentType}</p>
        <p>
          Customer:{" "}
          {selectedCustomer
            ? customers.find((c) => c.id === selectedCustomer)?.name
            : "N/A"}
        </p>
        <div className="line" />
        <p className="total">TOTAL: ${total.toFixed(2)}</p>
        <div className="line" />
        <p className="center">Thank you for shopping with us!</p>
      </div>
    </Dialog>
  );
};

export default CheckoutModal;
