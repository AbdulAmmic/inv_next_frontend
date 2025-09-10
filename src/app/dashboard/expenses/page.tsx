"use client";

import { useState, useEffect } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Menu, DollarSign, Edit, Trash2, Plus, X, Search, Calendar, FileText, Tag } from "lucide-react";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  receipt: boolean;
}

const initialExpenses: Expense[] = [
  { id: "1", description: "Office supplies purchase", amount: 245.67, category: "Office Supplies", date: "2023-10-15", status: "Approved", receipt: true },
  { id: "2", description: "Team lunch meeting", amount: 156.89, category: "Meals & Entertainment", date: "2023-10-18", status: "Pending", receipt: false },
  { id: "3", description: "Software subscription renewal", amount: 499.00, category: "Software", date: "2023-10-05", status: "Approved", receipt: true },
  { id: "4", description: "Business travel expenses", amount: 1245.32, category: "Travel", date: "2023-09-22", status: "Approved", receipt: true },
  { id: "5", description: "Marketing materials", amount: 350.00, category: "Marketing", date: "2023-10-20", status: "Rejected", receipt: true },
];

const expenseCategories = [
  "Office Supplies",
  "Meals & Entertainment",
  "Software",
  "Travel",
  "Marketing",
  "Utilities",
  "Equipment",
  "Other"
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>(initialExpenses);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newExpense, setNewExpense] = useState({ 
    description: "", 
    amount: 0, 
    category: "", 
    date: new Date().toISOString().split('T')[0], 
    status: "Pending" as const, 
    receipt: false 
  });
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");

  // Filter expenses based on search query and status filter
  useEffect(() => {
    let filtered = expenses.filter(expense => 
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (statusFilter !== "All") {
      filtered = filtered.filter(expense => expense.status === statusFilter);
    }
    
    setFilteredExpenses(filtered);
  }, [searchQuery, expenses, statusFilter]);

  const toggleSidebar = () => setIsSidebarOpen(v => !v);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const newExp = {
      id: Math.random().toString(36).substr(2, 9),
      ...newExpense,
      amount: parseFloat(newExpense.amount.toString())
    };
    setExpenses([...expenses, newExp]);
    setNewExpense({ 
      description: "", 
      amount: 0, 
      category: "", 
      date: new Date().toISOString().split('T')[0], 
      status: "Pending", 
      receipt: false 
    });
    setShowAdd(false);
  };

  const handleEditExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    
    setExpenses(expenses.map(expense => 
      expense.id === editingExpense.id ? editingExpense : expense
    ));
    setEditingExpense(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      setExpenses(expenses.filter(e => e.id !== id));
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Approved": return "bg-green-100 text-green-800";
      case "Pending": return "bg-yellow-100 text-yellow-800";
      case "Rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const pendingExpenses = expenses
    .filter(e => e.status === "Pending")
    .reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} isMobile={false} />
      <div className="flex-1 flex flex-col transition-all duration-300">
        <Header />
        <main className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
            <div className="flex items-center">
              <button
                onClick={toggleSidebar}
                className="mr-3 p-2 rounded-lg bg-white border border-gray-200 shadow-sm lg:hidden"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
            </div>
            
            <div className="flex-1 flex flex-col md:flex-row gap-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Expense
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
                <DollarSign className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-800 mt-2">{formatCurrency(totalExpenses)}</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">Pending Approval</h3>
                <FileText className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-gray-800 mt-2">{formatCurrency(pendingExpenses)}</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">Total Records</h3>
                <Tag className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-800 mt-2">{expenses.length}</p>
            </div>
          </div>

          {/* Add Expense Modal */}
          {showAdd && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Add Expense</h2>
                  <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-gray-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Description</label>
                    <input
                      type="text"
                      value={newExpense.description}
                      onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newExpense.amount}
                        onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">Date</label>
                      <input
                        type="date"
                        value={newExpense.date}
                        onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Category</label>
                    <select
                      value={newExpense.category}
                      onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select a category</option>
                      {expenseCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="receipt"
                      checked={newExpense.receipt}
                      onChange={e => setNewExpense({ ...newExpense, receipt: e.target.checked })}
                      className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="receipt" className="text-sm text-gray-700">
                      I have a receipt for this expense
                    </label>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAdd(false)}
                      className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      Add Expense
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Expense Modal */}
          {editingExpense && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Edit Expense</h2>
                  <button onClick={() => setEditingExpense(null)} className="p-1 rounded-lg hover:bg-gray-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleEditExpense} className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Description</label>
                    <input
                      type="text"
                      value={editingExpense.description}
                      onChange={e => setEditingExpense({ ...editingExpense, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingExpense.amount}
                        onChange={e => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">Date</label>
                      <input
                        type="date"
                        value={editingExpense.date}
                        onChange={e => setEditingExpense({ ...editingExpense, date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Category</label>
                    <select
                      value={editingExpense.category}
                      onChange={e => setEditingExpense({ ...editingExpense, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      {expenseCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Status</label>
                    <select
                      value={editingExpense.status}
                      onChange={e => setEditingExpense({ 
                        ...editingExpense, 
                        status: e.target.value as 'Pending' | 'Approved' | 'Rejected' 
                      })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="edit-receipt"
                      checked={editingExpense.receipt}
                      onChange={e => setEditingExpense({ ...editingExpense, receipt: e.target.checked })}
                      className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="edit-receipt" className="text-sm text-gray-700">
                      Receipt available
                    </label>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingExpense(null)}
                      className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Expenses Table */}
          {filteredExpenses.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">{expense.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(expense.date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatCurrency(expense.amount)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(expense.status)}`}>
                            {expense.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {expense.receipt ? (
                            <span className="text-green-600 text-sm">Available</span>
                          ) : (
                            <span className="text-gray-400 text-sm">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setEditingExpense(expense)}
                              className="p-2 rounded-lg hover:bg-gray-100 text-blue-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 rounded-lg hover:bg-gray-100 text-red-600 transition-colors"
                              onClick={() => handleDelete(expense.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No expenses found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || statusFilter !== "All" ? "Try adjusting your search or filter criteria" : "Get started by adding a new expense"}
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Expense
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}