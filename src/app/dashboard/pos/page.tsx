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
  UserPlus,
  Clock
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
interface SubUnit {
  name: string;
  per_base: number; // how many of this unit in one base stock unit
  price: number;    // price per one of this unit
}

interface StockRow {
  product_id: string;
  productName: string;
  sku?: string;
  currentStock: number;
  sellingPrice: number;
  category?: string;
  shelf_location?: string;
  unit?: string;
  subUnits?: SubUnit[];
  nearestExpiry?: string | null;
  expiryStatus?: "expired" | "expiringSoon" | "ok" | null;
}

interface CartItem {
  // One line per product+unit — the same product can be in the cart twice
  // (e.g. 1 pack AND 3 cards), so lines are keyed by product+unit.
  key: string;
  product_id: string;
  productName: string;
  sku?: string;
  shelf_location?: string;
  nearestExpiry?: string | null;
  expiryStatus?: "expired" | "expiringSoon" | "ok" | null;
  unitName: string;   // unit this line sells in ("Pack", "Card", ...)
  perBase: number;    // how many of unitName per base stock unit (1 = base)
  unitCount: number;  // how many of unitName
  unitPrice: number;  // price per one unitName
  baseUnitName: string;
  baseUnitPrice: number;
  subUnits?: SubUnit[];
}

interface HeldCart {
  id: string;
  heldAt: string;
  customerId: string | null;
  customerName: string;
  discountType: "flat" | "percent";
  discountValue: number;
  otherCharges: number;
  items: CartItem[];
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
}

const HELD_CARTS_KEY = "pos_held_carts";

