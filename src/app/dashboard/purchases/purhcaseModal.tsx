"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Minus,
  ShoppingCart,
  Building,
  Store,
  Search,
  Package,
  DollarSign,
  TrendingUp,
  Calculator
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);

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
      setSearchTerm("");
      setSelectedProductIndex(null);
    }
  }, [isOpen]);

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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
      setSearchTerm("");
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
    if (selectedProductIndex === index) {
      setSelectedProductIndex(null);
      setSearchTerm("");
    }
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

  const handleProductSelect = (index: number, productId: string) => {
    updateItem(index, "product_id", productId);
    if (productId) {
      const productPrice = getProductPrice(productId);
      updateItem(index, "selling_price", productPrice);
    }
    setSelectedProductIndex(null);
    setSearchTerm("");
  };

  const getSelectedProduct = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  const totalCost = formData.items.reduce((sum, item) => sum + item.cost_price * item.quantity, 0);
  const totalItems = formData.items.reduce((sum, item) => sum + item.quantity, 0);
  const potentialProfit = formData.items.reduce((sum, item) => {
    const profit = (item.selling_price - item.cost_price) * item.quantity;
    return sum + (profit > 0 ? profit : 0);
  }, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300">
      <div className="bg-white rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl animate-scaleIn">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">New Purchase Order</h2>
                <p className="text-blue-100 text-sm">Add products from suppliers to your inventory</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              disabled={loading}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8 max-h-[75vh] overflow-y-auto">
          {/* Supplier & Shop Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" /> 
                Supplier *
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Store className="w-4 h-4 text-green-600" /> 
                Destination Shop *
              </label>
              <select
                value={formData.shop_id}
                onChange={(e) => setFormData({ ...formData, shop_id: e.target.value })}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white shadow-sm"
              >
                <option value="">Select Shop</option>
                {shops.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Purchase Items Section */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Purchase Items</h3>
                <p className="text-sm text-gray-600">Add products to your purchase order</p>
              </div>
              <button 
                type="button" 
                onClick={addItem} 
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg shadow-green-500/25"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            {formData.items.map((item, index) => (
              <div key={index} className="p-6 border border-gray-200 rounded-2xl bg-gradient-to-br from-gray-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                  {/* Product Search & Selection */}
                  <div className="xl:col-span-4 space-y-3">
                    <label className="text-sm font-semibold text-gray-700">Product *</label>
                    
                    {!item.product_id ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => {
                              setSearchTerm(e.target.value);
                              setSelectedProductIndex(index);
                            }}
                            onFocus={() => setSelectedProductIndex(index)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          />
                        </div>
                        
                        {/* Search Results Dropdown */}
                        {selectedProductIndex === index && filteredProducts.length > 0 && (
                          <div className="absolute z-10 w-full max-w-md mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            {filteredProducts.map(product => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => handleProductSelect(index, product.id)}
                                className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-gray-900">{product.name}</div>
                                <div className="text-sm text-gray-600 flex justify-between">
                                  <span>SKU: {product.sku || "N/A"}</span>
                                  <span className="font-semibold text-green-600">₦{product.price}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-white border border-green-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Package className="w-4 h-4 text-green-600" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {getSelectedProduct(item.product_id)?.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              ₦{getSelectedProduct(item.product_id)?.price}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            updateItem(index, "product_id", "");
                            setSearchTerm("");
                          }}
                          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="xl:col-span-2 space-y-3">
                    <label className="text-sm font-semibold text-gray-700">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                      required
                      disabled={loading}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>

                  {/* Cost Price */}
                  <div className="xl:col-span-2 space-y-3">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-red-500" /> Cost Price *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.cost_price}
                      onChange={(e) => updateItem(index, "cost_price", Number(e.target.value))}
                      required
                      disabled={loading}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                    />
                  </div>

                  {/* Selling Price */}
                  <div className="xl:col-span-2 space-y-3">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-green-500" /> Selling Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.selling_price}
                      onChange={(e) => updateItem(index, "selling_price", Number(e.target.value))}
                      disabled={loading}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                    />
                  </div>

                  {/* Remove Button */}
                  <div className="xl:col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={loading || formData.items.length === 1}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 shadow-lg shadow-red-500/25 flex justify-center items-center gap-2"
                    >
                      <Minus className="w-4 h-4" /> Remove
                    </button>
                  </div>
                </div>

                {/* Item Summary */}
                {item.product_id && item.quantity > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <div className="text-gray-600">Item Total</div>
                      <div className="font-semibold text-blue-700">
                        ₦{(item.cost_price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <div className="text-gray-600">Potential Revenue</div>
                      <div className="font-semibold text-green-700">
                        ₦{(item.selling_price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg">
                      <div className="text-gray-600">Margin</div>
                      <div className={`font-semibold ${item.selling_price > item.cost_price ? 'text-green-700' : 'text-red-700'}`}>
                        {item.cost_price > 0 ? `${(((item.selling_price - item.cost_price) / item.cost_price) * 100).toFixed(1)}%` : '0%'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <Calculator className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-sm font-medium text-blue-800">Total Items</div>
                  <div className="text-2xl font-bold text-blue-900">{totalItems}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="text-sm font-medium text-purple-800">Total Cost</div>
                  <div className="text-2xl font-bold text-purple-900">₦{totalCost.toFixed(2)}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium text-green-800">Potential Profit</div>
                  <div className="text-2xl font-bold text-green-900">₦{potentialProfit.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all duration-200 shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || totalCost === 0}
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-xl hover:from-blue-700 hover:to-purple-800 font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-500"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Purchase Order...
                </div>
              ) : (
                "Create Purchase Order"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseModal;