"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getStocks,
  createSale,
  getCustomers,
} from "@/apiCalls";
import { toast } from "react-toastify";
import {
  ShoppingCart,
  RefreshCw,
  Plus,
  Minus,
  Trash2,
  Percent,
  Printer,
  Search,
  X,
  CreditCard,
  Wallet,
  Banknote,
  Calendar,
  ChevronRight,
  User,
  Check,
  AlertCircle
} from "lucide-react";

/* -------------------------
   Types
------------------------- */
interface StockRow {
  product_id: string;
  productName: string;
  sku?: string;
  currentStock: number;
  sellingPrice: number;
  category?: string;
}

interface CartItem {
  product_id: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  maxStock: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
}

interface Customer {
  id: string;
  full_name: string;
  phone?: string;
}

/* -------------------------
   PAGE
------------------------- */
export default function POSPage() {
  const [stock, setStock] = useState<StockRow[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // 🔹 Customers state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);

  const [savingSale, setSavingSale] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const shopId =
    typeof window !== "undefined"
      ? localStorage.getItem("selected_shop_id") || ""
      : "";

  const user =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : {};

  const paymentMethods: PaymentMethod[] = [
    { id: "cash", name: "Cash", icon: <Banknote className="w-4 h-4" /> },
    { id: "pos", name: "POS", icon: <CreditCard className="w-4 h-4" /> },
    { id: "transfer", name: "Transfer", icon: <Wallet className="w-4 h-4" /> },
    { id: "credit", name: "Credit", icon: <Calendar className="w-4 h-4" /> },
  ];

  /* -------------------------
     Computed values
  ------------------------- */
  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [cart]
  );

  const discountAmount = useMemo(() => {
    if (!discountValue) return 0;
    if (discountType === "flat") return discountValue;
    return (subtotal * discountValue) / 100;
  }, [discountValue, discountType, subtotal]);

  const total = useMemo(() => {
    const raw = subtotal - discountAmount + (otherCharges || 0);
    return raw < 0 ? 0 : raw;
  }, [subtotal, discountAmount, otherCharges]);

  /* -------------------------
     Fetch stock
  ------------------------- */
  const loadStock = async () => {
    try {
      setStockLoading(true);
      const res = await getStocks(shopId);
      const arr = res.data?.data || [];

      const mapped: StockRow[] = arr.map((item: any) => ({
        product_id: item.product_id,
        productName: item.productName,
        sku: item.sku,
        currentStock: item.currentStock,
        sellingPrice: item.sellingPrice,
        category: item.category,
      }));

      setStock(mapped);
    } catch (err) {
      toast.error("Failed to load stock");
      console.error("Stock loading error:", err);
    } finally {
      setStockLoading(false);
    }
  };

  /* -------------------------
     Fetch customers
  ------------------------- */
  const loadCustomers = async () => {
    if (!shopId) return;
    try {
      setCustomersLoading(true);
      const res = await getCustomers();
      const arr = res.data?.data || res.data || [];
      setCustomers(arr);
    } catch (err) {
      console.error("Customers loading error:", err);
      toast.error("Failed to load customers");
    } finally {
      setCustomersLoading(false);
    }
  };

  useEffect(() => {
    if (!shopId) {
      toast.error("No shop selected");
      return;
    }
    loadStock();
    loadCustomers();
  }, [shopId]);

  /* -------------------------
     Cart Operations
  ------------------------- */
  const addToCart = (row: StockRow) => {
    if (row.currentStock <= 0) {
      toast.info("Out of stock");
      return;
    }

    setCart((prev) => {
      const found = prev.find((p) => p.product_id === row.product_id);

      if (found) {
        if (found.quantity >= found.maxStock) {
          toast.info("No more stock available");
          return prev;
        }

        return prev.map((p) =>
          p.product_id === row.product_id
            ? { ...p, quantity: p.quantity + 1 }
            : p
        );
      }

      return [
        ...prev,
        {
          product_id: row.product_id,
          productName: row.productName,
          sku: row.sku,
          quantity: 1,
          unitPrice: row.sellingPrice,
          maxStock: row.currentStock,
        },
      ];
    });

    setStock((prev) =>
      prev.map((s) =>
        s.product_id === row.product_id
          ? { ...s, currentStock: s.currentStock - 1 }
          : s
      )
    );
  };

  const updateQty = (id: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product_id !== id) return i;
          if (qty <= 0) return null as any;
          if (qty > i.maxStock) {
            toast.info("Cannot exceed available stock");
            return { ...i, quantity: i.maxStock };
          }
          return { ...i, quantity: qty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (id: string) => {
    const removed = cart.find((i) => i.product_id === id);
    if (removed) {
      setStock((prev) =>
        prev.map((s) =>
          s.product_id === id
            ? { ...s, currentStock: s.currentStock + removed.quantity }
            : s
        )
      );
    }
    setCart((prev) => prev.filter((c) => c.product_id !== id));
  };

  const clearCart = () => {
    cart.forEach((item) => {
      setStock((prev) =>
        prev.map((s) =>
          s.product_id === item.product_id
            ? { ...s, currentStock: s.currentStock + item.quantity }
            : s
        )
      );
    });
    setCart([]);
    toast.info("Cart cleared");
  };

  /* -------------------------
     Complete sale with confirmation
  ------------------------- */
  const handleCompleteSaleClick = () => {
    if (!cart.length) {
      toast.info("Cart is empty");
      return;
    }
    if (!shopId) {
      toast.error("No shop selected");
      return;
    }
    setShowConfirmModal(true);
  };

  const completeSale = async () => {
    setSavingSale(true);
    setShowConfirmModal(false);

    try {
      const payload = {
        shop_id: shopId,
        customer_id: customerId,
        payment_method: paymentMethod,
        discount_amount: discountAmount,
        other_charges: otherCharges,
        items: cart.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unitPrice,
        })),
      };

      console.log("Sending sale payload:", payload);
      const res = await createSale(payload);

      if (res.data) {
        setReceipt(res.data);
        setCart([]);
        setDiscountValue(0);
        setOtherCharges(0);
        toast.success("Sale completed successfully!");
        await loadStock();
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      console.error("Sale error:", err);
      const errorMessage =
        err.response?.data?.error || err.message || "Sale failed";
      toast.error(errorMessage);

      cart.forEach((item) => {
        setStock((prev) =>
          prev.map((s) =>
            s.product_id === item.product_id
              ? { ...s, currentStock: s.currentStock + item.quantity }
              : s
          )
        );
      });
    } finally {
      setSavingSale(false);
    }
  };

  const filteredStock = stock.filter(
    (s) =>
      s.productName.toLowerCase().includes(search.toLowerCase()) ||
      (s.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  /* -------------------------
     UI
  ------------------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Point of Sale</h1>
                <p className="text-xs text-gray-500">Manage sales and transactions</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Online</span>
              </div>
              <div className="text-sm">
                <div className="font-medium">{user?.full_name || "User"}</div>
                <div className="text-gray-500 text-xs">{user?.role || "Staff"}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-8 px-4 lg:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* LEFT = PRODUCTS */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Products
                  </h2>
                  {stockLoading && (
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1 lg:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      placeholder="Search products or SKU..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={loadStock}
                    disabled={stockLoading}
                    className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${stockLoading ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredStock.map((product) => (
                  <button
                    key={product.product_id}
                    onClick={() => addToCart(product)}
                    disabled={product.currentStock <= 0}
                    className="group relative bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-blue-500 hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {product.productName}
                        </h3>
                        {product.sku && (
                          <p className="text-xs text-gray-500 mt-1">
                            {product.sku}
                          </p>
                        )}
                      </div>
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          product.currentStock <= 0
                            ? "bg-red-100 text-red-800"
                            : product.currentStock <= 5
                            ? "bg-orange-100 text-orange-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {product.currentStock} stock
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-blue-600">
                        ₦{product.sellingPrice.toLocaleString()}
                      </span>
                      <div className="p-2 bg-blue-600 text-white rounded-lg group-hover:bg-blue-700 transition-colors">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                ))}

                {filteredStock.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <div className="text-gray-400 mb-2">No products found</div>
                    <div className="text-sm text-gray-500">
                      {search ? "Try adjusting your search" : "No products available"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT = CART + SUMMARY */}
          <div className="space-y-6">
            {/* CART */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Shopping Cart ({cart.length})
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <div className="text-gray-500">Your cart is empty</div>
                  <div className="text-sm text-gray-400 mt-1">
                    Add products to get started
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.product_id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {item.productName}
                          </h3>
                          {item.sku && (
                            <p className="text-xs text-gray-500">
                              {item.sku}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.product_id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              updateQty(item.product_id, item.quantity - 1)
                            }
                            className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQty(item.product_id, item.quantity + 1)
                            }
                            disabled={item.quantity >= item.maxStock}
                            className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            ₦{(item.unitPrice * item.quantity).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            ₦{item.unitPrice.toLocaleString()} each
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SUMMARY */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Order Summary
              </h2>

              {/* Customer Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer
                </label>
                <div className="relative">
                  <select
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none"
                    value={customerId || ""}
                    onChange={(e) =>
                      setCustomerId(e.target.value ? e.target.value : null)
                    }
                  >
                    <option value="">Walk-in Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                        {c.phone ? ` (${c.phone})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">
                    ₦{subtotal.toLocaleString()}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-medium text-red-600">
                      -₦{discountAmount.toLocaleString()}
                    </span>
                  </div>
                )}

                {otherCharges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Other Charges</span>
                    <span className="font-medium">
                      +₦{otherCharges.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="border-t pt-3 mt-3 flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-blue-600">
                    ₦{total.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Discount Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount
                </label>
                <div className="flex gap-2">
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      className={`px-3 py-2 text-sm ${
                        discountType === "flat"
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      } transition-colors`}
                      onClick={() => setDiscountType("flat")}
                    >
                      ₦
                    </button>
                    <button
                      className={`px-3 py-2 text-sm ${
                        discountType === "percent"
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      } transition-colors`}
                      onClick={() => setDiscountType("percent")}
                    >
                      %
                    </button>
                  </div>
                  <input
                    type="number"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={discountValue}
                    onChange={(e) =>
                      setDiscountValue(Number(e.target.value) || 0)
                    }
                    placeholder={
                      discountType === "flat" ? "Amount" : "Percentage"
                    }
                  />
                </div>
              </div>

              {/* Other Charges */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Other Charges
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={otherCharges}
                  onChange={(e) =>
                    setOtherCharges(Number(e.target.value) || 0)
                  }
                  placeholder="Additional charges"
                />
              </div>

              {/* Payment Methods */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                        paymentMethod === method.id
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {method.icon}
                      {method.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Complete Sale Button */}
              <button
                disabled={savingSale || !cart.length}
                onClick={handleCompleteSaleClick}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm"
              >
                {savingSale ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ShoppingCart className="w-4 h-4" />
                )}
                {savingSale
                  ? "Processing..."
                  : `Complete Sale - ₦${total.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirm Sale
                </h3>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Items</span>
                  <span className="font-medium">{cart.length} items</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Customer</span>
                  <span className="font-medium">
                    {customerId 
                      ? customers.find(c => c.id === customerId)?.full_name || "Customer"
                      : "Walk-in Customer"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment</span>
                  <span className="font-medium">
                    {paymentMethods.find(p => p.id === paymentMethod)?.name}
                  </span>
                </div>
                <div className="border-t pt-4 flex justify-between font-bold">
                  <span>Total Amount</span>
                  <span className="text-blue-600">₦{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={completeSale}
                  disabled={savingSale}
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {savingSale ? "Processing..." : "Confirm Sale"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {receipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Sale Completed
                </h3>
                <p className="text-sm text-gray-500">Receipt #{receipt.sale?.id || "N/A"}</p>
              </div>
              <button
                onClick={() => setReceipt(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <div className="font-bold text-lg text-gray-900 mb-2">
                  TUHANAS KITCHEN AND SCENTS
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>{new Date().toLocaleString()}</div>
                  <div>Staff: {user?.full_name || "N/A"}</div>
                  <div>Customer: {receipt.sale?.customer_name || "Walk-in Customer"}</div>

                </div>
              </div>

              <div className="border-y border-gray-200 py-4 my-4 space-y-3">
                {receipt.items?.map((item: any) => (
                  <div
                    key={item.product_id}
                    className="flex justify-between items-center text-sm"
                  >
                    <div>
                      <div className="font-medium">
                        {item.product_name || item.product_id}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {item.quantity} × ₦{item.unit_price?.toLocaleString()}
                      </div>
                    </div>
                    <span className="font-semibold">
                      ₦{item.total_price?.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₦{receipt.sale?.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span className="text-red-600">
                    -₦{receipt.sale?.discount_amount?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Other Charges</span>
                  <span>+₦{receipt.sale?.other_charges?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-3 mt-3">
                  <span>Total Paid</span>
                  <span className="text-blue-600">
                    ₦{receipt.sale?.total_amount?.toFixed(2)}
                  </span>
                  <p>Thank you for Doing Business with us!, </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 border border-gray-300 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}