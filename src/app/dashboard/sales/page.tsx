"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Eye, Printer, ShoppingBag, RefreshCw, Download, Filter,
  TrendingUp, DollarSign, TrendingDown, BarChart3, Search,
  User, Users, CreditCard, Package, Calendar, Clock,
  ArrowUpDown, XCircle, CheckCircle, ChevronDown, Trash2
} from "lucide-react";
import { getSales, getSale, getUsers } from "@/apiCalls";
import ReceiptComponent from "@/components/ReceiptComponent";
import Loader from "@/components/Loader";
import Pagination from "@/components/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

const PAGE_SIZE = 50;

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
  const [staffList, setStaffList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc'
  });

  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    customer: "all",
    staff: "all",
    payment_method: "all",
    status: "all",
    startDate: "",
    endDate: ""
  });

  const fetchSales = async (shopId: string) => {
    try {
      if (!sales.length) setLoading(true);
      const res = await getSales(shopId);
      const data = Array.isArray(res.data) ? res.data : [];

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
          created_at_display: s.created_at ? new Date(s.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "Unknown",
          status: s.status,
          created_at: s.created_at
        };
      });

      setSales(cleaned);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load sales data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await getUsers();
      if (res.data && Array.isArray(res.data)) {
        const names = Array.from(new Set(res.data.map((u: any) => u.full_name))).filter(Boolean) as string[];
        setStaffList(names);
      }
    } catch (err) {
      console.error("Failed to load staff list", err);
    }
  };

  useEffect(() => {
    const shopId = localStorage.getItem("selected_shop_id");
    const savedUser = localStorage.getItem("user");
    let role = "";
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      role = (parsed.role || "").toLowerCase();
      setCurrentUserRole(role);
    }
    setSelectedShop(shopId);
    if (role === "admin") fetchStaff();
    if (shopId) fetchSales(shopId);
    else setLoading(false);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    if (selectedShop) fetchSales(selectedShop);
    toast.success("Sales records updated");
  };

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
      toast.error("Could not load receipt details.");
    }
  };

  // Debounce only the expensive re-filter, not the input's own displayed
  // value — typing stays instantly responsive, the ~549-row scan just
  // trails behind by up to 300ms instead of running on every keystroke.
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const [page, setPage] = useState(1);

  const filteredSales = useMemo(() => sales.filter(sale => {
    if (
      debouncedSearch &&
      !(sale.sale_number || "").toLowerCase().includes(debouncedSearch.toLowerCase()) &&
      !(sale.customer_name || "").toLowerCase().includes(debouncedSearch.toLowerCase())
    ) return false;
    if (filters.customer !== "all") {
      if (filters.customer === "walk_in") {
        if (sale.customer_name && sale.customer_name.toLowerCase() !== "walk-in") return false;
      } else if (sale.customer_name !== filters.customer) return false;
    }
    if (filters.staff !== "all" && sale.staff_name !== filters.staff) return false;
    if (
      filters.payment_method !== "all" &&
      (sale.payment_method || "").toLowerCase() !== filters.payment_method.toLowerCase()
    ) return false;
    if (filters.status !== "all" && (sale.status || "").toLowerCase() !== filters.status.toLowerCase()) return false;
    if (filters.startDate || filters.endDate) {
      const saleDate = new Date(sale.created_at);
      if (filters.startDate && saleDate < new Date(filters.startDate)) return false;
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (saleDate > end) return false;
      }
    }
    return true;
  }), [sales, debouncedSearch, filters.customer, filters.staff, filters.payment_method, filters.status, filters.startDate, filters.endDate]);

  const sortedSales = useMemo(() => [...filteredSales].sort((a, b) => {
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    if (sortConfig.key === 'amount') return (a.amount - b.amount) * dir;
    if (sortConfig.key === 'created_at') return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
    if (sortConfig.key === 'item_count') return (a.item_count - b.item_count) * dir;
    return 0;
  }), [filteredSales, sortConfig]);

  const pageCount = Math.max(1, Math.ceil(sortedSales.length / PAGE_SIZE));
  const paginatedSales = useMemo(
    () => sortedSales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedSales, page]
  );

  // Reset to page 1 whenever the result set changes underneath the pager
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.customer, filters.staff, filters.payment_method, filters.status, filters.startDate, filters.endDate, sortConfig]);

  const totalSalesAmount = filteredSales.reduce((sum, sale) => sale.amount > 0 ? sum + sale.amount : sum, 0);
  const totalRefunds = filteredSales.reduce((sum, sale) => sale.amount < 0 ? sum + Math.abs(sale.amount) : sum, 0);
  const netAmount = totalSalesAmount - totalRefunds;

  const paymentMethods = ["all", "Cash", "Card", "Transfer", "POS", "Credit"];
  const statuses = ["all", "completed", "refunded", "pending"];

  const formatCurrency = (val: number) => {
    if (currentUserRole !== "admin" && currentUserRole !== "subadmin") return "₦******";
    return `₦${val.toLocaleString()}`;
  };

  if (loading && !sales.length) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader text="Loading transaction history..." />
        </div>
      </>
    );
  }

  return (
    <>
      <main className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto space-y-6 lg:space-y-8 overflow-hidden">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sales Records</h1>
            <p className="text-slate-500 text-sm font-medium">Monitoring transactions for {selectedShop || "all shops"}</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-bold transition-all w-full sm:w-auto ${showFilters ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              <Filter className="w-4 h-4" />
              {showFilters ? "Hide Filters" : "Filters"}
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Sync
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all w-full sm:w-auto">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
          <StatCard
            title="Gross Revenue"
            value={formatCurrency(totalSalesAmount)}
            icon={<TrendingUp className="w-5 h-5" />}
            color="emerald"
          />
          <StatCard
            title="Total Returns"
            value={formatCurrency(totalRefunds)}
            icon={<TrendingDown className="w-5 h-5" />}
            color="rose"
          />
          <StatCard
            title="Net Position"
            value={formatCurrency(netAmount)}
            icon={<DollarSign className="w-5 h-5" />}
            color="blue"
          />
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Advanced Filtering</h3>
                  <button
                    onClick={() => setFilters({
                      search: "", customer: "all", staff: "all", payment_method: "all", status: "all", startDate: "", endDate: ""
                    })}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Reset All
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Sale # or Customer..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Payment Method</label>
                    <select
                      value={filters.payment_method}
                      onChange={(e) => setFilters({ ...filters, payment_method: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all capitalize"
                    >
                      {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all capitalize"
                    >
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {currentUserRole === "admin" && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Staff Member</label>
                      <select
                        value={filters.staff}
                        onChange={(e) => setFilters({ ...filters, staff: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all"
                      >
                        <option value="all">All Staff</option>
                        {staffList.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">From Date</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">To Date</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transactions Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-[940px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-16">#</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ref & Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Staff</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedSales.length > 0 ? (
                  paginatedSales.map((sale, idx) => (
                    <motion.tr
                      key={sale.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-center font-bold text-slate-300">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-900">{sale.sale_number}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{sale.created_at_display}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-700">{sale.customer_name || "Walk-in"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-700">{sale.staff_name || "Unknown"}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className={`font-black ${sale.amount < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                          ₦{Math.abs(sale.amount).toLocaleString()}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{sale.payment_method}</p>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={sale.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleViewReceipt(sale.id)}
                            className="p-2 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg text-slate-600 transition-all"
                            title="Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/sales/details?id=${sale.id}`)}
                            className="p-2 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg text-blue-600 transition-all"
                            title="Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 grayscale opacity-40">
                        <ShoppingBag className="w-12 h-12" />
                        <div>
                          <p className="font-bold text-slate-900">No transactions recorded</p>
                          <p className="text-xs font-medium">Try adjusting your filters or sync with the server</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden divide-y divide-slate-100">
            {paginatedSales.length > 0 ? (
              paginatedSales.map((sale) => (
                <motion.div
                  key={sale.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 break-words">{sale.sale_number}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{sale.created_at_display}</span>
                      </div>
                    </div>
                    <StatusBadge status={sale.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3 min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</p>
                      <p className="font-semibold text-slate-700 truncate">{sale.customer_name || "Walk-in"}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Staff</p>
                      <p className="font-semibold text-slate-700 truncate">{sale.staff_name || "Unknown"}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount</p>
                      <p className={`font-black ${sale.amount < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatCurrency(Math.abs(sale.amount))}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment</p>
                      <p className="font-semibold text-slate-700 uppercase">{sale.payment_method || "N/A"}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewReceipt(sale.id)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                    >
                      <Printer className="w-4 h-4" />
                      Receipt
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/sales/details?id=${sale.id}`)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white"
                    >
                      <Eye className="w-4 h-4" />
                      Details
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="px-6 py-16 text-center">
                <div className="flex flex-col items-center gap-3 grayscale opacity-40">
                  <ShoppingBag className="w-12 h-12" />
                  <div>
                    <p className="font-bold text-slate-900">No transactions recorded</p>
                    <p className="text-xs font-medium">Try adjusting your filters or sync with the server</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Pagination
            page={page}
            pageCount={pageCount}
            totalItems={sortedSales.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />

          <div className="px-4 sm:px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-bold text-slate-400">
            <span>SHOWING {filteredSales.length} OF {sales.length} RECORDS</span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="uppercase tracking-widest">Database Synchronized</span>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {selectedReceipt && (
          <ReceiptComponent
            sale={selectedReceipt}
            onClose={() => setSelectedReceipt(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

const StatCard = ({ title, value, icon, color }: any) => {
  const colorMap: any = {
    emerald: "text-emerald-600 bg-emerald-50",
    rose: "text-rose-600 bg-rose-50",
    blue: "text-blue-600 bg-blue-50",
  };

  return (
    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>
          {icon}
        </div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</span>
      </div>
      <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const configs: any = {
    completed: { color: 'text-emerald-700 bg-emerald-50 border-emerald-100', icon: <CheckCircle className="w-3 h-3" /> },
    refunded: { color: 'text-rose-700 bg-rose-50 border-rose-100', icon: <XCircle className="w-3 h-3" /> },
    pending: { color: 'text-amber-700 bg-amber-50 border-amber-100', icon: <Clock className="w-3 h-3" /> },
  };

  const config = configs[status] || configs.pending;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${config.color}`}>
      {config.icon}
      {status}
    </div>
  );
};
