"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Receipt, Plus, Search, Loader2, Trash2, Eye, X, ChevronDown, Wallet, CalendarDays, Tag, Download, Filter,
} from "lucide-react";
import { getExpenses, createExpense, getExpenseCategories, createExpenseCategory, getShops, deleteExpense } from "@/apiCalls";
import Loader from "@/components/Loader";
import Pagination from "@/components/Pagination";

interface Expense {
  id: string;
  shop_id: string;
  category_id: string;
  category_name?: string;
  user_name?: string;
  amount: number;
  description: string;
  reference?: string;
  date: string;
}
interface Option { id: string; name: string }

const PAGE_SIZE = 50;

// Local yyyy-mm-dd (not UTC, which can land on the wrong day near midnight)
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dayOf = (s: string) => String(s || "").slice(0, 10);
const showDate = (s: string, long = false) => {
  const d = new Date(dayOf(s) + "T00:00:00");
  return isNaN(d.getTime())
    ? s
    : d.toLocaleDateString("en-GB", long ? { weekday: "long", day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" });
};

const emptyForm = () => ({
  shop_id: (typeof window !== "undefined" && localStorage.getItem("selected_shop_id")) || "",
  category_id: "",
  amount: "",
  description: "",
  reference: "",
  date: todayLocal(),
});

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [shops, setShops] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterShop, setFilterShop] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const [form, setForm] = useState<ReturnType<typeof emptyForm> | null>(null);
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canSeeAmounts = role === "admin" || role === "subadmin";
  const money = (v: number) => (canSeeAmounts ? `₦${Number(v || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}` : "₦******");

  const loadData = async () => {
    try {
      const [exp, cat, shp] = await Promise.all([getExpenses(), getExpenseCategories(), getShops()]);
      setExpenses((exp.data || []).filter((e: any) => !e.is_deleted));
      setCategories((cat.data || []).filter((c: any) => !c.is_deleted).sort((a: Option, b: Option) => a.name.localeCompare(b.name)));
      setShops(shp.data || []);
    } catch {
      toast.error("Couldn't load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let r = "";
    try { r = (JSON.parse(localStorage.getItem("user") || "{}").role || "").toLowerCase(); } catch { /* none */ }
    if (r === "staff") {
      toast.error("You don't have access to Expenses");
      router.replace("/dashboard");
      return;
    }
    setRole(r);
    loadData();
  }, [router]);

  const shopName = (id: string) => shops.find((s) => s.id === id)?.name || "";
  const catName = (e: Expense) => categories.find((c) => c.id === e.category_id)?.name || e.category_name || "Uncategorised";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses
      .filter((e) => {
        if (filterCategory && e.category_id !== filterCategory) return false;
        if (filterShop && e.shop_id !== filterShop) return false;
        const d = dayOf(e.date);
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        if (!q) return true;
        return [e.description, e.reference, shopName(e.shop_id), catName(e), e.user_name].some((v) => (v || "").toLowerCase().includes(q));
      })
      .sort((a, b) => dayOf(b.date).localeCompare(dayOf(a.date)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, categories, shops, search, filterCategory, filterShop, fromDate, toDate]);

  useEffect(() => setPage(1), [search, filterCategory, filterShop, fromDate, toDate]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);
  const monthPrefix = todayLocal().slice(0, 7);
  const thisMonth = expenses.filter((e) => dayOf(e.date).startsWith(monthPrefix)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const topCategory = useMemo(() => {
    const sums = new Map<string, number>();
    filtered.forEach((e) => sums.set(catName(e), (sums.get(catName(e)) || 0) + Number(e.amount || 0)));
    return [...sums.entries()].sort((a, b) => b[1] - a[1])[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);
  const activeFilters = [filterCategory, filterShop, fromDate, toDate].filter(Boolean).length;

  const clearFilters = () => { setFilterCategory(""); setFilterShop(""); setFromDate(""); setToDate(""); setSearch(""); };

  // ---- create ----
  const openForm = () => {
    const f = emptyForm();
    if (!shops.some((s) => s.id === f.shop_id)) f.shop_id = shops.length === 1 ? shops[0].id : "";
    setForm(f);
    setNewCategory(null);
  };

  const addCategory = async () => {
    const name = (newCategory || "").trim();
    if (!name) return toast.error("Enter a category name");
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase())!;
      setForm((f) => (f ? { ...f, category_id: existing.id } : f));
      setNewCategory(null);
      return;
    }
    try {
      const res = await createExpenseCategory({ name });
      setCategories((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => (f ? { ...f, category_id: res.data.id } : f));
      setNewCategory(null);
      toast.success(`Category "${name}" added`);
    } catch {
      toast.error("Couldn't add the category");
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const amount = Number(form.amount);
    if (!form.shop_id) return toast.error("Choose a shop");
    if (!form.category_id) return toast.error("Choose a category");
    if (!form.date) return toast.error("Choose a date");
    if (!(amount > 0)) return toast.error("Enter an amount above zero");
    if (form.date > todayLocal() && !confirm("This date is in the future. Save anyway?")) return;

    setSubmitting(true);
    try {
      await createExpense({ ...form, amount, description: form.description.trim(), reference: form.reference.trim() });
      toast.success("Expense recorded");
      setForm(null);
      await loadData();
    } catch {
      toast.error("Couldn't save the expense");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExpense(deleteTarget.id);
      setExpenses((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      toast.success("Expense deleted");
      setDeleteTarget(null);
      setViewing(null);
    } catch {
      toast.error("Couldn't delete the expense");
    } finally {
      setDeleting(false);
    }
  };

  const exportCsv = () => {
    if (!filtered.length) return toast.error("No expenses to export");
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Date", "Shop", "Category", "Description", "Reference", "Amount", "Recorded by"],
      ...filtered.map((e) => [dayOf(e.date), shopName(e.shop_id), catName(e), e.description, e.reference, e.amount, e.user_name]),
    ];
    const blob = new Blob(["﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${todayLocal()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const field = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400";
  const label = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5";
  const TH = "px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]";

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader text="Loading expenses..." subText="" /></div>;
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 lg:space-y-8 max-w-[100vw] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">Finance</div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Expenses</h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full md:w-auto">
          <div className="relative group w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors w-4 h-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description, category, shop..." className={`${field} pl-10 sm:w-64`} />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center justify-center gap-2 border rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm w-full sm:w-auto ${showFilters || activeFilters ? "bg-slate-100 border-slate-300 text-slate-900" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
          >
            <Filter className="w-4 h-4" /> Filters{activeFilters ? ` (${activeFilters})` : ""}
          </button>
          {canSeeAmounts && (
            <button onClick={exportCsv} className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm w-full sm:w-auto" title="Export to CSV">
              <Download className="w-4 h-4" />
            </button>
          )}
          <button onClick={openForm} className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-slate-800 active:scale-95 shadow-lg shadow-slate-200 w-full sm:w-auto">
            <Plus className="w-4 h-4" /> New Expense
          </button>
        </motion.div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Filters</h3>
            <button onClick={clearFilters} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Clear all</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={label}>Category</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={field}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Shop</label>
              <select value={filterShop} onChange={(e) => setFilterShop(e.target.value)} className={field}>
                <option value="">All shops</option>
                {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>From</label>
              <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>To</label>
              <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} className={field} />
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: activeFilters || search ? "Total (filtered)" : "Total", value: money(total), icon: Wallet, tone: "bg-rose-50 text-rose-600" },
          { label: "This month", value: money(thisMonth), icon: CalendarDays, tone: "bg-amber-50 text-amber-600" },
          { label: "Entries", value: filtered.length.toLocaleString(), icon: Receipt, tone: "bg-blue-50 text-blue-600" },
          { label: "Top category", value: topCategory ? topCategory[0] : "—", icon: Tag, tone: "bg-slate-100 text-slate-600" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 rounded-2xl flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.tone}`}><s.icon className="w-5 h-5" /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-lg font-bold text-slate-900 truncate">{s.value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className={TH}>Date</th>
                <th className={TH}>Category</th>
                <th className={TH}>Description</th>
                <th className={TH}>Shop</th>
                <th className={`${TH} text-right`}>Amount</th>
                <th className={`${TH} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pageRows.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => setViewing(e)}>
                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{showDate(e.date)}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">{catName(e)}</span>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <div className="text-slate-900 truncate">{e.description || <span className="text-slate-300">—</span>}</div>
                    {e.reference && <div className="text-[10px] text-slate-400 font-mono truncate">Ref {e.reference}</div>}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{shopName(e.shop_id) || "—"}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900 tabular-nums">{money(e.amount)}</td>
                  <td className="px-6 py-4 text-right" onClick={(ev) => ev.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setViewing(e)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all" title="View">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => setDeleteTarget(e)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <EmptyState hasAny={expenses.length > 0} onAdd={openForm} onClear={clearFilters} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-slate-100">
          {pageRows.map((e) => (
            <button key={e.id} onClick={() => setViewing(e)} className="w-full text-left p-4 bg-white hover:bg-slate-50 space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">{catName(e)}</span>
                <span className="font-bold text-slate-900 tabular-nums">{money(e.amount)}</span>
              </div>
              <p className="text-sm text-slate-900 truncate">{e.description || "No description"}</p>
              <p className="text-xs text-slate-500">{showDate(e.date)} · {shopName(e.shop_id)}</p>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-6 py-16 text-center"><EmptyState hasAny={expenses.length > 0} onAdd={openForm} onClear={clearFilters} /></div>
          )}
        </div>

        <Pagination page={page} pageCount={pageCount} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </motion.div>

      {/* New expense */}
      {form && (
        <div className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[3px]">
          <form onSubmit={save} className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">New expense</h2>
              <button type="button" onClick={() => setForm(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={label}>Amount (₦) *</label>
                <input type="number" min="0" step="0.01" inputMode="decimal" autoFocus value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" className={`${field} text-lg font-semibold tabular-nums`} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={label.replace(" mb-1.5", "")}>Category *</label>
                  {newCategory === null && (
                    <button type="button" onClick={() => setNewCategory("")} className="text-[11px] font-semibold text-blue-600 hover:text-blue-800">+ New</button>
                  )}
                </div>
                {newCategory === null ? (
                  <div className="relative">
                    <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className={`${field} appearance-none pr-9`}>
                      <option value="">{categories.length ? "Select category" : "No categories yet — add one"}</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } if (e.key === "Escape") setNewCategory(null); }}
                      placeholder="e.g. Transport"
                      className={field}
                    />
                    <button type="button" onClick={addCategory} className="px-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">Add</button>
                    <button type="button" onClick={() => setNewCategory(null)} className="px-2 rounded-xl text-slate-400 hover:bg-slate-100" aria-label="Cancel"><X className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <div>
                <label className={label}>Date *</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={field} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Shop *</label>
                <select value={form.shop_id} onChange={(e) => setForm({ ...form, shop_id: e.target.value })} className={field}>
                  <option value="">Select shop</option>
                  {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was it for?" className={`${field} resize-none`} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Reference / receipt no.</label>
                <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Optional" className={field} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Save expense
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Details */}
      {viewing && (
        <div className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[3px]">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Expense</h2>
              <button onClick={() => setViewing(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div>
                <p className="text-2xl font-bold text-slate-900 tabular-nums">{money(viewing.amount)}</p>
                <p className="text-slate-500">{showDate(viewing.date, true)}</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 pt-4 border-t border-slate-100">
                <Detail label="Category" value={catName(viewing)} />
                <Detail label="Shop" value={shopName(viewing.shop_id) || "—"} />
                <Detail label="Reference" value={viewing.reference || "—"} mono />
                <Detail label="Recorded by" value={viewing.user_name || "—"} />
              </dl>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</p>
                <p className="text-slate-700 whitespace-pre-wrap">{viewing.description || "No description."}</p>
              </div>
            </div>
            <div className="flex justify-between gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <button onClick={() => setDeleteTarget(viewing)} className="px-3 py-2 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50">Delete</button>
              <button onClick={() => setViewing(null)} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete */}
      {deleteTarget && (
        <div className="modal-overlay fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[3px]">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden">
            <div className="p-5 space-y-2">
              <h2 className="font-bold text-slate-900">Delete this expense?</h2>
              <p className="text-sm text-slate-600">
                {money(deleteTarget.amount)} · {catName(deleteTarget)} · {showDate(deleteTarget.date)}. This can&apos;t be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-50">
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</dt>
      <dd className={`text-slate-900 mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function EmptyState({ hasAny, onAdd, onClear }: { hasAny: boolean; onAdd: () => void; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
        <Receipt className="w-8 h-8 text-slate-300" />
      </div>
      <h3 className="text-lg font-bold text-slate-900">{hasAny ? "No matching expenses" : "No expenses yet"}</h3>
      <p className="text-slate-500 mt-1">{hasAny ? "Try a different search or clear the filters." : "Record rent, transport, salaries and other running costs."}</p>
      <button onClick={hasAny ? onClear : onAdd} className="mt-5 inline-flex items-center gap-2 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-slate-800">
        {hasAny ? "Clear filters" : <><Plus className="w-4 h-4" /> New Expense</>}
      </button>
    </div>
  );
}
