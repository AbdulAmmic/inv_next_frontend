"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { getApiBase } from "@/apiBase";

type Business = {
  id: string;
  name: string;
  admin_email: string;
  theme: { primary_color?: string; logo_url?: string };
  shop_capacity: number;
  shop_count: number;
  plan: string;
  is_active: boolean;
  created_at: string;
};

function platformApi() {
  const token = typeof window !== "undefined" ? localStorage.getItem("platform_token") : null;
  return axios.create({
    baseURL: getApiBase(),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

const emptyForm = {
  name: "",
  admin_email: "",
  admin_name: "",
  shop_capacity: 1,
  plan: "trial",
  primary_color: "#6366f1",
};

export default function PlatformBusinessesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [newCreds, setNewCreds] = useState<{ email: string; temp_password: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", admin_email: "", primary_color: "#6366f1", logo_url: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await platformApi().get("/platform/businesses");
      setBusinesses(res.data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        router.replace("/platform-admin");
        return;
      }
      setError("Could not load businesses.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!localStorage.getItem("platform_token")) {
      router.replace("/platform-admin");
      return;
    }
    load();
  }, [load, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await platformApi().post("/platform/businesses", {
        name: form.name,
        admin_email: form.admin_email,
        admin_name: form.admin_name || undefined,
        shop_capacity: Number(form.shop_capacity),
        plan: form.plan,
        theme: { primary_color: form.primary_color },
      });
      setNewCreds(res.data.owner);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Could not create business.");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (b: Business) => {
    try {
      await platformApi().put(`/platform/businesses/${b.id}`, { is_active: !b.is_active });
      load();
    } catch {
      setError("Could not update business.");
    }
  };

  const updateCapacity = async (b: Business, capacity: number) => {
    if (!Number.isFinite(capacity) || capacity < 1) return;
    try {
      await platformApi().put(`/platform/businesses/${b.id}`, { shop_capacity: capacity });
      load();
    } catch {
      setError("Could not update capacity.");
    }
  };

  const logout = () => {
    localStorage.removeItem("platform_token");
    localStorage.removeItem("platform_admin");
    router.replace("/platform-admin");
  };

  const startEdit = (b: Business) => {
    setEditingId(b.id);
    setEditForm({
      name: b.name,
      admin_email: b.admin_email,
      primary_color: b.theme?.primary_color || "#6366f1",
      logo_url: b.theme?.logo_url || "",
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError("");
    try {
      await platformApi().put(`/platform/businesses/${editingId}`, {
        name: editForm.name,
        admin_email: editForm.admin_email,
        theme: { primary_color: editForm.primary_color, logo_url: editForm.logo_url || undefined },
      });
      setEditingId(null);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Businesses</h1>
            <p className="text-slate-400 text-sm">Manage every tenant on the Tuhanas platform.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm((v) => !v)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-bold transition-colors"
            >
              {showForm ? "Cancel" : "+ New Business"}
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-bold transition-colors"
            >
              Log out
            </button>
          </div>
        </div>

        {newCreds && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950 border border-emerald-800 text-sm">
            <p className="font-bold text-emerald-300 mb-1">Business created.</p>
            <p className="text-emerald-100">
              Owner login: <span className="font-mono">{newCreds.email}</span> / temp password:{" "}
              <span className="font-mono">{newCreds.temp_password}</span>
            </p>
            <p className="text-emerald-400/70 text-xs mt-1">
              This password is shown once — copy it now and share it with the business owner.
            </p>
            <button
              onClick={() => setNewCreds(null)}
              className="mt-2 text-xs font-bold text-emerald-300 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-950 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-8 p-6 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Business name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Admin email</label>
              <input
                type="email"
                required
                value={form.admin_email}
                onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Admin display name (optional)</label>
              <input
                value={form.admin_name}
                onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Shop capacity</label>
              <input
                type="number"
                min={1}
                required
                value={form.shop_capacity}
                onChange={(e) => setForm({ ...form, shop_capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Plan</label>
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm outline-none focus:border-indigo-500"
              >
                <option value="trial">Trial</option>
                <option value="paid">Paid</option>
                <option value="unlimited">Unlimited</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Theme color</label>
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                className="w-16 h-9 rounded-lg bg-slate-800 border border-slate-700"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-bold transition-colors disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create business"}
              </button>
            </div>
          </form>
        )}

        <div className="rounded-2xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Business</th>
                <th className="text-left px-4 py-3">Admin email</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-left px-4 py-3">Shops</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : businesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No businesses yet.
                  </td>
                </tr>
              ) : (
                businesses.map((b) => (
                  <Fragment key={b.id}>
                    <tr className="border-t border-slate-800">
                      <td className="px-4 py-3 font-semibold flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                          style={{ backgroundColor: b.theme?.primary_color || "#6366f1" }}
                        />
                        {b.name}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{b.admin_email}</td>
                      <td className="px-4 py-3 text-slate-300 capitalize">{b.plan}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          defaultValue={b.shop_capacity}
                          onBlur={(e) => updateCapacity(b, Number(e.target.value))}
                          className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs"
                        />
                        <span className="text-slate-500 text-xs ml-1">/ {b.shop_count} used</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            b.is_active ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"
                          }`}
                        >
                          {b.is_active ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex gap-3">
                        <button
                          onClick={() => (editingId === b.id ? setEditingId(null) : startEdit(b))}
                          className="text-xs font-bold text-slate-300 hover:text-white"
                        >
                          {editingId === b.id ? "Cancel" : "Edit"}
                        </button>
                        <button
                          onClick={() => toggleActive(b)}
                          className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
                        >
                          {b.is_active ? "Suspend" : "Reactivate"}
                        </button>
                      </td>
                    </tr>
                    {editingId === b.id && (
                      <tr className="border-t border-slate-800 bg-slate-900/60">
                        <td colSpan={6} className="px-4 py-4">
                          <form onSubmit={saveEdit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 mb-1">Name</label>
                              <input
                                required
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 mb-1">Admin email</label>
                              <input
                                type="email"
                                required
                                value={editForm.admin_email}
                                onChange={(e) => setEditForm({ ...editForm, admin_email: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 mb-1">Logo URL</label>
                              <input
                                placeholder="https://..."
                                value={editForm.logo_url}
                                onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Color</label>
                                <input
                                  type="color"
                                  value={editForm.primary_color}
                                  onChange={(e) => setEditForm({ ...editForm, primary_color: e.target.value })}
                                  className="w-16 h-9 rounded-lg bg-slate-800 border border-slate-700"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-bold transition-colors disabled:opacity-60"
                              >
                                {saving ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
