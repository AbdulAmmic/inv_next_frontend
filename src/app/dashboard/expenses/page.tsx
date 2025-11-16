"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import {
  getExpenses,
  createExpense,
  getExpenseCategories,
  getShops,
} from "@/apiCalls";
import { toast } from "react-toastify";
import {
  Plus,
  Receipt,
  Tag,
  Wallet,
  Store,
  Calendar,
  Search,
  Filter,
  Download,
  MoreVertical,
  Loader2,
  TrendingUp,
} from "lucide-react";

interface Expense {
  id: string;
  shop_id: string;
  category_id: string;
  amount: string;
  description: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  color?: string;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedShop, setSelectedShop] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [newExpense, setNewExpense] = useState({
    shop_id: "",
    category_id: "",
    amount: "",
    description: "",
  });

  // Load data
  const loadData = async () => {
    try {
      const [expRes, catRes, shopRes] = await Promise.all([
        getExpenses(),
        getExpenseCategories(),
        getShops(),
      ]);

      setExpenses(expRes.data);
      setCategories(catRes.data);
      setShops(shopRes.data);
    } catch (error) {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Create expense
  const handleCreateExpense = async () => {
    if (!newExpense.shop_id || !newExpense.category_id || !newExpense.amount) {
      toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        shop_id: newExpense.shop_id,
        category_id: newExpense.category_id,
        amount: Number(newExpense.amount),
        description: newExpense.description || "",
      };

      const res = await createExpense(payload);
      setExpenses((prev) => [res.data, ...prev]);
      toast.success("Expense recorded successfully");

      setShowModal(false);
      setNewExpense({
        shop_id: "",
        category_id: "",
        amount: "",
        description: "",
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter expenses
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      shops.find((s) => s.id === expense.shop_id)?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !selectedCategory || expense.category_id === selectedCategory;
    const matchesShop = !selectedShop || expense.shop_id === selectedShop;

    return matchesSearch && matchesCategory && matchesShop;
  });

  // Calculate total
  const totalExpenses = filteredExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isMobile={false}
      />

      <div className="flex-1 flex flex-col transition-all duration-300">
        <Header />

        <main className="p-6 lg:p-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Expenses
                </h1>
                <p className="text-gray-600 text-lg">
                  Monitor and record shop expenses
                </p>
              </div>

              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold group"
              >
                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                New Expense
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      ₦{totalExpenses.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">This Month</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      ₦{expenses
                        .filter(e => new Date(e.created_at).getMonth() === new Date().getMonth())
                        .reduce((sum, e) => sum + Number(e.amount), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Records</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {expenses.length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <Receipt className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search expenses or shops..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">All Shops</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-6 font-semibold text-gray-900">Shop</th>
                    <th className="text-left p-6 font-semibold text-gray-900">Category</th>
                    <th className="text-left p-6 font-semibold text-gray-900">Amount</th>
                    <th className="text-left p-6 font-semibold text-gray-900">Description</th>
                    <th className="text-left p-6 font-semibold text-gray-900">Date</th>
                    <th className="p-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Store className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">
                            {shops.find((s) => s.id === expense.shop_id)?.name || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {categories.find((c) => c.id === expense.category_id)?.name || "—"}
                        </span>
                      </td>
                      <td className="p-6">
                        <span className="font-semibold text-red-600 text-lg">
                          ₦{Number(expense.amount).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-6">
                        <p className="text-gray-700 max-w-xs truncate">
                          {expense.description || "—"}
                        </p>
                      </td>
                      <td className="p-6">
                        <div className="text-gray-600">
                          <div className="font-medium">
                            {new Date(expense.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-sm">
                            {new Date(expense.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredExpenses.length === 0 && (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No expenses found</p>
                <p className="text-gray-400 mt-1">
                  {expenses.length === 0 ? "Get started by recording your first expense" : "Try adjusting your filters"}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in fade-in duration-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Record New Expense</h2>
              <p className="text-gray-600 mt-1">Add expense details below</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Shop */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop *
                </label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200">
                  <Store className="text-gray-400 w-5 h-5 mr-3" />
                  <select
                    value={newExpense.shop_id}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        shop_id: e.target.value,
                      })
                    }
                    className="flex-1 bg-transparent outline-none text-gray-900"
                  >
                    <option value="">Select shop</option>
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expense Category *
                </label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200">
                  <Tag className="text-gray-400 w-5 h-5 mr-3" />
                  <select
                    value={newExpense.category_id}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        category_id: e.target.value,
                      })
                    }
                    className="flex-1 bg-transparent outline-none text-gray-900"
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200">
                  <Wallet className="text-gray-400 w-5 h-5 mr-3" />
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newExpense.amount}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        amount: e.target.value,
                      })
                    }
                    className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newExpense.description}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      description: e.target.value,
                    })
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                  rows={3}
                  placeholder="Add any additional details..."
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors duration-200"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateExpense}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Expense"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}