/** Base stock units consumed by a cart line (3 cards of a 10-card pack → 0.3). */
const lineBaseQty = (i: CartItem) => i.unitCount / i.perBase;
const lineTotal = (i: CartItem) => Math.round(i.unitCount * i.unitPrice * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;
/** Show fractional stock nicely: 12 → "12", 12.7 → "12.7" */
const formatQty = (n: number) => (Number.isInteger(n) ? n.toString() : n.toFixed(2).replace(/\.?0+$/, ""));

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

  // Held (parked) carts — persisted so they survive reloads/crashes.
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [showHeldPanel, setShowHeldPanel] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedShopId = localStorage.getItem("selected_shop_id") || "";
      setShopId(storedShopId);
      const storedUser = localStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));
      try {
        setHeldCarts(JSON.parse(localStorage.getItem(HELD_CARTS_KEY) || "[]"));
      } catch { /* corrupted — start fresh */ }
    }
  }, []);

  const persistHeldCarts = (carts: HeldCart[]) => {
    setHeldCarts(carts);
    try { localStorage.setItem(HELD_CARTS_KEY, JSON.stringify(carts)); } catch { /* full */ }
  };

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

  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + lineTotal(i), 0), [cart]);

  const discountAmount = useMemo(() => {
    if (!discountValue) return 0;
    const amount = discountType === "flat" ? discountValue : (subtotal * discountValue) / 100;
    // A discount can never exceed what's being bought
    return Math.min(Math.round(amount * 100) / 100, subtotal);
  }, [discountValue, discountType, subtotal]);

  const total = useMemo(() => {
    const raw = subtotal - discountAmount + (Number(otherCharges) || 0);
    return Math.max(0, Math.round(raw * 100) / 100);
  }, [subtotal, discountAmount, otherCharges]);

  const loadStock = async () => {
    try {
      setStockLoading(true);
      const res = await getStocks(shopId);
      const arr = res.data || [];
      const mapped: StockRow[] = arr.map((item: any) => ({
        product_id: item.product_id,
        productName: item.productName,
        sku: item.sku,
        currentStock: Number(item.currentStock) || 0,
        sellingPrice: item.sellingPrice,
        category: item.category,
        shelf_location: item.shelf_location,
        unit: item.unit,
        subUnits: Array.isArray(item.sub_units) ? item.sub_units : undefined,
        nearestExpiry: item.nearest_expiry ?? null,
        expiryStatus: item.expiry_status ?? null,
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
      setCustomers(res.data || []);
    } catch (err) {
      toast.error("Failed to load customers");
    }
  };


  /** Base units of this product still available (display stock already nets out the cart) */
  const availableBase = (product_id: string) =>
    stock.find((s) => s.product_id === product_id)?.currentStock ?? 0;

  const adjustDisplayStock = (product_id: string, deltaBase: number) => {
    setStock((prev) => prev.map((s) =>
      s.product_id === product_id
        ? { ...s, currentStock: round4(s.currentStock + deltaBase) }
        : s
    ));
  };

  const addToCart = (row: StockRow) => {
    const baseUnitName = row.unit || "Unit";
    const key = `${row.product_id}::${baseUnitName}`;
    const existing = cart.find((p) => p.key === key);

    // Adding 1 base unit needs 1 base unit of stock
    if (availableBase(row.product_id) < 1) {
      toast.error(row.currentStock <= 0 ? "Out of stock" : "Not enough stock left");
      return;
    }

    if (existing) {
      setCart((prev) => prev.map((p) => p.key === key ? { ...p, unitCount: p.unitCount + 1 } : p));
    } else {
      setCart((prev) => [...prev, {
        key,
        product_id: row.product_id,
        productName: row.productName,
        sku: row.sku,
        shelf_location: row.shelf_location,
        nearestExpiry: row.nearestExpiry,
        expiryStatus: row.expiryStatus,
        unitName: baseUnitName,
        perBase: 1,
        unitCount: 1,
        unitPrice: row.sellingPrice,
        baseUnitName,
        baseUnitPrice: row.sellingPrice,
        subUnits: row.subUnits,
      }]);
    }

    adjustDisplayStock(row.product_id, -1);
  };

  const removeItem = (key: string) => {
    const removed = cart.find((i) => i.key === key);
    if (removed) {
      adjustDisplayStock(removed.product_id, lineBaseQty(removed));
    }
    setCart((prev) => prev.filter((c) => c.key !== key));
  };

  const updateLineCount = (key: string, newCount: number) => {
    const line = cart.find((i) => i.key === key);
    if (!line || newCount <= 0) return;

    const deltaBase = (newCount - line.unitCount) / line.perBase;
    if (deltaBase > 0 && availableBase(line.product_id) < deltaBase) {
      toast.error("Not enough stock left");
      return;
    }

    setCart((prev) => prev.map((i) => i.key === key ? { ...i, unitCount: newCount } : i));
    adjustDisplayStock(line.product_id, -deltaBase);
  };

  /** Switch a cart line to a different selling unit (base ↔ card ↔ tablet …). Resets count to 1. */
  const switchLineUnit = (key: string, unitName: string) => {
    const line = cart.find((i) => i.key === key);
    if (!line || line.unitName === unitName) return;

    const isBase = unitName === line.baseUnitName;
    const sub = line.subUnits?.find((u) => u.name === unitName);
    if (!isBase && !sub) return;

    const perBase = isBase ? 1 : sub!.per_base;
    const unitPrice = isBase ? line.baseUnitPrice : sub!.price;
    const newKey = `${line.product_id}::${unitName}`;

    if (cart.some((i) => i.key === newKey)) {
      toast.error(`${unitName} is already in the cart for this item — adjust that line instead`);
      return;
    }

    // Give back the old line's stock, then take 1 of the new unit
    const oldBase = lineBaseQty(line);
    const newBase = 1 / perBase;
    if (availableBase(line.product_id) + oldBase < newBase) {
      toast.error("Not enough stock left");
      return;
    }

    setCart((prev) => prev.map((i) =>
      i.key === key ? { ...i, key: newKey, unitName, perBase, unitPrice, unitCount: 1 } : i
    ));
    adjustDisplayStock(line.product_id, oldBase - newBase);
  };

  /* -------------------------
     HOLD / RESUME parked sales
  ------------------------- */
  const holdCart = () => {
    if (cart.length === 0) return;
    const customerName = customers.find((c) => c.id === customerId)?.name || "Walk-in";
    const held: HeldCart = {
      id: crypto.randomUUID(),
      heldAt: new Date().toISOString(),
      customerId,
      customerName,
      discountType,
      discountValue,
      otherCharges,
      items: cart,
    };
    persistHeldCarts([held, ...heldCarts]);

    // Release the display stock the cart was holding — availability is
    // re-validated when the held cart is resumed.
    cart.forEach((i) => adjustDisplayStock(i.product_id, lineBaseQty(i)));
    setCart([]);
    setDiscountValue(0);
    setOtherCharges(0);
    setCustomerId(null);
    toast.success("Sale held — resume it any time");
  };

  const resumeHeldCart = (held: HeldCart) => {
    if (cart.length > 0) {
      toast.error("Finish or hold the current sale first");
      return;
    }

    // Re-validate against live stock: quantities may have been sold while held
    const adjusted: CartItem[] = [];
    let clamped = false;
    for (const item of held.items) {
      const avail = availableBase(item.product_id);
      const wantBase = lineBaseQty(item);
      if (avail <= 0) { clamped = true; continue; }
      let count = item.unitCount;
      if (wantBase > avail) {
        count = Math.max(1, Math.floor(avail * item.perBase));
        clamped = true;
      }
      adjusted.push({ ...item, unitCount: count });
    }
    if (clamped) toast("Some quantities were reduced — stock changed while held", { icon: "⚠️" });

    setCart(adjusted);
    adjusted.forEach((i) => adjustDisplayStock(i.product_id, -lineBaseQty(i)));
    setCustomerId(held.customerId);
    setDiscountType(held.discountType);
    setDiscountValue(held.discountValue);
    setOtherCharges(held.otherCharges);
    persistHeldCarts(heldCarts.filter((h) => h.id !== held.id));
    setShowHeldPanel(false);
  };

  const discardHeldCart = (id: string) => {
    persistHeldCarts(heldCarts.filter((h) => h.id !== id));
  };

  const completeSale = async () => {
    setSavingSale(true);
    setShowConfirmModal(false);
    try {
      const payload = {
        shop_id: shopId,
        staff_id: user?.id || "",
        customer_id: customerId,
        payment_method: paymentMethod,
        discount_amount: discountAmount,
        other_charges: Number(otherCharges) || 0,
        items: cart.map((i) => {
          const baseQty = round4(lineBaseQty(i));
          const totalPrice = lineTotal(i);
          return {
            product_id: i.product_id,
            // quantity is in BASE stock units (fractional for sub-unit
            // sales) — that's what stock math and COGS run on. The exact
            // charged amount travels as total_price, and unit_label keeps
            // the human description for the receipt.
            quantity: baseQty,
            unit_price: Math.round((totalPrice / baseQty) * 100) / 100,
            total_price: totalPrice,
            unit_label: `${i.unitCount} ${i.unitName}`,
          };
        }),
      };
      const res = await createSale(payload);
      if (res.data) {
        setReceipt(() => {
          const shopId = res.data.sale?.shop_id || (typeof window !== 'undefined' ? localStorage.getItem('selected_shop_id') : null);
          const cachedSettings = shopId ? (() => { try { return JSON.parse(localStorage.getItem(`shop_settings_${shopId}`) || '{}'); } catch { return {}; } })() : {};
          return { ...res.data.sale, items: res.data.items, total: res.data.sale.total_amount, discount: res.data.sale.discount_amount, refund_policy: cachedSettings.refund_policy || '' };
        });
        setCart([]);
        setDiscountValue(0);
        setOtherCharges(0);
        toast.success("Transaction completed!");
        
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance("Thank you for your purchase!");
          window.speechSynthesis.speak(utterance);
        }

        await loadStock();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Transaction failed");
    } finally {
      setSavingSale(false);
    }
  };

  const filteredStock = stock.filter(s => s.productName.toLowerCase().includes(search.toLowerCase()) || (s.sku || "").toLowerCase().includes(search.toLowerCase()));

  const [showMobileCart, setShowMobileCart] = useState(false);

  return (
    <>
      <main className="h-[calc(100vh-64px)] overflow-hidden flex flex-col xl:flex-row bg-slate-50 relative">

        {/* Products Area */}
        <section className="flex-1 flex flex-col min-w-0 pb-20 xl:pb-0">
          {/* Top Bar - Simplified for Mobile */}
          <div className="bg-white border-b border-slate-200 px-4 xl:px-6 py-3 xl:py-4 flex items-center justify-between gap-4 sticky top-0 z-20">
            <div className="flex items-center gap-2 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-medium"
                />
              </div>
              <button
                onClick={() => setShowScanner(true)}
                className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-colors"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={loadStock}
              className="hidden md:flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${stockLoading ? 'animate-spin' : ''}`} />
              Sync
            </button>
          </div>

          {/* Product Grid - Optimized for touch */}
          <div className="flex-1 overflow-y-auto p-4 xl:p-6 scrollbar-hide">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 xl:gap-4">
              {filteredStock.map((product) => (
                <ProductCard
                  key={product.product_id}
                  product={product}
                  onAdd={() => addToCart(product)}
                />
              ))}
            </div>
            {filteredStock.length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center grayscale opacity-40">
                <Package className="w-12 h-12 mb-4" />
                <p className="font-bold text-slate-900">No items found</p>
              </div>
            )}
          </div>
        </section>

        {/* Mobile Bottom Bar - App Feel */}
        <div className="xl:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between z-40 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total Amount</span>
            <span className="text-xl font-black text-slate-900 leading-tight">₦{total.toLocaleString()}</span>
          </div>
          <button
            onClick={() => setShowMobileCart(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-blue-100 active:scale-95 transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            Cart ({cart.length})
          </button>
        </div>

        {/* Cart Panel (Desktop Sidebar / Mobile Drawer) */}
        <AnimatePresence>
          {(showMobileCart || typeof window !== 'undefined' && window.innerWidth >= 1280) && (
            <motion.aside
              initial={typeof window !== 'undefined' && window.innerWidth < 1280 ? { y: '100%' } : {}}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed inset-0 xl:static z-50 xl:z-10 flex flex-col bg-white xl:w-[420px] xl:border-l border-slate-200 shadow-2xl xl:shadow-none transition-transform ${showMobileCart ? 'block' : 'hidden xl:flex'}`}
            >
              {/* Cart Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowMobileCart(false)}
                    className="xl:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 leading-none">Order Details</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {cart.length} unique entries
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Held sales */}
                  <div className="relative">
                    <button
                      onClick={() => setShowHeldPanel((v) => !v)}
                      className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 ${heldCarts.length > 0 ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'text-slate-300'}`}
                      disabled={heldCarts.length === 0}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Held ({heldCarts.length})
                    </button>
                    {showHeldPanel && heldCarts.length > 0 && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1 max-h-80 overflow-y-auto">
                        {heldCarts.map((h) => (
                          <div key={h.id} className="p-3 rounded-xl hover:bg-slate-50 border border-slate-100">
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 truncate">{h.customerName}</p>
                                <p className="text-[10px] font-bold text-slate-400">
                                  {h.items.length} item{h.items.length !== 1 ? 's' : ''} · ₦{h.items.reduce((s, i) => s + lineTotal(i), 0).toLocaleString()} · {new Date(h.heldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => resumeHeldCart(h)}
                                  className="px-2.5 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-lg hover:bg-blue-700"
                                >
                                  Resume
                                </button>
                                <button
                                  onClick={() => discardHeldCart(h.id)}
                                  className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg"
                                  title="Discard held sale"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {cart.length > 0 && (
                    <>
                      <button
                        onClick={holdCart}
                        className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 hover:bg-amber-100 transition-all rounded-xl"
                        title="Hold this sale and start a new one"
                      >
                        Hold
                      </button>
                      <button
                        onClick={() => {
                          cart.forEach((i) => adjustDisplayStock(i.product_id, lineBaseQty(i)));
                          setCart([]);
                        }}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-xl"
                        title="Clear cart"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto px-4 xl:px-6 py-4 space-y-3 bg-slate-50/50">
                <AnimatePresence>
                  {cart.map((item) => (
                    <CartItemRow
                      key={item.key}
                      item={item}
                      onRemove={() => removeItem(item.key)}
                      onUpdateQty={(q: number) => updateLineCount(item.key, q)}
                      onSwitchUnit={(unitName: string) => switchLineUnit(item.key, unitName)}
                    />
                  ))}
                </AnimatePresence>
                {cart.length === 0 && (
                  <div className="h-64 flex flex-col items-center justify-center text-center opacity-30">
                    <ShoppingCart className="w-12 h-12 mb-4" />
                    <p className="font-bold text-sm">Cart is Empty</p>
                  </div>
                )}
              </div>

              {/* Checkout Controls */}
              <div className="p-6 bg-white border-t border-slate-200 space-y-4 pb-10 xl:pb-6 shadow-[0_-8px_30px_rgb(0,0,0,0.02)]">
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
                    <span className="text-slate-900">₦{subtotal.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>Discount</span>
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                        <button onClick={() => setDiscountType("flat")} className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all ${discountType === "flat" ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>₦</button>
                        <button onClick={() => setDiscountType("percent")} className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all ${discountType === "percent" ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>%</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {discountAmount > 0 && (
                        <span className="text-rose-400 text-[10px]">−₦{discountAmount.toLocaleString()}</span>
                      )}
                      <input
                        type="number"
                        min={0}
                        value={discountValue || ""}
                        onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value)))}
                        placeholder="0"
                        className="w-20 text-right bg-slate-50 border-none rounded-lg text-rose-500 outline-none focus:ring-1 focus:ring-rose-200 transition-all px-2 py-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>Other Charges</span>
                    <input
                      type="number"
                      min={0}
                      value={otherCharges || ""}
                      onChange={(e) => setOtherCharges(Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      className="w-20 text-right bg-slate-50 border-none rounded-lg text-slate-700 outline-none focus:ring-1 focus:ring-blue-200 transition-all px-2 py-1"
                    />
                  </div>

                  <div className="border-t border-slate-100 mt-2 pt-3 flex justify-between items-end">
                    <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">Payable Balance</span>
                    <span className="text-2xl font-black text-blue-600 tracking-tighter leading-none">₦{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="grid grid-cols-4 gap-2">
                  <PaymentBtn active={paymentMethod === 'cash'} onClick={() => setPaymentMethod('cash')} icon={<Banknote className="w-4 h-4" />} label="Cash" />
                  <PaymentBtn active={paymentMethod === 'pos'} onClick={() => setPaymentMethod('pos')} icon={<CreditCard className="w-4 h-4" />} label="POS" />
                  <PaymentBtn active={paymentMethod === 'transfer'} onClick={() => setPaymentMethod('transfer')} icon={<Wallet className="w-4 h-4" />} label="Transfer" />
                  <PaymentBtn active={paymentMethod === 'credit'} onClick={() => setPaymentMethod('credit')} icon={<Clock className="w-4 h-4" />} label="Credit" />
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
            </motion.aside>
          )}
        </AnimatePresence>

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
    </>
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
        {formatQty(product.currentStock)} in stock
      </div>
    </div>
    <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">{product.productName}</h3>
    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">
      {product.sku || 'No SKU'}{product.unit ? ` · ${product.unit}` : ''}
    </p>
    {Array.isArray(product.subUnits) && product.subUnits.length > 0 && (
      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight mt-0.5">
        💊 Also per {product.subUnits.map((u: any) => u.name).join(", ")}
      </p>
    )}
    {product.shelf_location && (
      <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tight mt-0.5">📍 {product.shelf_location}</p>
    )}
    {product.nearestExpiry && (
      <p className={`text-[10px] font-bold uppercase tracking-tight mt-0.5 ${
        product.expiryStatus === "expired" ? "text-rose-600" : product.expiryStatus === "expiringSoon" ? "text-amber-600" : "text-slate-400"
      }`}>
        ⏱ {product.expiryStatus === "expired" ? "Expired" : "Exp"} {product.nearestExpiry}
      </p>
    )}
    <div className="mt-4 text-lg font-black text-blue-600">₦{product.sellingPrice.toLocaleString()}</div>
  </button>
);

const CartItemRow = ({ item, onRemove, onUpdateQty, onSwitchUnit }: any) => {
  const hasSubUnits = Array.isArray(item.subUnits) && item.subUnits.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between group"
    >
      <div className="min-w-0 pr-4">
        <h4 className="font-bold text-slate-900 text-sm truncate">{item.productName}</h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
          ₦{item.unitPrice.toLocaleString()} / {item.unitName}
        </p>
        {hasSubUnits && (
          <select
            value={item.unitName}
            onChange={(e) => onSwitchUnit(e.target.value)}
            className="mt-1 text-[10px] font-black uppercase tracking-tight bg-blue-50 text-blue-600 border-none rounded-lg px-2 py-1 outline-none cursor-pointer"
          >
            <option value={item.baseUnitName}>{item.baseUnitName} — ₦{item.baseUnitPrice.toLocaleString()}</option>
            {item.subUnits.map((u: any) => (
              <option key={u.name} value={u.name}>{u.name} — ₦{u.price.toLocaleString()}</option>
            ))}
          </select>
        )}
        {item.shelf_location && (
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-tight">📍 {item.shelf_location}</p>
        )}
        {item.nearestExpiry && (
          <p className={`text-[10px] font-bold uppercase tracking-tight ${
            item.expiryStatus === "expired" ? "text-rose-600" : item.expiryStatus === "expiringSoon" ? "text-amber-600" : "text-slate-400"
          }`}>
            ⏱ {item.expiryStatus === "expired" ? "Expired" : "Exp"} {item.nearestExpiry}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-3 bg-slate-100 rounded-xl p-1">
            <button onClick={() => onUpdateQty(item.unitCount - 1)} className="p-1 hover:bg-white rounded-lg transition-all"><Minus className="w-3 h-3" /></button>
            <span className="text-xs font-black w-6 text-center">{item.unitCount}</span>
            <button onClick={() => onUpdateQty(item.unitCount + 1)} className="p-1 hover:bg-white rounded-lg transition-all"><Plus className="w-3 h-3" /></button>
          </div>
          <button
            onClick={onRemove}
            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
            title="Remove from cart"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="text-xs font-black text-slate-900">
          {item.unitCount} {item.unitName} · ₦{(Math.round(item.unitCount * item.unitPrice * 100) / 100).toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
};

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

