"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Eye, Printer, ShoppingBag, RefreshCw, Download, Filter,
  TrendingUp, DollarSign, TrendingDown, BarChart3, Search,
  User, Users, CreditCard, Package, Calendar, Clock,
  ArrowUpDown, XCircle, CheckCircle
} from "lucide-react";
import { getSales, getSale, getUsers } from "@/apiCalls";
import ReceiptComponent from "@/components/ReceiptComponent";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";

interface Sale {
  id: string;
  sale_number: string;
  shop_name: string;
  staff_name: string;
  customer_name: string;
  amount: number;
  payment_method: string;
  item_count: number;
  created_at_display: string;
  status: string;
  created_at: string;
}

interface FilterState {
  search: string;
  customer: string;
  staff: string;
  payment_method: string;
  status: string;
  startDate: string;
  endDate: string;
}

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [staffList, setStaffList] = useState<string[]>([]);  // Store staff names for filter
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc'
  });

  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    customer: "all",
    staff: "all",
    payment_method: "all",
    status: "all",
    startDate: "",
    endDate: ""
  });

  const handleViewReceipt = async (saleId: string) => {
    try {
      const res = await getSale(saleId);
      if (res.data) {
        const saleData = {
          ...res.data.sale,
          items: res.data.items,
          total: res.data.sale.total_amount,
          discount: res.data.sale.discount_amount,
        };
        setSelectedReceipt(saleData);
      }
    } catch (err) {
      console.error("Failed to fetch sale details", err);
      alert("Could not load receipt details.");
    }
  };

  // Mock data for dropdowns (in real app, fetch from API)
  const customers = ["All Customers", "John Doe", "Jane Smith", "Mike Johnson", "Sarah Williams", "Walk-in"];
  // staffMembers removed in favor of dynamic staffList
  const paymentMethods = ["All Methods", "Cash", "Card", "Transfer", "POS"];
  const statuses = ["All Status", "completed", "refunded", "pending"];

  const fetchSales = async (shopId: string) => {
    try {
      setLoading(true);
      const res = await getSales(shopId);
      const data = res.data.data || [];

      const cleaned = data.map((s: any) => {
        const isReturned = s.status === "refunded";

        return {
          id: s.id,
          sale_number: s.sale_number,
          shop_name: s.shop_name,
          staff_name: s.staff_name,
          customer_name: s.customer_name,
          amount: isReturned ? -Math.abs(s.total_amount || 0) : s.total_amount || 0,
          payment_method: s.payment_method,
          item_count: s.item_count,
          created_at_display: s.created_at ? new Date(s.created_at).toLocaleString() : "Unknown",
          status: s.status,
          created_at: s.created_at
        };
      });

      setSales(cleaned);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await getUsers();
      if (res.data && Array.isArray(res.data)) {
        // Extract unique names
        const names = Array.from(new Set(res.data.map((u: any) => u.full_name))).filter(Boolean) as string[];
        setStaffList(names);
      }
    } catch (err) {
      console.error("Failed to load staff list", err);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (selectedShop) {
      fetchSales(selectedShop);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredSales = sales.filter(sale => {
    // Search filter
    if (filters.search && !sale.sale_number.toLowerCase().includes(filters.search.toLowerCase()) &&
      !sale.customer_name?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    // Customer filter
    if (filters.customer !== "all" && filters.customer !== "all_customers") {
      if (filters.customer === "walk_in") {
        if (sale.customer_name && sale.customer_name.toLowerCase() !== "walk-in") return false;
      } else {
        if (sale.customer_name !== filters.customer) return false;
      }
    }

    // Staff filter
    if (filters.staff !== "all" && sale.staff_name !== filters.staff) {
      return false;
    }

    // Payment method filter
    if (filters.payment_method !== "all" && sale.payment_method !== filters.payment_method) {
      return false;
    }

    // Status filter
    if (filters.status !== "all" && sale.status !== filters.status) {
      return false;
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      const saleDate = new Date(sale.created_at);

      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        if (saleDate < startDate) return false;
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (saleDate > endDate) return false;
      }
    }

    return true;
  });

  const sortedSales = [...filteredSales].sort((a, b) => {
    if (sortConfig.key === 'amount') {
      return sortConfig.direction === 'asc'
        ? a.amount - b.amount
        : b.amount - a.amount;
    }

    if (sortConfig.key === 'created_at') {
      return sortConfig.direction === 'asc'
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }

    if (sortConfig.key === 'item_count') {
      return sortConfig.direction === 'asc'
        ? a.item_count - b.item_count
        : b.item_count - a.item_count;
    }

    return 0;
  });

  useEffect(() => {
    const shopId = localStorage.getItem("selected_shop_id");
    setSelectedShop(shopId);

    fetchStaff(); // Fetch staff list on mount

    if (shopId) {
      fetchSales(shopId);
    } else {
      setLoading(false);
    }
  }, []);

  // Calculate summary stats
  const totalSales = filteredSales.reduce((sum, sale) => sale.amount > 0 ? sum + sale.amount : sum, 0);
  const totalRefunds = filteredSales.reduce((sum, sale) => sale.amount < 0 ? sum + Math.abs(sale.amount) : sum, 0);
  const netAmount = totalSales - totalRefunds;
  const averageSale = filteredSales.length > 0 ? totalSales / filteredSales.length : 0;

  if (!selectedShop) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 p-6">
          <div className="max-w-md text-center">
            <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Shop Selected</h2>
            <p className="text-gray-500">Please select a shop from the header to view sales records.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading sales records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">
      {selectedReceipt && (
        <ReceiptComponent
          sale={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
      <Sidebar isOpen={true} toggleSidebar={() => { }} isMobile={false} />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                    <ShoppingBag className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Sales Records</h1>
                    <p className="text-gray-600 mt-1">
                      Showing sales for: <span className="font-semibold text-blue-600">{selectedShop}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>

                <button className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md">
                  <Download className="w-4 h-4" />
                  Export
                </button>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Filter className="w-4 h-4" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium mb-1">Total Sales</p>
                    <p className="text-2xl font-bold">₦{totalSales.toLocaleString()}</p>
                    <p className="text-green-100 text-xs mt-2">+{filteredSales.length} transactions</p>
                  </div>
                  <TrendingUp className="w-10 h-10 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">Net Amount</p>
                    <p className="text-2xl font-bold">₦{netAmount.toLocaleString()}</p>
                    <p className="text-blue-100 text-xs mt-2">After refunds</p>
                  </div>
                  <DollarSign className="w-10 h-10 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm font-medium mb-1">Total Refunds</p>
                    <p className="text-2xl font-bold">₦{totalRefunds.toLocaleString()}</p>
                    <p className="text-amber-100 text-xs mt-2">{filteredSales.filter(s => s.amount < 0).length} returns</p>
                  </div>
                  <TrendingDown className="w-10 h-10 opacity-80" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium mb-1">Avg. Sale</p>
                    <p className="text-2xl font-bold">₦{averageSale.toLocaleString()}</p>
                    <p className="text-purple-100 text-xs mt-2">Per transaction</p>
                  </div>
                  <BarChart3 className="w-10 h-10 opacity-80" />
                </div>
              </div>
            </div>

            {/* Filters Section */}
            {showFilters && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 animate-in fade-in-0 slide-in-from-top-2">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Filter Sales</h3>
                  <button
                    onClick={() => setFilters({
                      search: "",
                      customer: "all",
                      staff: "all",
                      payment_method: "all",
                      status: "all",
                      startDate: "",
                      endDate: ""
                    })}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search sales..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Customer Filter */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-gray-500" />
                      <label className="text-sm font-medium text-gray-700">Customer</label>
                    </div>
                    <select
                      value={filters.customer}
                      onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="all">All Customers</option>
                      <option value="walk_in">Walk-in Only</option>
                      {customers.filter(c => c !== "All Customers").map(customer => (
                        <option key={customer} value={customer}>{customer}</option>
                      ))}
                    </select>
                  </div>

                  {/* Staff Filter */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-gray-500" />
                      <label className="text-sm font-medium text-gray-700">Staff</label>
                    </div>
                    <select
                      value={filters.staff}
                      onChange={(e) => setFilters({ ...filters, staff: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="all">All Staff</option>
                      {staffList.map((staff) => (
                        <option key={staff} value={staff}>
                          {staff}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-4 h-4 text-gray-500" />
                      <label className="text-sm font-medium text-gray-700">Payment</label>
                    </div>
                    <select
                      value={filters.payment_method}
                      onChange={(e) => setFilters({ ...filters, payment_method: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="all">All Methods</option>
                      {paymentMethods.filter(p => p !== "All Methods").map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Status Filter */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-4 h-4 text-gray-500" />
                      <label className="text-sm font-medium text-gray-700">Status</label>
                    </div>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      {statuses.map(status => (
                        <option key={status} value={status === "All Status" ? "all" : status}>
                          {status === "completed" ? "Completed" :
                            status === "refunded" ? "Refunded" :
                              status === "pending" ? "Pending" : status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <label className="text-sm font-medium text-gray-700">From Date</label>
                    </div>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <label className="text-sm font-medium text-gray-700">To Date</label>
                    </div>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Results Count */}
                  <div className="flex items-end">
                    <div className="w-full px-4 py-3 bg-blue-50 rounded-xl">
                      <p className="text-sm text-gray-600">Showing</p>
                      <p className="text-lg font-bold text-blue-600">
                        {filteredSales.length} of {sales.length} sales
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sales Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Sales Transactions</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Sorted by: {sortConfig.key.replace('_', ' ')} ({sortConfig.direction})</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-left">
                        <button
                          onClick={() => handleSort('sale_number')}
                          className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900"
                        >
                          Sale #
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Staff</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Customer</th>
                      <th className="p-4 text-left">
                        <button
                          onClick={() => handleSort('amount')}
                          className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900"
                        >
                          Amount
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Payment</th>
                      <th className="p-4 text-left">
                        <button
                          onClick={() => handleSort('item_count')}
                          className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900"
                        >
                          Items
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="p-4 text-left">
                        <button
                          onClick={() => handleSort('created_at')}
                          className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900"
                        >
                          Date
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {sortedSales.length > 0 ? (
                      sortedSales.map((sale) => (
                        <tr
                          key={sale.id}
                          className="hover:bg-gray-50 transition-colors group"
                        >
                          <td className="p-4">
                            <div className="font-semibold text-gray-900">{sale.sale_number}</div>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Users className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="text-gray-700">{sale.staff_name}</span>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-green-600" />
                              </div>
                              <span className="text-gray-700">
                                {sale.customer_name || (
                                  <span className="text-gray-400">Walk-in</span>
                                )}
                              </span>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className={`font-semibold flex items-center gap-1 ${sale.amount < 0 ? "text-red-600" : "text-gray-900"
                              }`}>
                              {sale.amount < 0 ? (
                                <TrendingDown className="w-4 h-4" />
                              ) : (
                                <TrendingUp className="w-4 h-4" />
                              )}
                              ₦{Math.abs(sale.amount).toLocaleString()}
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">{sale.payment_method}</span>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">{sale.item_count}</span>
                            </div>
                          </td>

                          <td className="p-4">
                            {sale.status === "refunded" ? (
                              <div className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                  Returned
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Completed
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="p-4">
                            <div className="text-gray-600 text-sm">{sale.created_at_display}</div>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => router.push(`/dashboard/sales/${sale.id}`)}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </button>
                              <button
                                onClick={() => handleViewReceipt(sale.id)}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                <Printer className="w-4 h-4" />
                                Receipt
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="p-8 text-center">
                          <div className="max-w-sm mx-auto">
                            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h4 className="text-lg font-semibold text-gray-700 mb-2">No sales found</h4>
                            <p className="text-gray-500 mb-4">
                              {filters.search || filters.customer !== "all" || filters.staff !== "all"
                                ? "Try adjusting your filters to see more results."
                                : "No sales records available for this shop."}
                            </p>
                            {(filters.search || filters.customer !== "all" || filters.staff !== "all") && (
                              <button
                                onClick={() => setFilters({
                                  search: "",
                                  customer: "all",
                                  staff: "all",
                                  payment_method: "all",
                                  status: "all",
                                  startDate: "",
                                  endDate: ""
                                })}
                                className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                Clear Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              {sortedSales.length > 0 && (
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-semibold">{sortedSales.length}</span> of{" "}
                      <span className="font-semibold">{sales.length}</span> sales
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-600">
                        Total: <span className="font-bold text-gray-900">₦{netAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                          Previous
                        </button>
                        <span className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg">
                          1
                        </span>
                        <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}