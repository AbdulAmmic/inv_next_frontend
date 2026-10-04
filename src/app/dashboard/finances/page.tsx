"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  TrendingUp, Wallet, CircleDollarSign, ArrowDownCircle, Truck, Boxes, Package, AlertTriangle,
  RefreshCw, Calendar, ChevronDown, Store, Receipt, ShoppingCart, ArrowRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getShops, getFullStats } from "@/apiCalls";
import Loader from "@/components/Loader";

interface FinancialStats {
  total_sales_amount: number;
  total_sales_count?: number;
  gross_profit: number;
  net_profit: number;
  total_expenses: number;
  total_expenses_count?: number;
  total_purchase_amount: number;
  total_purchases_count?: number;
  cost_of_goods_sold?: number;
  operating_expenses?: number;
  stock_losses?: number;
  inventory_selling_value: number;
  inventory_cost_value: number;
  products_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

type RangeKey =
  | "today" | "yesterday" | "last7days" | "last30days" | "week" | "lastweek"
  | "month" | "lastmonth" | "quarter" | "lastquarter" | "year" | "lastyear" | "custom";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7days", label: "Last 7 days" },
  { key: "last30days", label: "Last 30 days" },
  { key: "week", label: "This week" },
  { key: "lastweek", label: "Last week" },
  { key: "month", label: "This month" },
  { key: "lastmonth", label: "Last month" },
  { key: "quarter", label: "This quarter" },
  { key: "lastquarter", label: "Last quarter" },
  { key: "year", label: "This year" },
  { key: "lastyear", label: "Last year" },
];

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Start/end (inclusive) for a preset. Weeks start on Monday. */
function rangeFor(key: RangeKey): { start: string; end: string } {
  const t = new Date();
  const d = (y: number, m: number, day: number) => new Date(y, m, day);
  const mondayOf = (x: Date) => { const r = new Date(x); r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); return r; };
  const q = Math.floor(t.getMonth() / 3);
  switch (key) {
    case "today": return { start: ymd(t), end: ymd(t) };
    case "yesterday": { const y = new Date(t); y.setDate(y.getDate() - 1); return { start: ymd(y), end: ymd(y) }; }
    case "last7days": { const s = new Date(t); s.setDate(s.getDate() - 6); return { start: ymd(s), end: ymd(t) }; }
    case "last30days": { const s = new Date(t); s.setDate(s.getDate() - 29); return { start: ymd(s), end: ymd(t) }; }
    case "week": return { start: ymd(mondayOf(t)), end: ymd(t) };
    case "lastweek": { const s = mondayOf(t); s.setDate(s.getDate() - 7); const e = new Date(s); e.setDate(e.getDate() + 6); return { start: ymd(s), end: ymd(e) }; }
    case "month": return { start: ymd(d(t.getFullYear(), t.getMonth(), 1)), end: ymd(t) };
    case "lastmonth": return { start: ymd(d(t.getFullYear(), t.getMonth() - 1, 1)), end: ymd(d(t.getFullYear(), t.getMonth(), 0)) };
    case "quarter": return { start: ymd(d(t.getFullYear(), q * 3, 1)), end: ymd(t) };
    case "lastquarter": { const y = q === 0 ? t.getFullYear() - 1 : t.getFullYear(); const lq = q === 0 ? 3 : q - 1; return { start: ymd(d(y, lq * 3, 1)), end: ymd(d(y, lq * 3 + 3, 0)) }; }
    case "year": return { start: ymd(d(t.getFullYear(), 0, 1)), end: ymd(t) };
    case "lastyear": return { start: ymd(d(t.getFullYear() - 1, 0, 1)), end: ymd(d(t.getFullYear() - 1, 11, 31)) };
    default: return { start: ymd(t), end: ymd(t) };
  }
}

