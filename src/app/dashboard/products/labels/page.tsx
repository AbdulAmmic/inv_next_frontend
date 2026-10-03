"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import {
  Barcode, Search, Plus, Minus, Trash2, Printer, Download, Wand2, Loader2, ChevronDown, Package,
} from "lucide-react";
import { getProducts, getShops, updateProduct } from "@/apiCalls";
import { barcodeFormat, barcodePng, barcodeSvg, generateEan13 } from "@/barcodes";

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  stockQuantity: number;
}

type QueueItem = { product: Product; quantity: number };

// Common A4 label sheets (mm). left/top = first label's offset, pitch = distance between label origins.
const SHEETS = {
  a65: { label: "38 × 21 mm · 65 per sheet", cols: 5, rows: 13, w: 38.1, h: 21.2, left: 4.7, top: 10.7, px: 40.6, py: 21.2 },
  a44: { label: "48.5 × 25.4 mm · 44 per sheet", cols: 4, rows: 11, w: 48.5, h: 25.4, left: 8, top: 8.8, px: 48.5, py: 25.4 },
  a24: { label: "70 × 37 mm · 24 per sheet", cols: 3, rows: 8, w: 70, h: 37, left: 0, top: 0.5, px: 70, py: 37 },
  a21: { label: "63.5 × 38.1 mm · 21 per sheet", cols: 3, rows: 7, w: 63.5, h: 38.1, left: 7.2, top: 15.15, px: 66, py: 38.1 },
} as const;
type SheetKey = keyof typeof SHEETS;

