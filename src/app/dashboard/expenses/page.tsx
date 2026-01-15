"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboardLayout";
import {
  getExpenses,
  createExpense,
  getExpenseCategories,
  getShops,
  deleteExpense,
} from "@/apiCalls";
import { toast } from "react-toastify";
import {
  Plus,
  Search,
  Loader2,
  Trash2,
  Eye,
  X,
} from "lucide-react";

interface Expense {
  id: string;
  shop_id: string;
  category_id: string;
  category_name?: string; // New
  user_name?: string;     // New
  amount: number;
  description: string;
  reference?: string;
  date: string;
}

interface Category {
  id: string;
  name: string;
}

interface Shop {
  id: string;
  name: string;
}

export default function ExpensesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [newExpense, setNewExpense] = useState({
    shop_id: "",
    category_id: "",
    amount: "",
    description: "",
    reference: "",
    date: new Date().toISOString().split("T")[0],
  });

  /* ---------------- LOAD DATA ---------------- */
  const loadData = async () => {
    try {
      const [exp, cat, shp] = await Promise.all([
        getExpenses(),
        getExpenseCategories(),
        getShops(),
      ]);
      setExpenses(exp.data);
      setCategories(cat.data);
      setShops(shp.data);
    } catch {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ---------------- CREATE EXPENSE ---------------- */
  const handleCreateExpense = async () => {
    if (
      !newExpense.shop_id ||
      !newExpense.category_id ||
      !newExpense.amount ||
      !newExpense.date
    ) {
      toast.error("All required fields must be filled");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createExpense({
        ...newExpense,
        amount: Number(newExpense.amount),
      });

      // The backend response might not have category_name/user_name immediately populated 
      // depending on how the create endpoint returns it, but let's try to patch it locally or reload
      // Ideally backend returns full object. For now we reload to be safe and get joined names.
      // or we manually patch:
      const catName = categories.find(c => c.id === newExpense.category_id)?.name;
      const created = {
        ...res.data,
        category_name: catName,
        user_name: "Me" // temporary until reload
      };

      setExpenses((prev) => [created, ...prev]);
      toast.success("Expense recorded");
      setShowModal(false);

      // Reset form
      setNewExpense({
        shop_id: "",
        category_id: "",
        amount: "",
        description: "",
        reference: "",
        date: new Date().toISOString().split("T")[0],
      });

      // Reload to get perfect data
      loadData();

    } catch {
      toast.error("Failed to save expense");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- DELETE ---------------- */
  const confirmDeleteExpense = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteExpense(deleteId);
      setExpenses((prev) => prev.filter((e) => e.id !== deleteId));
      toast.success("Expense deleted");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete expense");
    } finally {
      setDeleting(false);
    }
  };

  /* ---------------- FILTER ---------------- */
  const filteredExpenses = expenses.filter((e) => {
    const shopName = shops.find((s) => s.id === e.shop_id)?.name || "";
    const catName = categories.find((c) => c.id === e.category_id)?.name || "";

    const matchesSearch =
      e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shopName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      !filterCategory || e.category_id === filterCategory;

    const expenseDate = new Date(e.date);
    const matchesFrom = !fromDate || expenseDate >= new Date(fromDate);
    const matchesTo = !toDate || expenseDate <= new Date(toDate);

    return matchesSearch && matchesCategory && matchesFrom && matchesTo;
  });

  const totalExpenses = filteredExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  /* ---------------- HELPER ---------------- */
  const handleViewDetails = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowDetailsModal(true);
  };

  // Color map for categories (simple hash or static)
  const getCategoryBadgeColor = (name: string = "") => {
    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-green-100 text-green-700",
      "bg-purple-100 text-purple-700",
      "bg-orange-100 text-orange-700",
      "bg-pink-100 text-pink-700",
      "bg-teal-100 text-teal-700",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <main className="p-4 lg:p-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Expenses</h1>
            <p className="text-gray-600 text-sm lg:text-base">
              Track and manage shop expenses
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition w-full md:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            New Expense
          </button>
        </div>

        {/* STATS */}
        <div className="bg-white p-6 rounded-xl mb-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Total Expenses (Filtered)</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ₦{totalExpenses.toLocaleString()}
          </p>
        </div>

        {/* FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="pl-10 pr-4 py-3 border rounded-xl w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border p-3 rounded-xl w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border rounded-xl px-3 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border rounded-xl px-3 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 text-left font-semibold text-gray-600 whitespace-nowrap">Shop</th>
                  <th className="p-4 text-left font-semibold text-gray-600 whitespace-nowrap">Category</th>
                  <th className="p-4 text-left font-semibold text-gray-600 whitespace-nowrap">Description</th>
                  <th className="p-4 text-left font-semibold text-gray-600 whitespace-nowrap">Amount</th>
                  <th className="p-4 text-left font-semibold text-gray-600 whitespace-nowrap">Date</th>
                  <th className="p-4 text-right font-semibold text-gray-600 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No expenses found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((e) => {
                    const catName = categories.find(c => c.id === e.category_id)?.name || e.category_name || "Uncategorized";

                    return (
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-sm text-gray-700 whitespace-nowrap">
                          {shops.find((s) => s.id === e.shop_id)?.name}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryBadgeColor(catName)}`}>
                            {catName}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-600 max-w-xs truncate">
                          {e.description || "-"}
                        </td>
                        <td className="p-4 text-sm font-bold text-gray-900 whitespace-nowrap">
                          ₦{Number(e.amount).toLocaleString()}
                        </td>
                        <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(e.date).toLocaleDateString("en-NG")}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleViewDetails(e)}
                              className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(e.id)}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* DELETE MODAL */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-lg mb-2">Delete Expense</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this expense?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExpense}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {showDetailsModal && selectedExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Expense Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="p-1 hover:bg-gray-200 rounded-full transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Amount</p>
                  <p className="text-2xl font-bold text-gray-900">₦{selectedExpense.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Date</p>
                  <p className="text-lg text-gray-800">{new Date(selectedExpense.date).toLocaleDateString("en-NG", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Category</p>
                  <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryBadgeColor(selectedExpense.category_name || categories.find(c => c.id === selectedExpense.category_id)?.name)}`}>
                    {selectedExpense.category_name || categories.find(c => c.id === selectedExpense.category_id)?.name || "Uncategorized"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Shop</p>
                  <p className="text-base text-gray-800 font-medium">{shops.find(s => s.id === selectedExpense.shop_id)?.name}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-gray-500 uppercase font-semibold">Description</p>
                <p className="text-gray-700 mt-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {selectedExpense.description || "No description provided."}
                </p>
              </div>

              {selectedExpense.reference && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Reference / Receipt No.</p>
                  <p className="text-gray-800 font-mono mt-1">{selectedExpense.reference}</p>
                </div>
              )}

              <div className="border-t pt-4 flex justify-between items-center text-sm text-gray-500">
                <span>Recorded by: <span className="font-medium text-gray-800">{selectedExpense.user_name || "Unknown"}</span></span>
                <span>ID: {selectedExpense.id.slice(0, 8)}</span>
              </div>

            </div>
            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-5 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
              >
                Close
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ADD EXPENSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">New Expense</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <select
                className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                value={newExpense.shop_id}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, shop_id: e.target.value })
                }
              >
                <option value="">Select Shop*</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                value={newExpense.category_id}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, category_id: e.target.value })
                }
              >
                <option value="">Select Category*</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={newExpense.date}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, date: e.target.value })
                }
              />

              <input
                type="number"
                placeholder="Amount (₦)*"
                className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={newExpense.amount}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, amount: e.target.value })
                }
              />

              <textarea
                placeholder="Description"
                className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none h-24 resize-none"
                value={newExpense.description}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, description: e.target.value })
                }
              />

              <input
                type="text"
                placeholder="Reference / Receipt No. (Optional)"
                className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={newExpense.reference}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, reference: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateExpense}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Saving..." : "Save Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