const naira = (n: number) => `₦${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
const compact = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `${(n / 1e3).toFixed(0)}k` : `${n}`);
const pct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "—");
const displayDate = (s: string) => {
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
};

export default function FinancesPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [shopId, setShopId] = useState<string | null>(null); // "" = all shops
  const [rangeKey, setRangeKey] = useState<RangeKey>("month");
  const [range, setRange] = useState(() => rangeFor("month"));
  const [draft, setDraft] = useState(() => rangeFor("month"));
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Role guard (managers and staff don't see finances)
  useEffect(() => {
    let role = "";
    try { role = (JSON.parse(localStorage.getItem("user") || "{}").role || "").toLowerCase(); } catch { /* none */ }
    if (role === "manager" || role === "staff") {
      toast.error("You don't have access to Finances");
      router.replace("/dashboard");
      return;
    }
    setAllowed(true);
    setIsAdmin(role === "admin");
    getShops()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setShops(list);
        const saved = localStorage.getItem("selected_shop_id");
        setShopId(saved && list.some((s: any) => s.id === saved) ? saved : list[0]?.id || "");
      })
      .catch(() => setShopId(""));
  }, [router]);

  useEffect(() => {
    if (!pickerOpen) return;
    const close = (e: MouseEvent) => { if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [pickerOpen]);

  useEffect(() => {
    if (shopId === null) return;
    let cancelled = false;
    stats ? setRefreshing(true) : setLoading(true);
    setError(null);
    getFullStats({ shop_id: shopId, start_date: range.start, end_date: range.end })
      .then((res) => { if (!cancelled) setStats(res.data); })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.response?.status === 403 ? "You don't have permission to view these figures." : "Couldn't load the figures. Try refreshing.");
      })
      .finally(() => { if (!cancelled) { setLoading(false); setRefreshing(false); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, range]);

  const refresh = () => setRange((r) => ({ ...r }));

  const choosePreset = (key: RangeKey) => {
    const r = rangeFor(key);
    setRangeKey(key);
    setRange(r);
    setDraft(r);
    setPickerOpen(false);
  };

  const applyCustom = () => {
    if (!draft.start || !draft.end) return;
    if (draft.start > draft.end) return toast.error("Start date must be before end date");
    setRangeKey("custom");
    setRange({ ...draft });
    setPickerOpen(false);
  };

  const s = stats;
  const sales = s?.total_sales_amount || 0;
  const cogs = s?.cost_of_goods_sold ?? Math.max(0, sales - (s?.gross_profit || 0));
  const gross = s?.gross_profit || 0;
  const losses = s?.stock_losses ?? 0;
  const opex = s?.operating_expenses ?? Math.max(0, (s?.total_expenses || 0) - losses);
  const net = s?.net_profit || 0;
  const potentialProfit = (s?.inventory_selling_value || 0) - (s?.inventory_cost_value || 0);

  const chartData = useMemo(() => [
    { name: "Sales", value: sales, color: "#10b981" },
    { name: "Cost of goods", value: cogs, color: "#94a3b8" },
    { name: "Expenses", value: opex + losses, color: "#f43f5e" },
    { name: "Net profit", value: net, color: net >= 0 ? "#d4940a" : "#be123c" },
  ], [sales, cogs, opex, losses, net]);

  const rangeLabel = rangeKey === "custom" ? "Custom range" : RANGES.find((r) => r.key === rangeKey)?.label;
  const field = "bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400";

  if (!allowed || (loading && !stats)) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader text="Loading finances..." subText="" /></div>;
  }

  return (
    <main className={`p-4 sm:p-6 lg:p-10 space-y-6 lg:space-y-8 max-w-[100vw] overflow-hidden transition-opacity ${refreshing ? "opacity-70" : ""}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">Finance</div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Finances</h1>
          <p className="text-sm text-slate-500 mt-1">
            {rangeLabel} · {displayDate(range.start)}{range.start !== range.end && ` – ${displayDate(range.end)}`}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full md:w-auto">
          {/* Date range */}
          <div ref={pickerRef} className="relative w-full sm:w-auto">
            <button onClick={() => setPickerOpen((o) => !o)} className={`${field} w-full sm:min-w-[190px] flex items-center justify-between gap-3`}>
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" />{rangeLabel}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
            </button>
            {pickerOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-[calc(100vw-2rem)] sm:w-80 bg-white rounded-xl border border-slate-200 shadow-xl p-3 space-y-3">
                <div className="grid grid-cols-2 gap-1">
                  {RANGES.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => choosePreset(r.key)}
                      className={`px-3 py-2 rounded-lg text-left text-sm ${rangeKey === r.key ? "bg-slate-900 text-white font-semibold" : "text-slate-600 hover:bg-slate-50"}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Custom range</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={draft.start} max={draft.end || undefined} onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))} className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm" />
                    <input type="date" value={draft.end} min={draft.start || undefined} onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))} className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm" />
                  </div>
                  <button onClick={applyCustom} className="w-full py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">Apply</button>
                </div>
              </div>
            )}
          </div>

          {/* Shop */}
          <div className="relative w-full sm:w-auto">
            <select
              value={shopId ?? ""}
              onChange={(e) => { setShopId(e.target.value); if (e.target.value) localStorage.setItem("selected_shop_id", e.target.value); }}
              className={`${field} appearance-none w-full sm:min-w-[170px] pr-9 cursor-pointer`}
            >
              {isAdmin && shops.length > 1 && <option value="">All shops</option>}
              {shops.length === 0 && <option value="">All shops</option>}
              {shops.map((sh) => <option key={sh.id} value={sh.id}>{sh.name}</option>)}
            </select>
            <Store className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <button onClick={refresh} disabled={refreshing} className="inline-flex items-center justify-center bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 shadow-sm" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </motion.div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-sm text-rose-700">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* 1. Key figures */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Sales" value={naira(sales)} sub={`${(s?.total_sales_count || 0).toLocaleString()} sales`} icon={TrendingUp} tone="bg-emerald-50 text-emerald-600" />
        <Stat label="Gross profit" value={naira(gross)} sub={`${pct(gross, sales)} margin`} icon={Wallet} tone="bg-sky-50 text-sky-600" />
        <Stat label="Expenses & losses" value={naira(opex + losses)} sub={`${pct(opex + losses, sales)} of sales`} icon={ArrowDownCircle} tone="bg-rose-50 text-rose-600" />
        <Stat
          label="Net profit"
          value={naira(net)}
          sub={`${pct(net, sales)} margin`}
          icon={CircleDollarSign}
          tone={net >= 0 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}
          valueClass={net < 0 ? "text-rose-600" : ""}
        />
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-6 items-start">
        {/* 2. Profit & loss statement */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Profit &amp; loss</h2>
          </div>
          <div className="p-5 text-sm">
            <PLRow label="Sales" value={sales} />
            <PLRow label="Cost of goods sold" value={-cogs} muted />
            <PLRow label="Gross profit" value={gross} strong note={pct(gross, sales)} border />
            <PLRow label="Operating expenses" value={-opex} muted href="/dashboard/expenses" />
            <PLRow label="Stock losses (damaged, lost, expired)" value={-losses} muted href="/dashboard/grievances" />
            <div className="mt-3 pt-3 border-t-2 border-slate-900 flex items-baseline justify-between">
              <span className="font-bold text-slate-900">Net profit</span>
              <span className="text-right">
                <span className={`block text-lg font-bold tabular-nums ${net < 0 ? "text-rose-600" : "text-slate-900"}`}>{naira(net)}</span>
                <span className="block text-[11px] text-slate-400">{pct(net, sales)} of sales</span>
              </span>
            </div>
            <p className="mt-4 text-xs text-slate-400 leading-relaxed">
              Purchases aren&apos;t subtracted here: stock bought becomes a cost only when it&apos;s sold (cost of goods sold).
            </p>
          </div>
        </motion.section>

        {/* 3. Chart + ratios */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Where the money went</h2>
          </div>
          <div className="p-5">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} padding={{ left: 12, right: 12 }} tick={{ fill: "#64748b", fontSize: 12 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `₦${compact(v)}`} />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    content={({ active, payload, label }: any) =>
                      active && payload?.length ? (
                        <div className="bg-white px-3 py-2 border border-slate-200 shadow-lg rounded-lg">
                          <p className="text-xs text-slate-500">{label}</p>
                          <p className="font-bold text-slate-900 tabular-nums">{naira(payload[0].value || 0)}</p>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
                    {chartData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Ratio label="Gross margin" value={pct(gross, sales)} />
              <Ratio label="Net margin" value={pct(net, sales)} />
              <Ratio label="Expense ratio" value={pct(opex + losses, sales)} />
              <Ratio label="Avg. sale" value={s?.total_sales_count ? naira(sales / s.total_sales_count) : "—"} />
            </div>
          </div>
        </motion.section>
      </div>

      {/* 4. Money spent */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-3">Money spent in this period</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <LinkStat href="/dashboard/purchases" label="Stock purchases" value={naira(s?.total_purchase_amount || 0)} sub={`${(s?.total_purchases_count || 0).toLocaleString()} orders`} icon={Truck} tone="bg-blue-50 text-blue-600" />
          <LinkStat href="/dashboard/expenses" label="Operating expenses" value={naira(opex)} sub={`${(s?.total_expenses_count || 0).toLocaleString()} entries`} icon={Receipt} tone="bg-rose-50 text-rose-600" />
          <LinkStat href="/dashboard/grievances" label="Stock losses" value={naira(losses)} sub="Damaged, lost or expired" icon={AlertTriangle} tone="bg-amber-50 text-amber-600" />
        </div>
      </motion.div>

      {/* 5. Inventory (right now, not limited to the date range) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <h2 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-3">Inventory right now</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Stock at cost" value={naira(s?.inventory_cost_value || 0)} sub={`${(s?.products_count || 0).toLocaleString()} products`} icon={Package} tone="bg-slate-100 text-slate-600" />
          <Stat label="Stock at selling price" value={naira(s?.inventory_selling_value || 0)} sub="If everything sells" icon={Boxes} tone="bg-emerald-50 text-emerald-600" />
          <Stat label="Profit in stock" value={naira(potentialProfit)} sub={`${pct(potentialProfit, s?.inventory_selling_value || 0)} of selling value`} icon={ShoppingCart} tone="bg-amber-50 text-amber-600" />
          <LinkStat
            href="/dashboard/alerts"
            label="Needs restocking"
            value={`${(s?.low_stock_count || 0) + (s?.out_of_stock_count || 0)}`}
            sub={`${s?.out_of_stock_count || 0} out of stock · ${s?.low_stock_count || 0} low`}
            icon={AlertTriangle}
            tone={(s?.out_of_stock_count || 0) > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"}
          />
        </div>
      </motion.div>
    </main>
  );
}

/* ---------- small pieces ---------- */

function Stat({ label, value, sub, icon: Icon, tone, valueClass = "" }: { label: string; value: string; sub?: string; icon: any; tone: string; valueClass?: string }) {
  return (
    <div className="glass-card p-4 rounded-2xl flex items-center gap-4 h-full">
      <div className={`p-3 rounded-xl shrink-0 ${tone}`}><Icon className="w-5 h-5" /></div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={`text-lg font-bold text-slate-900 tabular-nums truncate ${valueClass}`}>{value}</p>
        {sub && <p className="text-[11px] text-slate-500 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function LinkStat(props: { href: string; label: string; value: string; sub?: string; icon: any; tone: string }) {
  return (
    <Link href={props.href} className="group block h-full rounded-2xl">
      <div className="relative h-full transition-transform group-hover:-translate-y-0.5">
        <Stat {...props} />
        <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
      </div>
    </Link>
  );
}

function PLRow({ label, value, muted, strong, note, border, href }: { label: string; value: number; muted?: boolean; strong?: boolean; note?: string; border?: boolean; href?: string }) {
  const amount = (
    <span className={`tabular-nums ${strong ? "font-bold text-slate-900" : muted ? "text-slate-600" : "font-semibold text-slate-900"}`}>
      {value < 0 ? `(${naira(-value)})` : naira(value)}
    </span>
  );
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2 ${border ? "mt-1 border-t border-slate-200" : ""}`}>
      <span className={`${strong ? "font-semibold text-slate-900" : muted ? "text-slate-500 pl-3" : "text-slate-700"}`}>
        {href ? <Link href={href} className="hover:text-slate-900 hover:underline underline-offset-2">{label}</Link> : label}
        {note && <span className="ml-2 text-[11px] font-normal text-slate-400">{note}</span>}
      </span>
      {amount}
    </div>
  );
}

function Ratio({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">{value}</p>
    </div>
  );
}
