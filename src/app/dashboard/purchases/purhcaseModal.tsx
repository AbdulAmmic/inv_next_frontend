"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Minus,
  ShoppingCart,
  Building,
  Store,
} from "lucide-react";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  suppliers: any[];
  shops: any[];
  products: any[];
}

const PurchaseModal = ({ isOpen, onClose, onSave, suppliers, shops, products }: PurchaseModalProps) => {
  const [formData, setFormData] = useState({
    supplier_id: "",
    shop_id: "",
    items: [{
      product_id: "",
      quantity: 1,
      cost_price: 0,
      selling_price: 0
    }]
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        supplier_id: "",
        shop_id: "",
        items: [{
          product_id: "",
          quantity: 1,
          cost_price: 0,
          selling_price: 0
        }]
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      if (!formData.supplier_id || !formData.shop_id || formData.items.length === 0) {
        alert("Please fill in all required fields and add at least one item");
        setLoading(false);
        return;
      }

      const validItems = formData.items.every(
        item => item.product_id && item.quantity > 0 && item.cost_price > 0
      );

      if (!validItems) {
        alert("Please ensure all items have valid product, quantity, and cost price");
        setLoading(false);
        return;
      }

      // 🧩 Prepare properly formatted payload
      const formattedData = {
        supplier_id: String(formData.supplier_id),
        shop_id: String(formData.shop_id),
        items: formData.items.map(i => ({
          product_id: String(i.product_id),
          quantity: Number(i.quantity),
          cost_price: Number(i.cost_price),
          selling_price: Number(i.selling_price)
        }))
      };

      console.log("✅ Sending purchase payload:", formattedData);

      await onSave(formattedData);

      // Reset form on success
      setFormData({
        supplier_id: "",
        shop_id: "",
        items: [{
          product_id: "",
          quantity: 1,
          cost_price: 0,
          selling_price: 0
        }]
      });

      onClose();
    } catch (error) {
      console.error("❌ Error saving purchase:", error);
      alert("Failed to create purchase. Please check your input and try again.");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { product_id: "", quantity: 1, cost_price: 0, selling_price: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length === 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    }));
  };

  const getProductPrice = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? product.price : 0;
  };

  const totalCost = formData.items.reduce((sum, item) => sum + item.cost_price * item.quantity, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-4xl overflow-hidden shadow-xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold flex items-center gap-2 text-gray-800">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            New Purchase Order
          </h2>
          <button onClick={onClose} disabled={loading} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto max-h-[75vh]">
          {/* Supplier & Shop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" /> Supplier *
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-600" /> Shop *
              </label>
              <select
                value={formData.shop_id}
                onChange={(e) => setFormData({ ...formData, shop_id: e.target.value })}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Shop</option>
                {shops.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Purchase Items</h3>
              <button type="button" onClick={addItem} disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 border border-gray-200 rounded-xl bg-gray-50">
                <div className="lg:col-span-4">
                  <label className="text-sm font-medium">Product *</label>
                  <select
                    value={item.product_id}
                    onChange={(e) => {
                      const productId = e.target.value;
                      updateItem(index, "product_id", productId);
                      if (productId) {
                        const productPrice = getProductPrice(productId);
                        updateItem(index, "selling_price", productPrice);
                      }
                    }}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - ₦{p.price}</option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label className="text-sm font-medium">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="text-sm font-medium">Cost Price *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.cost_price}
                    onChange={(e) => updateItem(index, "cost_price", Number(e.target.value))}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="text-sm font-medium">Selling Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.selling_price}
                    onChange={(e) => updateItem(index, "selling_price", Number(e.target.value))}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="lg:col-span-2 flex items-end">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={loading || formData.items.length === 1}
                    className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex justify-center items-center gap-2"
                  >
                    <Minus className="w-4 h-4" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total Cost */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex justify-between items-center">
              <span className="font-medium text-blue-800">Total Cost:</span>
              <span className="text-2xl font-bold text-blue-900">₦{totalCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || totalCost === 0}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Purchase Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseModal;
