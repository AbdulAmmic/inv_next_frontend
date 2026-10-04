"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { Plus, Search, Edit, Trash2, Tags, Package, FolderOpen, X, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/apiCalls";
import Loader from "@/components/Loader";

type Category = { id: string; name: string; description: string; product_count: number };

const ERRORS: Record<string, string> = {
  name_required: "Enter a category name",
  name_too_long: "Name is too long (120 characters max)",
  category_already_exists: "A category with that name already exists",
  category_not_found: "That category no longer exists. Refresh and try again.",
};
const errorText = (e: any) => ERRORS[e?.response?.data?.error] || (e?.response ? "Something went wrong" : "You're offline. Categories can be changed when you're back online.");

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [uncategorized, setUncategorized] = useState(0);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [canEdit, setCanEdit] = useState(false);

  const [form, setForm] = useState<{ mode: "add" | "edit"; id?: string; name: string; description: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [moveTo, setMoveTo] = useState("");

  const load = async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    try {
      const res = await getCategories();
      setCategories(res.data.categories || []);
      setUncategorized(res.data.uncategorized_count || 0);
      setOffline(res.offline);
    } catch {
      toast.error("Couldn't load categories");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    try {
      const role = (JSON.parse(localStorage.getItem("user") || "{}").role || "").toLowerCase();
      setCanEdit(["admin", "subadmin", "manager"].includes(role));
    } catch { /* view only */ }
    load();
  }, []);

  // Product rows carry the category name, so refresh the local catalogue
  // after a rename/merge/delete changes it on the server.
  const syncProducts = () => import("@/syncEngine").then(({ pullUpdates }) => pullUpdates()).catch(() => {});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? categories.filter((c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)) : categories;
  }, [categories, search]);

  const totalProducts = categories.reduce((n, c) => n + c.product_count, 0) + uncategorized;
  const emptyCount = categories.filter((c) => c.product_count === 0).length;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.name.trim()) return toast.error("Enter a category name");
    setSaving(true);
    try {
      if (form.mode === "add") {
        await createCategory({ name: form.name, description: form.description });
        toast.success("Category added");
      } else {
        const res = await updateCategory(form.id!, { name: form.name, description: form.description });
        toast.success(res.data?.merged ? `Merged into ${res.data.name}` : "Category updated");
        syncProducts();
      }
      setForm(null);
      await load(true);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setSaving(true);
    try {
      const res = await deleteCategory(toDelete.id, moveTo || undefined);
      const moved = res.data?.products_moved || 0;
      const target = categories.find((c) => c.id === moveTo)?.name;
      toast.success(moved ? `Deleted. ${moved} product${moved === 1 ? "" : "s"} ${target ? `moved to ${target}` : "now uncategorised"}.` : "Category deleted");
      setToDelete(null);
      setMoveTo("");
      syncProducts();
      await load(true);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const editable = canEdit && !offline;
  const field = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400";
  const TH = "px-6 py-4 font-bold text-slate-600 uppercase tracking-wider text-[11px]";

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader text="Loading categories..." subText="" /></div>;
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 space-y-6 lg:space-y-8 max-w-[100vw] overflow-hidden">
      {offline && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-sm text-amber-800">
          <WifiOff className="w-4 h-4 shrink-0" /> You&apos;re offline. Showing saved categories. Changes are available when you&apos;re back online.
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">Inventory</div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Categories</h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          <div className="relative group w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors w-4 h-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories..." className={`${field} pl-10 sm:w-64`} />
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 shadow-sm w-full sm:w-auto"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          {editable && (
            <button
              onClick={() => setForm({ mode: "add", name: "", description: "" })}
              className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-slate-800 active:scale-95 shadow-lg shadow-slate-200 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          )}
        </motion.div>
      </div>

      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Categories", value: categories.length, icon: Tags, tone: "bg-blue-50 text-blue-600" },
          { label: "Products", value: totalProducts, icon: Package, tone: "bg-emerald-50 text-emerald-600" },
          { label: "Uncategorised", value: uncategorized, icon: FolderOpen, tone: "bg-amber-50 text-amber-600" },
          { label: "Empty categories", value: emptyCount, icon: Tags, tone: "bg-slate-100 text-slate-500" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 rounded-2xl flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.tone}`}><s.icon className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className="text-lg font-bold text-slate-900">{s.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className={TH}>Category</th>
                <th className={TH}>Description</th>
                <th className={`${TH} text-center`}>Products</th>
                {editable && <th className={`${TH} text-right`}>Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">{c.name}</td>
                  <td className="px-6 py-4 text-slate-500 max-w-md truncate">{c.description || <span className="text-slate-300">—</span>}</td>
                  <td className="px-6 py-4 text-center">
                    {c.product_count > 0 ? (
                      <Link href={`/dashboard/products?category=${encodeURIComponent(c.name)}`} className="font-bold text-slate-900 hover:text-amber-700">
                        {c.product_count}
                      </Link>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  {editable && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setForm({ mode: "edit", id: c.id, name: c.name, description: c.description })} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Edit">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => { setToDelete(c); setMoveTo(""); }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                      <Tags className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{categories.length ? "No matching categories" : "No categories yet"}</h3>
                    <p className="text-slate-500 mt-1">
                      {categories.length ? "Try a different search." : "Add one here, or set a category when adding a product."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add / edit */}
      {form && (
        <div className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[3px]">
          <form onSubmit={save} className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">{form.mode === "add" ? "New category" : "Edit category"}</h2>
              <button type="button" onClick={() => setForm(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name *</label>
                <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Beverages" className={field} />
                {form.mode === "edit" && (
                  <p className="text-xs text-slate-500 mt-1.5">Renaming updates every product in this category. Using an existing name merges the two.</p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" className={`${field} resize-none`} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} {form.mode === "add" ? "Add category" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete */}
      {toDelete && (
        <div className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[3px]">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Delete &ldquo;{toDelete.name}&rdquo;?</h2>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {toDelete.product_count > 0 ? (
                <>
                  <p className="text-slate-600">
                    {toDelete.product_count} product{toDelete.product_count === 1 ? " is" : "s are"} in this category. No products are deleted. Choose where they go:
                  </p>
                  <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className={field}>
                    <option value="">Leave uncategorised</option>
                    {categories.filter((c) => c.id !== toDelete.id).map((c) => <option key={c.id} value={c.id}>Move to {c.name}</option>)}
                  </select>
                </>
              ) : (
                <p className="text-slate-600">This category has no products.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <button onClick={() => setToDelete(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={confirmDelete} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Delete category
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