const money = (n: number) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function BarcodeLabelsPage() {
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [shopId, setShopId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [sheet, setSheet] = useState<SheetKey>("a65");
  const [showPrice, setShowPrice] = useState(true);
  const [showShop, setShowShop] = useState(false);
  const [busy, setBusy] = useState<"" | "pdf" | "print" | "bulk">("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  const shopName = shops.find((s) => s.id === shopId)?.name || "";

  useEffect(() => {
    try {
      const role = (JSON.parse(localStorage.getItem("user") || "{}").role || "").toLowerCase();
      setCanEdit(["admin", "subadmin", "manager"].includes(role));
    } catch { /* staff view */ }
    (async () => {
      try {
        const res = await getShops();
        const list = res.data || [];
        setShops(list);
        const preferred = localStorage.getItem("selected_shop_id");
        const first = list.find((s: any) => s.id === preferred) || list[0];
        if (first) setShopId(first.id);
        else setLoading(false);
      } catch {
        toast.error("Couldn't load shops");
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    setQueue([]);
    getProducts({ shop_id: shopId, include_stock: true })
      .then((res) =>
        setProducts(
          (res.data || [])
            .filter((p: any) => !p.is_deleted)
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              barcode: p.barcode ? String(p.barcode) : "",
              price: Number(p.stock?.shop_price ?? p.stock?.price ?? p.price ?? 0),
              stockQuantity: Number(p.stock?.quantity ?? 0),
            }))
            .sort((a: Product, b: Product) => a.name.localeCompare(b.name))
        )
      )
      .catch(() => toast.error("Couldn't load products"))
      .finally(() => setLoading(false));
  }, [shopId]);

  const missingCount = products.filter((p) => !p.barcode).length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!onlyMissing || !p.barcode) &&
        (!q || p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q) || (p.barcode || "").includes(q))
    );
  }, [products, search, onlyMissing]);

  // ---- barcode generation ----
  const saveBarcodes = async (targets: Product[]) => {
    const taken = new Set(products.map((p) => p.barcode).filter(Boolean) as string[]);
    const assigned = new Map<string, string>();
    for (const p of targets) {
      const code = generateEan13(taken);
      await updateProduct(p.id, { barcode: code });
      assigned.set(p.id, code);
    }
    const apply = (p: Product) => (assigned.has(p.id) ? { ...p, barcode: assigned.get(p.id)! } : p);
    setProducts((prev) => prev.map(apply));
    setQueue((prev) => prev.map((q) => ({ ...q, product: apply(q.product) })));
    return assigned.size;
  };

  const generateOne = async (p: Product) => {
    setSavingId(p.id);
    try {
      await saveBarcodes([p]);
      toast.success(`Barcode created for ${p.name}`);
    } catch {
      toast.error("Couldn't save the barcode");
    } finally {
      setSavingId(null);
    }
  };

  const generateAllMissing = async () => {
    const targets = products.filter((p) => !p.barcode);
    if (!targets.length) return;
    if (!confirm(`Create barcodes for ${targets.length} product${targets.length === 1 ? "" : "s"} that don't have one?`)) return;
    setBusy("bulk");
    try {
      const n = await saveBarcodes(targets);
      toast.success(`Created ${n} barcode${n === 1 ? "" : "s"}`);
    } catch {
      toast.error("Some barcodes couldn't be saved");
    } finally {
      setBusy("");
    }
  };

  // ---- queue ----
  const addToQueue = (p: Product, qty?: number) => {
    if (!p.barcode) {
      toast.error("Create a barcode for this product first");
      return;
    }
    const amount = Math.max(1, qty ?? 1);
    setQueue((prev) => {
      const existing = prev.find((q) => q.product.id === p.id);
      return existing
        ? prev.map((q) => (q.product.id === p.id ? { ...q, quantity: q.quantity + amount } : q))
        : [...prev, { product: p, quantity: amount }];
    });
  };
  const setQty = (id: string, qty: number) =>
    setQueue((prev) => prev.map((q) => (q.product.id === id ? { ...q, quantity: Math.max(1, Math.min(9999, qty || 1)) } : q)));
  const removeFromQueue = (id: string) => setQueue((prev) => prev.filter((q) => q.product.id !== id));

  const labels = useMemo(() => queue.flatMap((q) => Array(q.quantity).fill(q.product) as Product[]), [queue]);
  const spec = SHEETS[sheet];
  const perPage = spec.cols * spec.rows;
  const pages = Math.max(1, Math.ceil(labels.length / perPage));

  // ---- PDF ----
  const buildPdf = async () => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const cache = new Map<string, string>();
    for (const p of labels) if (!cache.has(p.barcode!)) cache.set(p.barcode!, await barcodePng(p.barcode!));

    labels.forEach((p, i) => {
      const slot = i % perPage;
      if (i > 0 && slot === 0) pdf.addPage();
      const col = slot % spec.cols;
      const row = Math.floor(slot / spec.cols);
      const x = spec.left + col * spec.px;
      const y = spec.top + row * spec.py;
      const pad = Math.max(1.2, spec.h * 0.06);
      const nameSize = Math.max(5.5, Math.min(9, spec.h * 0.3));
      const small = nameSize * 0.8;
      let cursor = y + pad;

      if (showShop && shopName) {
        pdf.setFont("helvetica", "normal").setFontSize(small * 0.85).setTextColor(90);
        pdf.text(shopName.toUpperCase(), x + spec.w / 2, cursor + small * 0.3, { align: "center", maxWidth: spec.w - pad * 2 });
        cursor += small * 0.42;
      }

      pdf.setFont("helvetica", "bold").setFontSize(nameSize).setTextColor(0);
      const name = pdf.splitTextToSize(p.name, spec.w - pad * 2)[0] as string;
      pdf.text(name, x + spec.w / 2, cursor + nameSize * 0.33, { align: "center" });
      cursor += nameSize * 0.42;

      const priceH = showPrice ? nameSize * 0.45 : 0;
      const bcH = y + spec.h - pad - priceH - cursor - 0.5;
      const bcW = spec.w - pad * 2;
      const img = cache.get(p.barcode!)!;
      const props = pdf.getImageProperties(img);
      const ratio = props.width / props.height;
      const drawW = Math.min(bcW, bcH * ratio);
      const drawH = drawW / ratio;
      pdf.addImage(img, "PNG", x + (spec.w - drawW) / 2, cursor + 0.3 + (bcH - drawH) / 2, drawW, drawH);

      if (showPrice) {
        pdf.setFont("helvetica", "bold").setFontSize(nameSize);
        // Helvetica has no naira glyph, so the PDF uses NGN
        pdf.text(`NGN ${money(p.price)}`, x + spec.w / 2, y + spec.h - pad, { align: "center" });
      }
    });
    return pdf;
  };

  const download = async () => {
    setBusy("pdf");
    try {
      (await buildPdf()).save(`barcode-labels-${(shopName || "shop").replace(/\W+/g, "-").toLowerCase()}.pdf`);
      toast.success(`${labels.length} labels on ${pages} page${pages === 1 ? "" : "s"}`);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't create the PDF");
    } finally {
      setBusy("");
    }
  };

  const print = async () => {
    setBusy("print");
    try {
      const pdf = await buildPdf();
      pdf.autoPrint();
      const url = pdf.output("bloburl");
      const w = window.open(url as unknown as string, "_blank");
      if (!w) toast.error("Allow pop-ups to print, or use Download PDF");
    } catch {
      toast.error("Couldn't prepare printing");
    } finally {
      setBusy("");
    }
  };

  const field = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400";

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 lg:space-y-8 max-w-[100vw] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">Inventory</div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Barcode Labels</h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full md:w-auto">
          {shops.length > 1 && (
            <div className="relative w-full sm:w-auto">
              <select value={shopId} onChange={(e) => setShopId(e.target.value)} className={`${field} appearance-none pr-9 font-medium text-slate-700 cursor-pointer`}>
                {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>
          )}
          {canEdit && missingCount > 0 && (
            <button
              onClick={generateAllMissing}
              disabled={busy !== ""}
              className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 shadow-sm w-full sm:w-auto"
            >
              {busy === "bulk" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 text-amber-600" />}
              Create missing barcodes ({missingCount})
            </button>
          )}
          <button
            onClick={print}
            disabled={!labels.length || busy !== ""}
            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 shadow-sm w-full sm:w-auto"
          >
            {busy === "print" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Print
          </button>
          <button
            onClick={download}
            disabled={!labels.length || busy !== ""}
            className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-slate-800 disabled:opacity-50 shadow-lg shadow-slate-200 w-full sm:w-auto"
          >
            {busy === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download PDF
          </button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
        {/* Products */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, SKU or barcode..." className={`${field} pl-10`} />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
              Without barcode only
            </label>
          </div>

          <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
            <table className="w-full min-w-[640px] text-sm text-left">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-b border-slate-100">
                  {["Product", "Barcode", "Price", ""].map((h, i) => (
                    <th key={i} className={`px-5 py-3 font-bold text-slate-600 uppercase tracking-wider text-[11px] ${i === 3 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={4} className="px-5 py-16 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-16 text-center">
                      <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-900">No products found</p>
                    </td>
                  </tr>
                ) : (
                  visible.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.sku || "No SKU"} · {p.stockQuantity} in stock</div>
                      </td>
                      <td className="px-5 py-3">
                        {p.barcode ? (
                          <div>
                            <span className="font-mono text-slate-700">{p.barcode}</span>
                            <span className="ml-2 text-[10px] font-semibold text-slate-400">{barcodeFormat(p.barcode).replace("CODE128", "Code 128").replace("EAN13", "EAN-13").replace("EAN8", "EAN-8").replace("UPC", "UPC-A")}</span>
                          </div>
                        ) : canEdit ? (
                          <button
                            onClick={() => generateOne(p)}
                            disabled={savingId === p.id || busy === "bulk"}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 disabled:opacity-50"
                          >
                            {savingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                            Create barcode
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">No barcode</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-700 tabular-nums">₦{money(p.price)}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => addToQueue(p, 1)}
                          disabled={!p.barcode}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                          title="Add 1 label"
                        >
                          <Plus className="w-3.5 h-3.5" /> 1
                        </button>
                        <button
                          onClick={() => addToQueue(p, Math.max(1, Math.floor(p.stockQuantity)))}
                          disabled={!p.barcode || p.stockQuantity < 1}
                          className="ml-1.5 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                          title="One label per unit in stock"
                        >
                          <Plus className="w-3.5 h-3.5" /> stock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Settings, queue, preview */}
        <motion.aside initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-4">
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <h2 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Label sheet</h2>
            <div className="relative">
              <select value={sheet} onChange={(e) => setSheet(e.target.value as SheetKey)} className={`${field} appearance-none pr-9 cursor-pointer`}>
                {Object.entries(SHEETS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <label className="inline-flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="w-4 h-4 rounded border-slate-300" /> Price</label>
              <label className="inline-flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showShop} onChange={(e) => setShowShop(e.target.checked)} className="w-4 h-4 rounded border-slate-300" /> Shop name</label>
            </div>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Print queue <span className="text-slate-400 font-medium normal-case tracking-normal">· {labels.length} labels, {labels.length ? pages : 0} page{pages === 1 ? "" : "s"}</span>
              </h2>
              {queue.length > 0 && <button onClick={() => setQueue([])} className="text-xs font-semibold text-slate-500 hover:text-rose-600">Clear</button>}
            </div>
            {queue.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Barcode className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Add products from the list to print labels.</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                {queue.map((q) => (
                  <div key={q.product.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{q.product.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">{q.product.barcode}</p>
                    </div>
                    <div className="flex items-center rounded-lg border border-slate-200">
                      <button onClick={() => setQty(q.product.id, q.quantity - 1)} className="p-1.5 text-slate-500 hover:text-slate-900" aria-label="Fewer"><Minus className="w-3.5 h-3.5" /></button>
                      <input type="number" min={1} value={q.quantity} onChange={(e) => setQty(q.product.id, parseInt(e.target.value))} className="w-12 text-center text-sm font-semibold tabular-nums outline-none" />
                      <button onClick={() => setQty(q.product.id, q.quantity + 1)} className="p-1.5 text-slate-500 hover:text-slate-900" aria-label="More"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <button onClick={() => removeFromQueue(q.product.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" aria-label="Remove"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <SheetPreview labels={labels.slice(0, perPage)} spec={spec} showPrice={showPrice} shopName={showShop ? shopName : ""} />
        </motion.aside>
      </div>
    </main>
  );
}

/* First page preview, drawn to scale with SVG barcodes */
function SheetPreview({
  labels, spec, showPrice, shopName,
}: {
  labels: Product[];
  spec: (typeof SHEETS)[SheetKey];
  showPrice: boolean;
  shopName: string;
}) {
  const [svgs, setSvgs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const codes = Array.from(new Set(labels.map((l) => l.barcode!).filter((c) => c && !svgs[c])));
    if (!codes.length) return;
    Promise.all(codes.map(async (c) => [c, await barcodeSvg(c, { height: 40 })] as const)).then((pairs) => {
      if (!cancelled) setSvgs((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels]);

  const SCALE = 1.75; // px per mm in the preview
  const slots = spec.cols * spec.rows;

  return (
    <div className="glass-card rounded-2xl p-4">
      <h2 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-3">Page 1 preview</h2>
      <div className="bg-slate-100 rounded-xl p-3 flex justify-center overflow-hidden">
        <div className="relative bg-white shadow-sm" style={{ width: 210 * SCALE, height: 297 * SCALE }}>
          {Array.from({ length: slots }).map((_, i) => {
            const col = i % spec.cols;
            const row = Math.floor(i / spec.cols);
            const p = labels[i];
            return (
              <div
                key={i}
                className={`absolute flex flex-col items-center justify-between overflow-hidden text-center ${p ? "border border-slate-200" : "border border-dashed border-slate-200/70"}`}
                style={{
                  left: (spec.left + col * spec.px) * SCALE,
                  top: (spec.top + row * spec.py) * SCALE,
                  width: spec.w * SCALE,
                  height: spec.h * SCALE,
                  padding: 2,
                  borderRadius: 2,
                }}
              >
                {p && (
                  <>
                    {shopName && <div className="w-full truncate text-slate-500 uppercase" style={{ fontSize: 4 }}>{shopName}</div>}
                    <div className="w-full truncate font-bold text-black leading-none" style={{ fontSize: Math.max(4.5, spec.h * 0.22) }}>{p.name}</div>
                    <div className="w-full flex-1 min-h-0 flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full" dangerouslySetInnerHTML={{ __html: svgs[p.barcode!] || "" }} />
                    {showPrice && <div className="font-bold text-black leading-none" style={{ fontSize: Math.max(4.5, spec.h * 0.22) }}>NGN {money(p.price)}</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
