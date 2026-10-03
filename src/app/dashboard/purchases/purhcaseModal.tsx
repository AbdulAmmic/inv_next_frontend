"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { X, Plus, Trash2, Search, ShoppingCart, PackageCheck, Loader2, Package } from "lucide-react";
import { toast } from "react-hot-toast";

import ProductFormModal from "@/components/productsModal";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<any> | void;
  onProductAdded?: (product: any) => void;
  onSupplierAdded?: (supplier: any) => Promise<any> | any;
  suppliers: any[];
  shops: any[];
  products: any[];
}

type Line = {
  key: string;
  product_id: string;
  quantity: string;
  cost_price: string;
  selling_price: string;
  batch_number: string;
  expiry_date: string;
};

const newLine = (): Line => ({
  key: crypto.randomUUID(),
  product_id: "",
  quantity: "1",
  cost_price: "",
  selling_price: "",
  batch_number: "",
  expiry_date: "",
});

const num = (v: string) => (v === "" || isNaN(Number(v)) ? 0 : Number(v));
const naira = (v: number) => `₦${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

/* ------------------------------------------------------------------ */
/* Per-line product picker: its own search state, closes on outside    */
/* click / Escape, keyboard navigable.                                  */
/* ------------------------------------------------------------------ */
function ProductPicker({
  products,
  value,
  onPick,
  onClear,
  autoFocus,
}: {
  products: any[];
  value: string;
  onPick: (product: any) => void;
  onClear: () => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (autoFocus && !value) inputRef.current?.focus();
  }, [autoFocus, value]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? products.filter(
          (p) =>
            p.name?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            String(p.barcode || "").toLowerCase().includes(q) ||
            p.category?.toLowerCase().includes(q)
        )
      : products;
    return list.slice(0, 30);
  }, [products, query]);

  const selected = value ? products.find((p) => p.id === value) : null;

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 h-10 px-3 rounded-lg border border-slate-200 bg-slate-50">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{selected.name}</p>
        </div>
        <button type="button" onClick={onClear} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-white shrink-0" title="Change product">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const pick = (p: any) => {
    onPick(p);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        ref={inputRef}
        value={query}
        placeholder="Search product, SKU or barcode..."
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          else if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter") {
            e.preventDefault();
            if (open && results[active]) pick(results[active]);
          }
        }}
        className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-slate-500">No products match &ldquo;{query}&rdquo;</p>
          ) : (
            results.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
                onMouseEnter={() => setActive(i)}
                className={`w-full px-3 py-2 text-left flex items-center justify-between gap-3 ${i === active ? "bg-slate-50" : ""}`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900 truncate">{p.name}</span>
                  <span className="block text-[11px] text-slate-400 truncate">{p.sku || "No SKU"}{p.category ? ` · ${p.category}` : ""}</span>
                </span>
                <span className="text-xs text-slate-500 shrink-0 tabular-nums">cost {naira(Number(p.cost_price ?? p.costPrice ?? 0))}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const PurchaseModal = ({ isOpen, onClose, onSave, onProductAdded, onSupplierAdded, suppliers, shops, products }: PurchaseModalProps) => {
  const [supplierId, setSupplierId] = useState("");
  const [shopId, setShopId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [note, setNote] = useState("");
  const [vatPercent, setVatPercent] = useState("0");
  const [otherCharges, setOtherCharges] = useState("0");
  const [receiveNow, setReceiveNow] = useState(false);
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(true);

  const [showProductModal, setShowProductModal] = useState(false);
  const [lineForNewProduct, setLineForNewProduct] = useState<string | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: "", contact_person: "", phone: "", email: "", address: "" });

  useEffect(() => {
    if (!isOpen) return;
    // Fresh form each time; default the shop to the one being worked in
    setSupplierId("");
    setShopId(localStorage.getItem("selected_shop_id") || shops[0]?.id || "");
    setInvoiceNumber("");
    setNote("");
    setVatPercent("0");
    setOtherCharges("0");
    setReceiveNow(false);
    setLines([newLine()]);
    setOnline(navigator.onLine);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const addLine = () => {
    const l = newLine();
    setLines((prev) => [...prev, l]);
    setFocusKey(l.key);
  };

  const removeLine = (key: string) =>
    setLines((prev) => (prev.length === 1 ? [newLine()] : prev.filter((l) => l.key !== key)));

  const pickProduct = (key: string, product: any) => {
    // Same product already on another line: add to that line instead
    const existing = lines.find((l) => l.key !== key && l.product_id === product.id);
    if (existing) {
      const current = lines.find((l) => l.key === key);
      updateLine(existing.key, { quantity: String(num(existing.quantity) + Math.max(1, num(current?.quantity || "1"))) });
      setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
      toast(`${product.name} is already on this order — quantity increased`);
      return;
    }
    updateLine(key, {
      product_id: product.id,
      cost_price: String(product.cost_price ?? product.costPrice ?? ""),
      selling_price: String(product.price ?? product.sellingPrice ?? ""),
    });
  };

  const filled = lines.filter((l) => l.product_id);
  const subtotal = filled.reduce((s, l) => s + num(l.cost_price) * num(l.quantity), 0);
  const vat = (num(vatPercent) / 100) * subtotal;
  const total = subtotal + vat + num(otherCharges);
  const units = filled.reduce((s, l) => s + num(l.quantity), 0);
  const profit = filled.reduce((s, l) => {
    const sp = num(l.selling_price);
    return sp ? s + (sp - num(l.cost_price)) * num(l.quantity) : s;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return toast.error("Choose the shop receiving the goods");
    if (!supplierId) return toast.error("Choose a supplier");
    if (!filled.length) return toast.error("Add at least one product");
    for (const [i, l] of filled.entries()) {
      const name = productById.get(l.product_id)?.name || `Line ${i + 1}`;
      if (!Number.isInteger(num(l.quantity)) || num(l.quantity) <= 0) return toast.error(`${name}: quantity must be a whole number above 0`);
      if (num(l.cost_price) <= 0) return toast.error(`${name}: enter the cost price`);
      if (l.selling_price && num(l.selling_price) < num(l.cost_price)) {
        if (!confirm(`${name} is priced below cost. Continue anyway?`)) return;
      }
    }

    setLoading(true);
    try {
      await onSave({
        supplier_id: supplierId,
        shop_id: shopId,
        invoice_number: invoiceNumber.trim() || undefined,
        note: note.trim() || undefined,
        vat_percent: num(vatPercent),
        other_charges: num(otherCharges),
        receive_now: receiveNow && online,
        // Server recalculates; this keeps offline-saved orders showing the right total
        total_amount: Math.round(total * 100) / 100,
        items: filled.map((l) => ({
          product_id: l.product_id,
          quantity: num(l.quantity),
          cost_price: num(l.cost_price),
          selling_price: l.selling_price === "" ? null : num(l.selling_price),
          batch_number: l.batch_number.trim() || undefined,
          expiry_date: l.expiry_date || undefined,
        })),
      });
      onClose();
    } catch {
      // the page shows the error toast
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAddProductSave = (newProduct: any) => {
    onProductAdded?.(newProduct);
    if (lineForNewProduct) {
      updateLine(lineForNewProduct, {
        product_id: newProduct.id,
        cost_price: String(newProduct.cost_price ?? newProduct.costPrice ?? ""),
        selling_price: String(newProduct.price ?? newProduct.sellingPrice ?? ""),
      });
    }
    setShowProductModal(false);
    setLineForNewProduct(null);
  };

  const handleQuickAddSupplierSave = async () => {
    if (!supplierForm.name.trim()) return toast.error("Supplier name is required");
    if (!onSupplierAdded) return;
    try {
      const created = await onSupplierAdded({ ...supplierForm, name: supplierForm.name.trim() });
      if (created?.id) setSupplierId(created.id);
      setShowSupplierModal(false);
      setSupplierForm({ name: "", contact_person: "", phone: "", email: "", address: "" });
    } catch {
      toast.error("Couldn't add supplier");
    }
  };

  if (!isOpen) return null;

  const field = "w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50";
  const label = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5";

  return (
    <>
      <div className="modal-overlay fixed inset-0 z-[40] flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-[3px]">
        <form onSubmit={handleSubmit} className="bg-white w-full max-w-5xl max-h-[95vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">New purchase</h2>
                <p className="text-xs text-slate-500">Add as many products as you need</p>
              </div>
            </div>
            <button type="button" onClick={onClose} disabled={loading} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
            {/* Order details */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={label.replace(" mb-1.5", "")}>Supplier *</label>
                  {onSupplierAdded && (
                    <button type="button" onClick={() => setShowSupplierModal(true)} className="text-[11px] font-semibold text-blue-600 hover:text-blue-800">
                      + New
                    </button>
                  )}
                </div>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={field} disabled={loading}>
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Shop *</label>
                <select value={shopId} onChange={(e) => setShopId(e.target.value)} className={field} disabled={loading}>
                  <option value="">Select shop</option>
                  {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Invoice no.</label>
                <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Optional" className={field} disabled={loading} />
              </div>
              <div>
                <label className={label}>Note</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" className={field} disabled={loading} />
              </div>
            </section>

            {/* Items */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Items <span className="text-slate-400 font-medium normal-case tracking-normal">({filled.length})</span>
                </h3>
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className={`hidden md:grid gap-3 px-3 py-2.5 bg-slate-50/70 border-b border-slate-100 rounded-t-xl text-[11px] font-bold text-slate-500 uppercase tracking-wider ${receiveNow ? "md:grid-cols-[minmax(0,2.4fr)_80px_110px_110px_110px_130px_100px_36px]" : "md:grid-cols-[minmax(0,3fr)_90px_120px_120px_110px_36px]"}`}>
                  <span>Product</span><span>Qty</span><span>Cost</span><span>Selling</span>
                  {receiveNow && <><span>Batch</span><span>Expiry</span></>}
                  <span className="text-right">Line total</span><span />
                </div>

                <div className="divide-y divide-slate-100">
                  {lines.map((l, idx) => {
                    const lineTotal = num(l.cost_price) * num(l.quantity);
                    const belowCost = l.selling_price !== "" && num(l.selling_price) < num(l.cost_price);
                    return (
                      <div
                        key={l.key}
                        className={`grid grid-cols-2 gap-3 p-3 items-center ${receiveNow ? "md:grid-cols-[minmax(0,2.4fr)_80px_110px_110px_110px_130px_100px_36px]" : "md:grid-cols-[minmax(0,3fr)_90px_120px_120px_110px_36px]"}`}
                      >
                        <div className="col-span-2 md:col-span-1">
                          <div className="flex items-center justify-between md:hidden mb-1">
                            <span className="text-[11px] font-semibold text-slate-400">Item {idx + 1}</span>
                          </div>
                          <ProductPicker
                            products={products}
                            value={l.product_id}
                            autoFocus={focusKey === l.key}
                            onPick={(p) => pickProduct(l.key, p)}
                            onClear={() => updateLine(l.key, { product_id: "" })}
                          />
                          {!l.product_id && (
                            <button
                              type="button"
                              onClick={() => { setLineForNewProduct(l.key); setShowProductModal(true); }}
                              className="mt-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                            >
                              + Create new product
                            </button>
                          )}
                        </div>
                        <input type="number" min={1} step={1} inputMode="numeric" aria-label="Quantity" placeholder="Qty"
                          value={l.quantity} onChange={(e) => updateLine(l.key, { quantity: e.target.value })} className={`${field} tabular-nums`} />
                        <input type="number" min={0} step="0.01" inputMode="decimal" aria-label="Cost price" placeholder="Cost"
                          value={l.cost_price} onChange={(e) => updateLine(l.key, { cost_price: e.target.value })} className={`${field} tabular-nums`} />
                        <input type="number" min={0} step="0.01" inputMode="decimal" aria-label="Selling price" placeholder="Selling"
                          value={l.selling_price} onChange={(e) => updateLine(l.key, { selling_price: e.target.value })}
                          className={`${field} tabular-nums ${belowCost ? "border-rose-300 text-rose-600" : ""}`} title={belowCost ? "Below cost" : "Leave blank to keep the current price"} />
                        {receiveNow && (
                          <>
                            <input value={l.batch_number} placeholder="Batch" aria-label="Batch number"
                              onChange={(e) => updateLine(l.key, { batch_number: e.target.value })} className={field} />
                            <input type="date" value={l.expiry_date} aria-label="Expiry date"
                              onChange={(e) => updateLine(l.key, { expiry_date: e.target.value })} className={field} />
                          </>
                        )}
                        <p className="text-sm font-semibold text-slate-900 tabular-nums md:text-right">{lineTotal ? naira(lineTotal) : "—"}</p>
                        <button type="button" onClick={() => removeLine(l.key)} className="justify-self-end p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Remove line">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={addLine}
                  className="w-full flex items-center justify-center gap-2 px-3 py-3 border-t border-dashed border-slate-200 rounded-b-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  <Plus className="w-4 h-4" /> Add item
                </button>
              </div>
            </section>

            {/* Receive now + totals */}
            <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
              <div className="space-y-4">
                <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer ${receiveNow ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200"} ${!online ? "opacity-60 cursor-not-allowed" : ""}`}>
                  <input type="checkbox" checked={receiveNow} disabled={!online} onChange={(e) => setReceiveNow(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-300" />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <PackageCheck className="w-4 h-4 text-emerald-600" /> Goods received now
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      {online
                        ? "Adds everything to stock immediately (and lets you record batch and expiry). Leave off to receive later from the purchase page."
                        : "Needs an internet connection. The order will be saved and you can receive it later."}
                    </span>
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-4 max-w-sm">
                  <div>
                    <label className={label}>VAT %</label>
                    <input type="number" min={0} step="0.01" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} className={`${field} tabular-nums`} />
                  </div>
                  <div>
                    <label className={label}>Other charges</label>
                    <input type="number" min={0} step="0.01" value={otherCharges} onChange={(e) => setOtherCharges(e.target.value)} className={`${field} tabular-nums`} placeholder="Transport, etc." />
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-sm">
                <Row label={`Items (${filled.length} products, ${units.toLocaleString()} units)`} value={naira(subtotal)} />
                <Row label={`VAT (${num(vatPercent)}%)`} value={naira(vat)} />
                <Row label="Other charges" value={naira(num(otherCharges))} />
                <div className="pt-2 mt-1 border-t border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="text-lg font-bold text-slate-900 tabular-nums">{naira(total)}</span>
                </div>
                {profit !== 0 && (
                  <p className={`text-xs ${profit > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    Expected gross profit when sold: {naira(profit)}
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !filled.length}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : receiveNow ? <PackageCheck className="w-4 h-4" /> : <Package className="w-4 h-4" />}
              {loading ? "Saving..." : receiveNow ? "Save and add to stock" : "Create purchase order"}
            </button>
          </div>
        </form>
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <ProductFormModal
            onClose={() => { setShowProductModal(false); setLineForNewProduct(null); }}
            onSave={handleQuickAddProductSave}
          />
        </div>
      )}

      {showSupplierModal && (
        <div className="modal-overlay fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-[3px] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">New supplier</h3>
              <button type="button" onClick={() => setShowSupplierModal(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              {([
                ["name", "Supplier name *", "text"],
                ["contact_person", "Contact person", "text"],
                ["phone", "Phone", "tel"],
                ["email", "Email", "email"],
                ["address", "Address", "text"],
              ] as const).map(([k, ph, type]) => (
                <input key={k} type={type} placeholder={ph} value={(supplierForm as any)[k]}
                  onChange={(e) => setSupplierForm((p) => ({ ...p, [k]: e.target.value }))} className={field} />
              ))}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <button type="button" onClick={() => setShowSupplierModal(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="button" onClick={handleQuickAddSupplierSave} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">Add supplier</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 tabular-nums">{value}</span>
    </div>
  );
}

export default PurchaseModal;
