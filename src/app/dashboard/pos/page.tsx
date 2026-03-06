'use client'

import { useEffect, useMemo, useState } from "react";
import {
  getStocks,
  createSale,
  getCustomers,
  createCustomer,
} from "@/apiCalls";
import { toast } from "react-hot-toast";
import ReceiptComponent from "@/components/ReceiptComponent";
import DashboardLayout from "@/components/dashboardLayout";

import {
  ShoppingCart,
  RefreshCw,
  Plus,
  Minus,
  Trash2,
  Search,
  X,
  CreditCard,
  Wallet,
  Banknote,
  Calendar,
  User,
  Check,
  Camera,
  ChevronsUpDown,
  Package,
  ArrowRight,
  UserPlus
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Transition
} from '@headlessui/react';
import { motion, AnimatePresence } from "framer-motion";

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

interface Customer {
  id: string;
  name: string;
  phone?: string;
}

export default function POSPage() {
  const [stock, setStock] = useState<StockRow[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [savingSale, setSavingSale] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>("");

  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });

  const [shopId, setShopId] = useState<string>("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedShopId = localStorage.getItem("selected_shop_id") || "";
      setShopId(storedShopId);
      const storedUser = localStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleAddCustomer = async () => {
    if (!newCustomer.name) {
      toast.error("Name is required");
      return;
    }
    try {
      setCreatingCustomer(true);
      const res = await createCustomer(newCustomer);
      if (res.data) {
        const created = res.data;
        const newCus: Customer = {
          id: created.id,
          name: created.name,
          phone: created.phone
        };
        setCustomers(prev => [...prev, newCus]);
        setCustomerId(newCus.id);
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

  useEffect(() => {
    // Only fetch if shopId is resolved
    if (shopId) {
      loadStock();
      loadCustomers();
    }
  }, [shopId]);

  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0), [cart]);

  const discountAmount = useMemo(() => {
    if (!discountValue) return 0;
    if (discountType === "flat") return discountValue;
    return (subtotal * discountValue) / 100;
  }, [discountValue, discountType, subtotal]);

  const total = useMemo(() => {
    const raw = subtotal - discountAmount + (otherCharges || 0);
    return raw < 0 ? 0 : raw;
  }, [subtotal, discountAmount, otherCharges]);

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
    } finally {
      setStockLoading(false);
    }
  };

  const loadCustomers = async () => {
    if (!shopId) return;
    try {
      const res = await getCustomers();
      setCustomers(res.data?.data || res.data || []);
    } catch (err) {
      toast.error("Failed to load customers");
    }
  };


  const addToCart = (row: StockRow) => {
    if (row.currentStock <= 0) {
      toast.error("Out of stock");
      return;
    }

    setCart((prev) => {
      const found = prev.find((p) => p.product_id === row.product_id);
      if (found) {
        if (found.quantity >= found.maxStock) {
          toast.error("Inventory limit reached");
          return prev;
        }
        return prev.map((p) => p.product_id === row.product_id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, {
        product_id: row.product_id,
        productName: row.productName,
        sku: row.sku,
        quantity: 1,
        unitPrice: row.sellingPrice,
        maxStock: row.currentStock,
      }];
    });

    setStock((prev) => prev.map((s) => s.product_id === row.product_id ? { ...s, currentStock: s.currentStock - 1 } : s));
  };

  const removeItem = (id: string) => {
    const removed = cart.find((i) => i.product_id === id);
    if (removed) {
      setStock((prev) => prev.map((s) => s.product_id === id ? { ...s, currentStock: s.currentStock + removed.quantity } : s));
    }
    setCart((prev) => prev.filter((c) => c.product_id !== id));
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
      const res = await createSale(payload);
      if (res.data) {
        setReceipt({ ...res.data.sale, items: res.data.items, total: res.data.sale.total_amount, discount: res.data.sale.discount_amount });
        setCart([]);
        setDiscountValue(0);
        setOtherCharges(0);
        toast.success("Transaction completed!");
        await loadStock();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Transaction failed");
    } finally {
      setSavingSale(false);
    }
  };

  const filteredStock = stock.filter(s => s.productName.toLowerCase().includes(search.toLowerCase()) || (s.sku || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <main className="h-[calc(100vh-64px)] overflow-hidden flex flex-col xl:flex-row bg-slate-50">

        {/* Terminals Area (Products) */}
        <section className="flex-1 flex flex-col min-w-0">
          {/* Internal POS Toolbar */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-96">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Scan barcode or search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  autoFocus
                />
              </div>
              <button
                onClick={() => setShowScanner(true)}
                className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadStock}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${stockLoading ? 'animate-spin' : ''}`} />
                Reload Inventory
              </button>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredStock.map((product) => (
                <ProductCard
                  key={product.product_id}
                  product={product}
                  onAdd={() => addToCart(product)}
                />
              ))}
              {filteredStock.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 grayscale opacity-40">
                  <Package className="w-16 h-16 mb-4" />
                  <p className="font-bold text-slate-900">No items matched your search</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Sidebar Panel (Cart & Summary) */}
        <aside className="w-full xl:w-[420px] bg-white border-l border-slate-200 flex flex-col shadow-2xl xl:shadow-none relative z-10 transition-transform">
          {/* Cart Header */}
          <div className="px-6 py-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-none">Checkout</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {cart.length} items in workspace
              </p>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            <AnimatePresence>
              {cart.map((item) => (
                <CartItemRow
                  key={item.product_id}
                  item={item}
                  onRemove={() => removeItem(item.product_id)}
                  onUpdateQty={(q:any) => {
                    if (q <= item.maxStock && q > 0) {
                      setCart(prev => prev.map(i => i.product_id === item.product_id ? { ...i, quantity: q } : i));
                    }
                  }}
                />
              ))}
            </AnimatePresence>
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30 px-10">
                <ShoppingCart className="w-12 h-12 mb-4" />
                <p className="font-bold text-sm">Terminal Idle</p>
                <p className="text-xs font-medium mt-1">Scan or select items to populate the order space</p>
              </div>
            )}
          </div>

          {/* Summary & Controls */}
          <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
            {/* Customer Picker */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Client Association</label>
                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="text-[10px] font-black text-blue-600 hover:underline flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" /> New
                </button>
              </div>
              <CustomerCombobox
                customers={customers}
                selectedId={customerId}
                onChange={setCustomerId}
                query={query}
                setQuery={setQuery}
              />
            </div>

            {/* Calculations */}
            <div className="space-y-2 py-2">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>Subtotal</span>
                <span>₦{subtotal.toLocaleString()}</span>
              </div>

              {/* Discount Workspace */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-1">
                <div className="flex items-center gap-2">
                  <span>Reduction</span>
                  <div className="flex items-center gap-1 bg-slate-200/50 rounded-lg p-0.5">
                    <button
                      onClick={() => setDiscountType("flat")}
                      className={`px-1.5 py-0.5 text-[10px] font-black rounded-md transition-all ${discountType === "flat" ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                    >₦</button>
                    <button
                      onClick={() => setDiscountType("percent")}
                      className={`px-1.5 py-0.5 text-[10px] font-black rounded-md transition-all ${discountType === "percent" ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                    >%</button>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-rose-500 mr-1">-</span>
                  <input
                    type="number"
                    value={discountValue || ""}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    placeholder="0"
                    className="w-16 text-right bg-transparent border-b border-dashed border-slate-300 text-rose-500 outline-none focus:border-blue-500 transition-all px-1"
                  />
                </div>
              </div>

              {/* Other Charges */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Extra Charges</span>
                <div className="flex items-center">
                  <span className="text-slate-900 mr-1">+</span>
                  <input
                    type="number"
                    value={otherCharges || ""}
                    onChange={(e) => setOtherCharges(Number(e.target.value))}
                    placeholder="0"
                    className="w-16 text-right bg-transparent border-b border-dashed border-slate-300 text-slate-900 outline-none focus:border-blue-500 transition-all px-1"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between">
                <span className="font-black text-slate-900">Final Amount</span>
                <span className="text-xl font-black text-blue-600 tracking-tight">₦{total.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="grid grid-cols-3 gap-2">
              <PaymentBtn active={paymentMethod === 'cash'} onClick={() => setPaymentMethod('cash')} icon={<Banknote className="w-4 h-4" />} label="Cash" />
              <PaymentBtn active={paymentMethod === 'pos'} onClick={() => setPaymentMethod('pos')} icon={<CreditCard className="w-4 h-4" />} label="POS" />
              <PaymentBtn active={paymentMethod === 'transfer'} onClick={() => setPaymentMethod('transfer')} icon={<Wallet className="w-4 h-4" />} label="Trans" />
            </div>

            {/* Action */}
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={cart.length === 0 || savingSale}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 group"
            >
              <Check className="w-4 h-4" />
              Process Order
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </aside>

        {/* Receipt / Modals */}
        <AnimatePresence>
          {receipt && (
            <ReceiptComponent sale={receipt} onClose={() => setReceipt(null)} />
          )}

          {showConfirmModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Complete Sale?</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">Final amount to collect:</p>
                  <p className="text-4xl font-black text-blue-600 tracking-tighter mt-2">₦{total.toLocaleString()}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 font-bold text-slate-400 hover:text-slate-600 border border-slate-100 rounded-xl transition-all">Cancel</button>
                  <button onClick={completeSale} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all">Yes, Proceed</button>
                </div>
              </motion.div>
            </div>
          )}

          {showAddCustomerModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-black text-slate-900">Quick Add Client</h3>
                  <button onClick={() => setShowAddCustomerModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 08012345678"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddCustomerModal(false)}
                    className="flex-1 py-3 font-bold text-slate-400 hover:text-slate-600 border border-slate-100 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCustomer}
                    disabled={creatingCustomer}
                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {creatingCustomer ? 'Saving...' : 'Register Client'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showScanner && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl overflow-hidden"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Scan Barcode</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Position code within frame</p>
                  </div>
                  <button onClick={() => setShowScanner(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <div className="aspect-square bg-slate-900 rounded-2xl overflow-hidden relative border-4 border-slate-50 shadow-inner">
                  <QrReader
                    onResult={(result, error) => {
                      if (!!result) {
                        const code = (result as any).text;
                        if (code !== lastScanned) {
                          setLastScanned(code);
                          setSearch(code);
                          toast.success(`Scanned: ${code}`);
                          setShowScanner(false);
                          // Auto-add if exact match
                          const found = stock.find(s => s.sku === code);
                          if (found) addToCart(found);
                        }
                      }
                    }}
                    constraints={{ facingMode: 'environment' }}
                    className="w-full h-full"
                  />
                  <div className="absolute inset-0 border-2 border-blue-500/30 rounded-2xl pointer-events-none">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-blue-500/50 animate-pulse" />
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                    <Package className="w-5 h-5 text-blue-600" />
                    <p className="text-[10px] font-bold text-blue-800 uppercase tracking-tight">Active scan engaged. Use device camera to identify stock items via SKUs.</p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </DashboardLayout>
  );
}

const ProductCard = ({ product, onAdd }: any) => (
  <button
    onClick={onAdd}
    disabled={product.currentStock <= 0}
    className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-blue-500 hover:shadow-lg transition-all active:scale-[0.97] group relative overflow-hidden disabled:opacity-50"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
        <Package className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
      </div>
      <div className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${product.currentStock <= 5 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'
        }`}>
        {product.currentStock} in stock
      </div>
    </div>
    <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">{product.productName}</h3>
    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{product.sku || 'No SKU'}</p>
    <div className="mt-4 text-lg font-black text-blue-600">₦{product.sellingPrice.toLocaleString()}</div>
  </button>
);

const CartItemRow = ({ item, onRemove, onUpdateQty }: any) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between group"
  >
    <div className="min-w-0 pr-4">
      <h4 className="font-bold text-slate-900 text-sm truncate">{item.productName}</h4>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">₦{item.unitPrice.toLocaleString()}</p>
    </div>
    <div className="flex flex-col items-end gap-2 shrink-0">
      <div className="flex items-center gap-3 bg-slate-100 rounded-xl p-1">
        <button onClick={() => onUpdateQty(item.quantity - 1)} className="p-1 hover:bg-white rounded-lg transition-all"><Minus className="w-3 h-3" /></button>
        <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
        <button onClick={() => onUpdateQty(item.quantity + 1)} className="p-1 hover:bg-white rounded-lg transition-all"><Plus className="w-3 h-3" /></button>
      </div>
      <div className="text-xs font-black text-slate-900">₦{(item.unitPrice * item.quantity).toLocaleString()}</div>
    </div>
  </motion.div>
);

const PaymentBtn = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${active ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
      }`}
  >
    {icon}
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const CustomerCombobox = ({ customers, selectedId, onChange, query, setQuery }: any) => {
  const filtered = query === "" ? customers : customers.filter((c: any) => c.name.toLowerCase().includes(query.toLowerCase()) || (c.phone || "").includes(query));

  return (
    <Combobox value={customers.find((c: any) => c.id === selectedId) || null} onChange={(c: any) => onChange(c?.id || null)}>
      <div className="relative">
        <ComboboxInput
          className="w-full rounded-xl bg-white border border-slate-200 py-2.5 pl-3 pr-10 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          displayValue={(c: any) => c ? `${c.name} ${c.phone ? `(${c.phone})` : ''}` : 'Walk-in Customer'}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search client..."
        />
        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronsUpDown className="h-4 w-4 text-slate-400" />
        </ComboboxButton>
        <Transition as="div" leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <ComboboxOptions className="absolute mt-1 max-h-40 w-full overflow-auto rounded-xl bg-white p-1 text-sm shadow-xl border border-slate-100 z-50 focus:outline-none">
            <ComboboxOption key="none" value={null} className={({ focus }) => `cursor-default select-none rounded-lg px-3 py-2 ${focus ? 'bg-blue-600 text-white' : 'text-slate-900'}`}>Walk-in Customer</ComboboxOption>
            {filtered.map((c: any) => (
              <ComboboxOption key={c.id} value={c} className={({ focus }) => `cursor-default select-none rounded-lg px-3 py-2 ${focus ? 'bg-blue-600 text-white' : 'text-slate-900'}`}>
                {c.name} {c.phone && <span className="opacity-60 font-medium ml-1">({c.phone})</span>}
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        </Transition>
      </div>
    </Combobox>
  );
};
