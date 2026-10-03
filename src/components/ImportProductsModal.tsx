"use client";

import { useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  X, Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, FileDown, Store,
} from "lucide-react";
import { api, getStocks } from "@/apiCalls";
import { db } from "@/db";
import {
  ImportRow, TEMPLATE_COLUMNS, downloadTemplate, exportProductsToExcel, parseProductFile, describeImportError,
} from "@/productImport";

type Shop = { id: string; name: string };
type Result = { created: number; updated: number; failed: number; errors: { row: number; name?: string; error: string }[] };

interface Props {
  shops: Shop[];
  defaultShopId: string;
  canChooseShop: boolean;
  onClose: () => void;
  onImported: () => void;
}

const PREVIEW_COLS = TEMPLATE_COLUMNS.filter((c) =>
  ["name", "sku", "price", "cost_price", "quantity", "min_quantity", "expiry_date", "shelf_location"].includes(c.key)
);

export default function ImportProductsModal({ shops, defaultShopId, canChooseShop, onClose, onImported }: Props) {
  const [shopId, setShopId] = useState(defaultShopId || shops[0]?.id || "");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const shopName = shops.find((s) => s.id === shopId)?.name;

  const handleFile = async (f: File | undefined) => {
    if (!f) return;
    setResult(null);
    setParsing(true);
    try {
      const parsed = await parseProductFile(f);
      if (!parsed.length) throw new Error("No product rows found in the file.");
      setFile(f);
      setRows(parsed);
    } catch (e: any) {
      toast.error(e.message || "Couldn't read that file");
      setFile(null);
      setRows([]);
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const products = (await db.products.toArray()).filter((p: any) => !p.is_deleted);
      let stockByProduct = new Map<string, any>();
      try {
        const res = await getStocks(shopId);
        const list = Array.isArray(res.data) ? res.data : [];
        stockByProduct = new Map(list.map((s: any) => [s.product_id, s]));
      } catch { /* offline: export catalogue without stock columns */ }

      const data = products
        .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)))
        .map((p: any) => {
          const s = stockByProduct.get(p.id);
          return {
            name: p.name, sku: p.sku, barcode: p.barcode, category: p.category, unit: p.unit,
            price: Number(p.price ?? 0), cost_price: Number(p.cost_price ?? 0),
            quantity: s ? Number(s.currentStock ?? s.quantity ?? 0) : undefined,
            min_quantity: s ? Number(s.minStockLevel ?? s.min_quantity ?? 0) : undefined,
            shelf_location: s?.shelf_location || undefined,
            expiry_date: s?.nearest_expiry || undefined,
            description: p.description || undefined,
          };
        });
      if (!data.length) {
        toast.error("No products to export yet");
        return;
      }
      await exportProductsToExcel(data, shopName);
      toast.success(`Exported ${data.length} products`);
    } catch (e) {
      console.error(e);
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!rows.length) return;
    if (!navigator.onLine) {
      toast.error("Importing needs an internet connection");
      return;
    }
    setImporting(true);
    try {
      const res = await api.post("/products/import", { rows, shop_id: shopId || null }, { timeout: 120000 });
      const data: Result = res.data;
      setResult(data);
      if (data.created || data.updated) {
        toast.success(`${data.created} added, ${data.updated} updated`);
        try {
          const { pullUpdates } = await import("@/syncEngine");
          await pullUpdates();
        } catch { /* next background sync will catch up */ }
        onImported();
      }
      if (data.failed) toast.error(`${data.failed} row${data.failed === 1 ? "" : "s"} need fixing`);
    } catch (e: any) {
      const code = e?.response?.data?.error;
      toast.error(code === "too_many_rows" ? "Max 2,000 rows per upload — split the file" : describeImportError(code || "Import failed"));
    } finally {
      setImporting(false);
    }
  };

  const reset = () => { setFile(null); setRows([]); setResult(null); };

  return (
    <div className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[3px]">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Import products from Excel</h2>
              <p className="text-xs text-slate-500">Add new products or update existing ones in bulk</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Step 1 — template */}
          <section className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => downloadTemplate().catch(() => toast.error("Couldn't create the template"))}
              className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-left transition-colors"
            >
              <Download className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <span>
                <span className="block text-sm font-semibold text-slate-800">Download blank template</span>
                <span className="block text-xs text-slate-500 mt-0.5">Excel file with the right columns and instructions</span>
              </span>
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-left transition-colors disabled:opacity-60"
            >
              {exporting ? <Loader2 className="w-5 h-5 text-amber-600 mt-0.5 shrink-0 animate-spin" /> : <FileDown className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />}
              <span>
                <span className="block text-sm font-semibold text-slate-800">Export current products</span>
                <span className="block text-xs text-slate-500 mt-0.5">Edit prices, stock or expiry in Excel, then upload it back</span>
              </span>
            </button>
          </section>

          {/* Shop */}
          <div className="flex items-center gap-3">
            <Store className="w-4 h-4 text-slate-400" />
            <label className="text-sm text-slate-600">Stock, shelf &amp; expiry go to</label>
            <select
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
              disabled={!canChooseShop}
              className="flex-1 max-w-xs px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium bg-white disabled:bg-slate-50"
            >
              {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Step 2 — upload */}
          {!rows.length && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                dragOver ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
              }`}
            >
              {parsing ? (
                <Loader2 className="w-8 h-8 mx-auto text-amber-500 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 mx-auto text-slate-400" />
              )}
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {parsing ? "Reading file..." : "Drop your filled template here, or click to choose"}
              </p>
              <p className="text-xs text-slate-400 mt-1">.xlsx or .csv · up to 2,000 rows</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && !result && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">{rows.length}</span> rows in{" "}
                  <span className="font-medium">{file?.name}</span>
                </p>
                <button onClick={reset} className="text-xs font-semibold text-slate-500 hover:text-slate-800">Choose another file</button>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold text-slate-500">Row</th>
                      {PREVIEW_COLS.map((c) => (
                        <th key={c.key} className="px-2 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">{c.header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 100).map((r) => {
                      const missing = !r.name && !r.sku && !r.barcode;
                      return (
                        <tr key={r._row} className={missing ? "bg-rose-50" : "hover:bg-slate-50"}>
                          <td className="px-2 py-1.5 text-slate-400 tabular-nums">{r._row}</td>
                          {PREVIEW_COLS.map((c) => (
                            <td key={c.key} className="px-2 py-1.5 text-slate-700 whitespace-nowrap max-w-[180px] truncate">
                              {(r as any)[c.key] || <span className="text-slate-300">—</span>}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length > 100 && <p className="text-xs text-slate-400">Showing the first 100 rows.</p>}
            </section>
          )}

          {/* Result */}
          {result && (
            <section className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Added" value={result.created} tone="emerald" />
                <Stat label="Updated" value={result.updated} tone="amber" />
                <Stat label="Failed" value={result.failed} tone={result.failed ? "rose" : "slate"} />
              </div>
              {result.errors.length > 0 ? (
                <div className="border border-rose-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-rose-50 text-xs font-semibold text-rose-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Fix these rows in your file and upload again (the rest were saved)
                  </div>
                  <div className="max-h-56 overflow-auto divide-y divide-rose-100">
                    {result.errors.map((e, i) => (
                      <div key={i} className="px-3 py-2 text-xs flex gap-3">
                        <span className="text-slate-400 tabular-nums w-14 shrink-0">Row {e.row}</span>
                        <span className="text-slate-700 font-medium truncate w-40 shrink-0">{e.name || "—"}</span>
                        <span className="text-rose-600">{describeImportError(e.error)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> All rows imported successfully.
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          {result ? (
            <>
              <button onClick={reset} className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Import another file
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold">
                Done
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!rows.length || importing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                {importing ? "Importing..." : rows.length ? `Import ${rows.length} rows` : "Import"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "rose" | "slate" }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-slate-50 text-slate-500",
  };
  return (
    <div className={`rounded-lg p-3 ${tones[tone]}`}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}
