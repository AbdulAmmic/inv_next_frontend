"use client";

import { useState, useEffect } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import {
  DollarSign,
  Plus,
  Search,
  Calendar,
  Tag,
  Receipt,
  BarChart3,
  Filter,
  Download,
  MoreVertical,
  Edit,
  Trash2,
  X,
  TrendingUp,
  PieChart,
} from "lucide-react";
import {
  getExpenses,
  createExpense,
  getExpenseCategories,
} from "@/apiCalls";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category_id: string;
  category: string;
  date: string;
}

interface Category {
  id: string;
  name: string;
}

interface NewExpense {
  description: string;
  amount: number;
  category_id: string;
  date: string;
}

interface FilterState {
  category: string;
  dateRange: string;
  minAmount: string;
  maxAmount: string;
  sortBy: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeExpense, setActiveExpense] = useState<string | null>(null);

  const [newExpense, setNewExpense] = useState<NewExpense>({
    description: "",
    amount: 0,
    category_id: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [filters, setFilters] = useState<FilterState>({
    category: "all",
    dateRange: "all",
    minAmount: "",
    maxAmount: "",
    sortBy: "date-desc",
  });

  // Fetch expenses and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [expensesRes, categoriesRes] = await Promise.all([
          getExpenses(),
          getExpenseCategories(),
        ]);

        const expensesData = expensesRes.data || [];
        const categoriesData = categoriesRes.data || [];

        const formattedExpenses = expensesData.map((e: any) => ({
          id: e.id?.toString() || Math.random().toString(),
          description: e.description || "No description",
          amount: parseFloat(e.amount) || 0,
          category: e.category_name || e.category || "Uncategorized",
          category_id: e.category_id || "",
          date: e.date || e.created_at || new Date().toISOString(),
        }));

        setExpenses(formattedExpenses);
        setCategories(categoriesData);

        if (categoriesData.length > 0) {
          setNewExpense((prev) => ({
            ...prev,
            category_id: categoriesData[0].id,
          }));
        }
      } catch (err: any) {
        console.error("Failed to fetch data:", err);
        setError(
          err.response?.data?.error ||
            err.message ||
            "Failed to load expenses. Please check if the server is running."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Apply filters and search
  const filteredExpenses = expenses
    .filter((expense) => {
      const matchesSearch = 
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = filters.category === "all" || expense.category_id === filters.category;
      
      const matchesAmount = 
        (!filters.minAmount || expense.amount >= parseFloat(filters.minAmount)) &&
        (!filters.maxAmount || expense.amount <= parseFloat(filters.maxAmount));
      
      const now = new Date();
      const expenseDate = new Date(expense.date);
      
      const matchesDateRange = 
        filters.dateRange === "all" ||
        (filters.dateRange === "today" && expenseDate.toDateString() === now.toDateString()) ||
        (filters.dateRange === "week" && 
          expenseDate >= new Date(now.setDate(now.getDate() - 7))) ||
        (filters.dateRange === "month" && 
          expenseDate >= new Date(now.setMonth(now.getMonth() - 1)));

      return matchesSearch && matchesCategory && matchesAmount && matchesDateRange;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "amount-desc":
          return b.amount - a.amount;
        case "amount-asc":
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

  // Calculate totals BEFORE using them in categoryBreakdown
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  const averageExpense =
    expenses.length > 0 ? totalExpenses / expenses.length : 0;

  // Calculate category breakdown
  const categoryBreakdown = categories.map(category => {
    const categoryExpenses = expenses.filter(exp => exp.category_id === category.id);
    const total = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    return {
      ...category,
      total,
      count: categoryExpenses.length,
      percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0
    };
  }).sort((a, b) => b.total - a.total);

  // Add expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      if (!newExpense.category_id) {
        setError("Please select a category");
        return;
      }

      const payload = {
        category_id: newExpense.category_id,
        amount: newExpense.amount,
        description: newExpense.description,
        date: newExpense.date,
      };

      await createExpense(payload);

      const res = await getExpenses();
      const data = res.data || [];
      const formatted = data.map((e: any) => ({
        id: e.id?.toString(),
        description: e.description || "No description",
        amount: parseFloat(e.amount) || 0,
        category: e.category_name || e.category || "Uncategorized",
        category_id: e.category_id,
        date: e.date || e.created_at || new Date().toISOString(),
      }));

      setExpenses(formatted);
      setShowAddModal(false);
      setNewExpense({
        description: "",
        amount: 0,
        category_id: categories[0]?.id || "",
        date: new Date().toISOString().split("T")[0],
      });
      setSuccess("Expense added successfully!");
    } catch (err: any) {
      console.error("Failed to add expense:", err);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to add expense. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const resetFilters = () => {
    setFilters({
      category: "all",
      dateRange: "all",
      minAmount: "",
      maxAmount: "",
      sortBy: "date-desc",
    });
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex">
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isMobile={false}
      />

      <div className="flex-1 flex flex-col transition-all duration-300">
        <Header />

        <main className="flex-1 p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>



            </div>
          )}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center justify-between">
              <span>{success}</span>
              <button onClick={() => setSuccess("")} className="text-green-500 hover:text-green-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Expenses
              </h1>
              <p className="text-gray-600 mt-2">
                Track and manage your business expenses
              </p>
            </div>
            <div className="flex gap-3 mt-4 lg:mt-0">
              <button className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl border transition-all duration-200 hover:shadow-sm">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-xl transition-all duration-200 hover:shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Add Expense
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Expenses</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(totalExpenses)}
                  </h3>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <DollarSign className="text-blue-600 w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Transactions</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">
                    {expenses.length}
                  </h3>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <Receipt className="text-green-600 w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Average Expense</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(averageExpense)}
                  </h3>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <BarChart3 className="text-purple-600 w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">This Month</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(
                      expenses
                        .filter(exp => {
                          const expDate = new Date(exp.date);
                          const now = new Date();
                          return expDate.getMonth() === now.getMonth() && 
                                 expDate.getFullYear() === now.getFullYear();
                        })
                        .reduce((sum, exp) => sum + exp.amount, 0)
                    )}
                  </h3>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl">
                  <TrendingUp className="text-orange-600 w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Column - Controls and Table */}
            <div className="xl:col-span-2 space-y-6">
              {/* Search and Filters */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search expenses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-colors"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                        showFilters 
                          ? "bg-blue-50 border-blue-200 text-blue-700" 
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      Filters
                      {Object.values(filters).some(val => val !== "all" && val !== "date-desc" && val !== "") && (
                        <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {Object.values(filters).filter(val => val !== "all" && val !== "date-desc" && val !== "").length}
                        </span>
                      )}
                    </button>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                      className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    >
                      <option value="date-desc">Newest First</option>
                      <option value="date-asc">Oldest First</option>
                      <option value="amount-desc">Highest Amount</option>
                      <option value="amount-asc">Lowest Amount</option>
                    </select>
                  </div>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category
                        </label>
                        <select
                          value={filters.category}
                          onChange={(e) => setFilters({...filters, category: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All Categories</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date Range
                        </label>
                        <select
                          value={filters.dateRange}
                          onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All Time</option>
                          <option value="today">Today</option>
                          <option value="week">Last 7 Days</option>
                          <option value="month">Last 30 Days</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Min Amount
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={filters.minAmount}
                          onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Amount
                        </label>
                        <input
                          type="number"
                          placeholder="Any"
                          value={filters.maxAmount}
                          onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <button
                        onClick={resetFilters}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Expenses Table */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                          Description
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                          Category
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                          Date
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                            <p className="mt-3 text-gray-500 font-medium">Loading expenses...</p>
                          </td>
                        </tr>
                      ) : filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <Receipt className="w-12 h-12 text-gray-300 mb-3" />
                              <p className="text-gray-500 font-medium">No expenses found</p>
                              <p className="text-sm text-gray-400 mt-1">
                                {searchQuery || Object.values(filters).some(f => f !== "all" && f !== "date-desc") 
                                  ? "Try adjusting your search or filters" 
                                  : "Get started by adding your first expense"}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredExpenses.map((expense) => (
                          <tr key={expense.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                {expense.description}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-gray-700">{expense.category}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-gray-900">
                                {formatCurrency(expense.amount)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="w-4 h-4" />
                                {formatDate(expense.date)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="relative">
                                <button
                                  onClick={() => setActiveExpense(activeExpense === expense.id ? null : expense.id)}
                                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <MoreVertical className="w-4 h-4 text-gray-400" />
                                </button>
                                {activeExpense === expense.id && (
                                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                      <Edit className="w-4 h-4" />
                                      Edit
                                    </button>
                                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column - Analytics */}
            <div className="space-y-6">
              {/* Category Breakdown */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Category Breakdown</h3>
                  <PieChart className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-4">
                  {categoryBreakdown.slice(0, 5).map((category) => (
                    <div key={category.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">{category.name}</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(category.total)} ({category.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${category.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Filtered Results</span>
                    <span className="font-semibold text-gray-900">{filteredExpenses.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Filtered Total</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Categories Used</span>
                    <span className="font-semibold text-gray-900">
                      {new Set(filteredExpenses.map(exp => exp.category_id)).size}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md transform transition-all duration-300 scale-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Add New Expense
              </h3>
              <button
                onClick={() => !submitting && setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={submitting}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  value={newExpense.description}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="What was this expense for?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={newExpense.category_id}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      category_id: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₦) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={newExpense.amount || ""}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, date: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 disabled:opacity-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200 disabled:opacity-50 font-medium shadow-sm hover:shadow-md"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Adding...
                    </div>
                  ) : (
                    "Add Expense"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}