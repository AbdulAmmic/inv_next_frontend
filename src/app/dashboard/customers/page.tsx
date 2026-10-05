"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { Plus, Search, Users, UserPlus, Repeat, Wallet, Phone, Mail, MapPin, Edit, X, Loader2, Download } from "lucide-react";
import { getCustomers, createCustomer, updateCustomer } from "@/apiCalls";
import { db } from "@/db";
import Loader from "@/components/Loader";
import Pagination from "@/components/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const PAGE_SIZE = 50;

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}
type Activity = { visits: number; spent: number; last: string | null };
type SortKey = "name" | "spent" | "recent" | "newest";

const emptyForm = { name: "", phone: "", email: "", address: "" };
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activity, setActivity] = useState<Map<string, Activity>>(new Map());
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 250);
  const [sort, setSort] = useState<SortKey>("name");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<(typeof emptyForm & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  const canSeeAmounts = role === "admin" || role === "subadmin";
  const money = (v: number) => (canSeeAmounts ? `₦${Math.round(v).toLocaleString("en-NG")}` : "₦******");

  const load = async () => {
    try {
      const [res, sales] = await Promise.all([
        getCustomers(),
        db.sales.filter((s: any) => !s.is_deleted && !!s.customer_id && s.status !== "refunded" && s.status !== "cancelled").toArray(),
      ]);
      setCustomers((res.data || []).filter((c: any) => !c.is_deleted));
      const map = new Map<string, Activity>();
      for (const s of sales as any[]) {
        const a = map.get(s.customer_id) || { visits: 0, spent: 0, last: null };
        a.visits += 1;
        a.spent += Number(s.total_amount || 0);
        if (s.created_at && (!a.last || s.created_at > a.last)) a.last = s.created_at;
        map.set(s.customer_id, a);
      }
      setActivity(map);
    } catch {
      toast.error("Couldn't load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try { setRole((JSON.parse(localStorage.getItem("user") || "{}").role || "").toLowerCase()); } catch { /* none */ }
    load();
  }, []);

  const act = (id: string) => activity.get(id) || { visits: 0, spent: 0, last: null };

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const list = customers.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.address || "").toLowerCase().includes(q) ||
        (digits.length >= 3 && (c.phone || "").replace(/\D/g, "").includes(digits))
    );
    const by: Record<SortKey, (a: Customer, b: Customer) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      spent: (a, b) => act(b.id).spent - act(a.id).spent,
      recent: (a, b) => (act(b.id).last || "").localeCompare(act(a.id).last || ""),
      newest: (a, b) => (b.created_at || b.updated_at || "").localeCompare(a.created_at || a.updated_at || ""),
    };
    return [...list].sort(by[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, activity, debounced, sort]);

  useEffect(() => setPage(1), [debounced, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats (new this month = this calendar month AND year)
  const now = new Date();
  const newThisMonth = customers.filter((c) => {
    const d = c.created_at ? new Date(c.created_at) : null;
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const repeat = customers.filter((c) => act(c.id).visits >= 2).length;
  const totalSpent = customers.reduce((n, c) => n + act(c.id).spent, 0);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const data = { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim() };
    if (!data.name) return toast.error("Enter the customer's name");
    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) return toast.error("That email doesn't look right");
    const phoneDigits = data.phone.replace(/\D/g, "");
    if (phoneDigits) {
      const dupe = customers.find((c) => c.id !== form.id && (c.phone || "").replace(/\D/g, "") === phoneDigits);
      if (dupe && !confirm(`${dupe.name} already has this phone number. Save anyway?`)) return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await updateCustomer(form.id, data);
        setCustomers((prev) => prev.map((c) => (c.id === form.id ? { ...c, ...data } : c)));
        toast.success("Customer updated");
      } else {
        const res = await createCustomer({ ...data, created_at: new Date().toISOString() });
        setCustomers((prev) => [res.data, ...prev]);
        toast.success("Customer added");
      }
      setForm(null);
    } catch {
      toast.error("Couldn't save the customer");
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    if (!filtered.length) return toast.error("No customers to export");
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ["Name", "Phone", "Email", "Address", "Visits", "Total spent", "Last visit"],
      ...filtered.map((c) => {
        const a = act(c.id);
        return [c.name, c.phone, c.email, c.address, a.visits, canSeeAmounts ? a.spent : "", a.last ? a.last.slice(0, 10) : ""];
      }),
    ];
    const blob = new Blob(["﻿" + lines.map((r) => r.map(esc).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const field = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400";
  const label = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5";
  const TH = "px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]";

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader text="Loading customers..." subText="" /></div>;
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 lg:space-y-8 max-w-[100vw] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">Sales</div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Customers</h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full md:w-auto">
          <div className="relative group w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors w-4 h-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, email..." className={`${field} pl-10 sm:w-64`} />
          </div>
          <div className="flex gap-2 sm:gap-3">
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={`${field} flex-1 sm:flex-none sm:w-auto font-medium text-slate-700 cursor-pointer`} aria-label="Sort customers">
            <option value="name">Name A–Z</option>
            <option value="spent">Top spenders</option>
            <option value="recent">Recently visited</option>
            <option value="newest">Newest first</option>
          </select>
          <button onClick={exportCsv} className="inline-flex items-center justify-center bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm" title="Export to CSV">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={() => setForm({ ...emptyForm })} className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-slate-800 active:scale-95 shadow-lg shadow-slate-200 whitespace-nowrap">
            <Plus className="w-4 h-4" /> <span className="hidden min-[400px]:inline">Add</span><span className="hidden sm:inline">&nbsp;Customer</span>
          </button>
          </div>
        </motion.div>
      </div>

      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Customers", value: customers.length.toLocaleString(), icon: Users, tone: "bg-blue-50 text-blue-600" },
          { label: "New this month", value: newThisMonth.toLocaleString(), icon: UserPlus, tone: "bg-emerald-50 text-emerald-600" },
          { label: "Repeat customers", value: repeat.toLocaleString(), icon: Repeat, tone: "bg-amber-50 text-amber-600" },
          { label: "Total spent", value: money(totalSpent), icon: Wallet, tone: "bg-sky-50 text-sky-600" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-3 sm:p-4 rounded-2xl flex items-center gap-3 sm:gap-4">
            <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${s.tone}`}><s.icon className="w-5 h-5" /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{s.label}</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 truncate">{s.value}</p>
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
                <th className={TH}>Customer</th>
                <th className={TH}>Contact</th>
                <th className={`${TH} text-center`}>Visits</th>
                <th className={`${TH} text-right`}>Total spent</th>
                <th className={TH}>Last visit</th>
                <th className={`${TH} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((c) => {
                const a = act(c.id);
                return (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">{initials(c.name)}</span>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{c.name}</div>
                          {c.address && <div className="text-[11px] text-slate-400 truncate max-w-[220px]">{c.address}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.phone ? <a href={`tel:${c.phone}`} className="block text-slate-700 hover:text-amber-700">{c.phone}</a> : <span className="text-slate-300">—</span>}
                      {c.email && <a href={`mailto:${c.email}`} className="block text-[11px] text-slate-400 hover:text-slate-700 truncate max-w-[220px]">{c.email}</a>}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-slate-900 tabular-nums">{a.visits || <span className="text-slate-300">0</span>}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 tabular-nums">{a.spent ? money(a.spent) : <span className="text-slate-300 font-normal">—</span>}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{a.last ? shortDate(a.last) : <span className="text-slate-300">Never</span>}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setForm({ id: c.id, name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "" })} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Edit">
                        <Edit size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-20 text-center"><Empty hasAny={customers.length > 0} onAdd={() => setForm({ ...emptyForm })} /></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-slate-100">
          {rows.map((c) => {
            const a = act(c.id);
            return (
              <div key={c.id} className="p-4 flex items-center gap-3 bg-white">
                <span className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">{initials(c.name)}</span>
                <button onClick={() => setForm({ id: c.id, name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "" })} className="min-w-0 flex-1 text-left">
                  <p className="font-bold text-slate-900 truncate">{c.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {a.visits} visit{a.visits === 1 ? "" : "s"}{a.spent ? ` · ${money(a.spent)}` : ""}{a.last ? ` · ${shortDate(a.last)}` : ""}
                  </p>
                </button>
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0" aria-label={`Call ${c.name}`}>
                    <Phone className="w-4 h-4" />
                  </a>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div className="px-6 py-16 text-center"><Empty hasAny={customers.length > 0} onAdd={() => setForm({ ...emptyForm })} /></div>}
        </div>

        <Pagination page={page} pageCount={pageCount} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </motion.div>

      {/* Add / edit */}
      {form && (
        <div className="modal-overlay fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-[3px]">
          <form onSubmit={save} className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">{form.id ? "Edit customer" : "New customer"}</h2>
              <button type="button" onClick={() => setForm(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className={label}>Name *</label>
                <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className={field} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={label}><Phone className="inline w-3 h-3 mr-1" />Phone</label>
                  <input type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="080..." className={field} />
                </div>
                <div>
                  <label className={label}><Mail className="inline w-3 h-3 mr-1" />Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Optional" className={field} />
                </div>
              </div>
              <div>
                <label className={label}><MapPin className="inline w-3 h-3 mr-1" />Address</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Optional" className={field} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} {form.id ? "Save" : "Add customer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function Empty({ hasAny, onAdd }: { hasAny: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-slate-300" />
      </div>
      <h3 className="text-lg font-bold text-slate-900">{hasAny ? "No matching customers" : "No customers yet"}</h3>
      <p className="text-slate-500 mt-1">{hasAny ? "Try a different name or number." : "Add customers to track their purchases and credit."}</p>
      {!hasAny && (
        <button onClick={onAdd} className="mt-5 inline-flex items-center gap-2 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-slate-800">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      )}
    </div>
  );
}
