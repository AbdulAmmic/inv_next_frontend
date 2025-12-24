"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
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
  Calendar,
} from "lucide-react";

interface Expense {
  id: string;
  shop_id: string;
  category_id: string;
  amount: number;
  description: string;
  date: string; // ✅ backend-compliant
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

  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [newExpense, setNewExpense] = useState({
    shop_id: "",
    category_id: "",
    amount: "",
    description: "",
    date: "",
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

      setExpenses((prev) => [res.data, ...prev]);
      toast.success("Expense recorded");
      setShowModal(false);
      setNewExpense({
        shop_id: "",
        category_id: "",
        amount: "",
        description: "",
        date: "",
      });
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
    const shopName =
      shops.find((s) => s.id === e.shop_id)?.name || "";

    const matchesSearch =
      e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shopName.toLowerCase().includes(searchTerm.toLowerCase());

    const expenseDate = new Date(e.date);

    const matchesFrom =
      !fromDate || expenseDate >= new Date(fromDate);

    const matchesTo =
      !toDate || expenseDate <= new Date(toDate);

    return matchesSearch && matchesFrom && matchesTo;
  });

  const totalExpenses = filteredExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isMobile={false}
      />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-6 lg:p-8">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Expenses</h1>
              <p className="text-gray-600">
                Track and manage shop expenses
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl"
            >
              <Plus className="w-5 h-5" />
              New Expense
            </button>
          </div>

          {/* STATS */}
          <div className="bg-white p-6 rounded-xl mb-6">
            <p className="text-sm text-gray-600">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600">
              ₦{totalExpenses.toLocaleString()}
            </p>
          </div>

          {/* FILTERS */}
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search expenses or shops"
                className="pl-10 pr-4 py-3 border rounded-xl w-full"
              />
            </div>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border rounded-xl px-3 py-3"
            />

            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border rounded-xl px-3 py-3"
            />
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-4 text-left">Shop</th>
                  <th className="p-4 text-left">Category</th>
                  <th className="p-4 text-left">Amount</th>
                  <th className="p-4 text-left">Date</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-4">
                      {shops.find((s) => s.id === e.shop_id)?.name}
                    </td>
                    <td className="p-4">
                      {categories.find((c) => c.id === e.category_id)?.name}
                    </td>
                    <td className="p-4 text-red-600 font-semibold">
                      ₦{Number(e.amount).toLocaleString()}
                    </td>
                    <td className="p-4">
                      {new Date(e.date).toLocaleDateString("en-NG")}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setDeleteId(e.id)}
                        className="p-2 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* DELETE MODAL */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-bold mb-2">Delete Expense</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this expense?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExpense}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD EXPENSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold">New Expense</h2>

            <select
              className="w-full border p-3 rounded-xl"
              value={newExpense.shop_id}
              onChange={(e) =>
                setNewExpense({ ...newExpense, shop_id: e.target.value })
              }
            >
              <option value="">Select Shop</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              className="w-full border p-3 rounded-xl"
              value={newExpense.category_id}
              onChange={(e) =>
                setNewExpense({ ...newExpense, category_id: e.target.value })
              }
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              className="w-full border p-3 rounded-xl"
              value={newExpense.date}
              onChange={(e) =>
                setNewExpense({ ...newExpense, date: e.target.value })
              }
            />

            <input
              type="number"
              placeholder="Amount"
              className="w-full border p-3 rounded-xl"
              value={newExpense.amount}
              onChange={(e) =>
                setNewExpense({ ...newExpense, amount: e.target.value })
              }
            />

            <textarea
              placeholder="Description (optional)"
              className="w-full border p-3 rounded-xl"
              value={newExpense.description}
              onChange={(e) =>
                setNewExpense({ ...newExpense, description: e.target.value })
              }
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateExpense}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                {submitting ? "Saving..." : "Save Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
