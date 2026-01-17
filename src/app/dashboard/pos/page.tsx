'use client'

import { useEffect, useMemo, useState } from "react";
import {
  getStocks,
  createSale,
  getCustomers,
  getSale,
  createCustomer,
} from "@/apiCalls";
import { toast } from "react-toastify";
import ReceiptComponent from "@/components/ReceiptComponent";

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
  AlertCircle,
  Camera,
  ChevronsUpDown
} from "lucide-react";
import dynamic from "next/dynamic";
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';

// Dynamic import for QrReader to avoid SSR issues
const QrReader = dynamic(() => import("react-qr-reader").then((mod) => mod.QrReader), {
  ssr: false,
});

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
  name: string; // Changed from full_name to match backend
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
  const [showScanner, setShowScanner] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>("");
  const [query, setQuery] = useState("");

  // Quick Add Customer State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });

  const handleAddCustomer = async () => {
    if (!newCustomer.name) {
      toast.error("Name is required");
      return;
    }
    try {
      setCreatingCustomer(true);
      const res = await createCustomer(newCustomer);
      if (res.data) {
        const created = res.data; // backend returns created customer object
        // Map if necessary, but backend create_customer returns dict matching model?
        // Let's assume it matches Customer interface roughly (name, phone, id)
        // Wait, backend create_customer returns `customer.to_dict()`
        // checking models.py: to_dict returns {id, name, phone ...}
        // It matches properly (except full_name vs name which I fixed in frontend).
        // Actually backend user model has full_name, customer model has name.

        const newCus: Customer = {
          id: created.id,
          name: created.name,
          phone: created.phone
        };

        setCustomers(prev => [...prev, newCus]);
        setCustomerId(newCus.id); // Auto-select
        toast.success("Customer created!");
        setShowAddCustomerModal(false);
        setNewCustomer({ name: "", phone: "" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to create customer");
    } finally {
      setCreatingCustomer(false);
    }
  };


  const shopId =
    typeof window !== "undefined"
      ? localStorage.getItem("selected_shop_id") || ""
      : "";

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    }
  }, []);

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
        // Map API response to ReceiptComponent format
        const saleData = {
          ...res.data.sale,
          items: res.data.items,
          total: res.data.sale.total_amount,
          discount: res.data.sale.discount_amount,
        };
        setReceipt(saleData);
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

  const filteredCustomers =
    query === ""
      ? customers
      : customers.filter((person) => {
        return (
          person.name.toLowerCase().includes(query.toLowerCase()) ||
          (person.phone || "").toLowerCase().includes(query.toLowerCase())
        );
      });


  /* -------------------------
     TTS Helper
  ------------------------- */
  const speak = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Cancel current speaking
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const processSku = (sku: string) => {
    const scannedSku = sku.toLowerCase().trim();
    if (!scannedSku) return;

    // Prevent double scan of same item within 2 seconds if camera is continuous
    if (scannedSku === lastScanned) return;
    setLastScanned(scannedSku);
    setTimeout(() => setLastScanned(""), 2000);

    const product = stock.find((s) => (s.sku || "").toLowerCase() === scannedSku);

    if (product) {
      if (product.currentStock <= 0) {
        speak("Product out of stock");
        toast.info("Out of stock");
        return;
      }

      // Add to cart
      addToCart(product);
      setSearch("");

      // Speak feedback
      // We estimate the new total by adding the product price to the current total
      // This is an approximation because discounts might be percentage-based
      let addedPrice = product.sellingPrice;
      let estimatedTotal = total + addedPrice;

      // If percentage discount, recalculate
      if (discountType === 'percent' && discountValue > 0) {
        const newSub = subtotal + addedPrice;
        const discountAmt = (newSub * discountValue) / 100;
        estimatedTotal = newSub - discountAmt + otherCharges;
      }

      speak(`Added ${product.productName}. Total is ${Math.round(estimatedTotal)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search) {
      // Clear last scanned for manual input to allow repeated entry
      setLastScanned("");
      processSku(search);
    }
  };

  const handleCameraScan = (result: any, error: any) => {
    if (result) {
      const text = result?.text || result; // handle different versions
      processSku(text);
    }
  };

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
                      placeholder="Scan Barcode or Search..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                    />
                  </div>

                  <button
                    onClick={() => setShowScanner(true)}
                    className="p-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                    title="Scan Barcode"
                  >
                    <Camera className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm font-medium">Scan Barcode</span>
                  </button>

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
                        className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${product.currentStock <= 0
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
              {/* Customer Selection */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <button
                    onClick={() => setShowAddCustomerModal(true)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Quick Add
                  </button>
                </div>
                <Combobox
                  value={customers.find((c) => c.id === customerId) || null}
                  onChange={(val: Customer | null) => {
                    setCustomerId(val ? val.id : null);
                  }}
                  onClose={() => setQuery('')}
                >
                  <div className="relative">
                    <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 sm:text-sm">
                      <ComboboxInput
                        className="w-full border-none py-2.5 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                        displayValue={(person: Customer) => person ? `${person.name} ${person.phone ? `(${person.phone})` : ''}` : ''}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search customer by name or phone..."
                      />
                      <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronsUpDown
                          className="h-5 w-5 text-gray-400"
                          aria-hidden="true"
                        />
                      </ComboboxButton>
                    </div>
                    <ComboboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
                      {/* Option for Walk-in (Clearing selection) */}
                      <ComboboxOption
                        key="walk-in"
                        value={null}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-4 pr-4 ${active ? 'bg-blue-600 text-white' : 'text-gray-900'
                          }`
                        }
                      >
                        {({ selected, active }) => (
                          <>
                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                              Walk-in Customer
                            </span>
                            {selected ? (
                              <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-blue-600'}`}>
                                {/* <Check className="h-5 w-5" aria-hidden="true" /> */}
                              </span>
                            ) : null}
                          </>
                        )}
                      </ComboboxOption>

                      {filteredCustomers.length === 0 && query !== "" ? (
                        <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                          Nothing found.
                        </div>
                      ) : (
                        filteredCustomers.map((person) => (
                          <ComboboxOption
                            key={person.id}
                            value={person}
                            className={({ active }) =>
                              `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-600 text-white' : 'text-gray-900'
                              }`
                            }
                          >
                            {({ selected, active }) => (
                              <>
                                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                  {person.name} <span className={`text-xs ${active ? 'text-blue-100' : 'text-gray-500'}`}>{person.phone ? `(${person.phone})` : ''}</span>
                                </span>
                                {selected ? (
                                  <span
                                    className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-blue-600'
                                      }`}
                                  >
                                    <Check className="h-5 w-5" aria-hidden="true" />
                                  </span>
                                ) : null}
                              </>
                            )}
                          </ComboboxOption>
                        ))
                      )}
                    </ComboboxOptions>
                  </div>
                </Combobox>
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
                      className={`px-3 py-2 text-sm ${discountType === "flat"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                        } transition-colors`}
                      onClick={() => setDiscountType("flat")}
                    >
                      ₦
                    </button>
                    <button
                      className={`px-3 py-2 text-sm ${discountType === "percent"
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
                      className={`p-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${paymentMethod === method.id
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
                      ? customers.find(c => c.id === customerId)?.name || "Customer"
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

      {/* CAMERA SCANNER MODAL */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setShowScanner(false)}
              className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5 text-black" />
            </button>

            <div className="p-4 bg-gray-900">
              <h3 className="text-white text-center font-semibold mb-1">Scan Barcode</h3>
              <p className="text-gray-400 text-center text-xs">Point camera at a barcode</p>
            </div>

            <div className="relative aspect-square bg-black">
              <QrReader
                onResult={handleCameraScan}
                constraints={{ facingMode: 'environment' }}
                containerStyle={{ width: '100%', height: '100%' }}
                videoStyle={{ objectFit: 'cover' }}
              />
              {/* Visual guide overlay */}
              <div className="absolute inset-0 border-2 border-blue-500/50 m-12 rounded-lg pointer-events-none animate-pulse"></div>
            </div>

            <div className="p-4 bg-white text-center">
              <button
                onClick={() => setShowScanner(false)}
                className="text-gray-500 text-sm hover:text-gray-700 font-medium"
              >
                Close Scanner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">New Customer</h3>
              <button onClick={() => setShowAddCustomerModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Customer Name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone (Optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="Phone Number"
                />
              </div>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button onClick={() => setShowAddCustomerModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleAddCustomer}
                disabled={creatingCustomer || !newCustomer.name}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creatingCustomer ? "Saving..." : "Save Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {receipt && (
        <ReceiptComponent
          sale={receipt}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}