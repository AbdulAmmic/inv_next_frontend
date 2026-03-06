"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboardLayout";
import { getCustomers, createCustomer } from "@/apiCalls";
import { toast } from "react-hot-toast";
import {
  Plus,
  User,
  Phone,
  Mail,
  Search,
  Filter,
  MoreVertical,
  Users,
  Calendar,
  TrendingUp,
  Loader2,
  MailIcon,
  PhoneIcon,
  X,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Loader from "@/components/Loader";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Load customers
  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await getCustomers();
      setCustomers(res.data);
    } catch (err) {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Create customer
  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: newCustomer.name.trim(),
        email: newCustomer.email.trim() || "",
        phone: newCustomer.phone.trim() || "",
      };

      const res = await createCustomer(payload);
      setCustomers((prev) => [res.data, ...prev]);
      toast.success("Customer added successfully");

      setShowModal(false);
      setNewCustomer({ name: "", email: "", phone: "" });
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to add customer");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  // Calculate stats
  const totalCustomers = customers.length;
  const newThisMonth = customers.filter(
    customer => new Date(customer.created_at).getMonth() === new Date().getMonth()
  ).length;

  if (loading && customers.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader text="Loading Community..." subText="Fetching your customer list" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="p-6 lg:p-10 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                CRM
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Customers
            </h1>
            <p className="text-slate-500 font-medium mt-1">Manage and track your customer base</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-200 group"
            >
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
              Add Customer
            </button>
          </motion.div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Total Customers", value: totalCustomers, icon: Users, color: "blue", delay: 0 },
            { label: "New This Month", value: newThisMonth, icon: TrendingUp, color: "emerald", delay: 0.1 },
            { label: "Active Clients", value: totalCustomers, icon: User, color: "purple", delay: 0.2 },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stat.delay }}
              className="glass-card p-6 rounded-[2rem] flex items-center justify-between border border-white hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
            >
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-4 rounded-[1.2rem] bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4 rounded-[1.5rem] shadow-xl shadow-slate-200/50 group"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors w-5 h-5" />
            <input
              type="text"
              placeholder="Search customers by name, email, or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50/50 border border-slate-100 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all font-medium text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </motion.div>

        {/* Main Content Table Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 italic">
                  <th className="px-8 py-5 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Customer Details</th>
                  <th className="px-8 py-5 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Contact Information</th>
                  <th className="px-8 py-5 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Membership</th>
                  <th className="px-8 py-5 font-bold text-slate-500 uppercase tracking-widest text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence mode="popLayout">
                  {filteredCustomers.map((customer, idx) => (
                    <motion.tr
                      layout
                      key={customer.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-900 text-white rounded-[1.2rem] flex items-center justify-center font-black text-lg shadow-lg shadow-slate-200">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-lg tracking-tight">
                              {customer.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider italic">Loyal Client</p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-1.5">
                          {customer.email && (
                            <div className="flex items-center gap-2 text-slate-600 group-hover:text-slate-900 transition-colors">
                              <div className="p-1 rounded-md bg-slate-100 group-hover:bg-blue-50 transition-colors">
                                <MailIcon className="w-3 h-3" />
                              </div>
                              <span className="text-xs font-medium tracking-tight">{customer.email}</span>
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-slate-600 group-hover:text-slate-900 transition-colors">
                              <div className="p-1 rounded-md bg-slate-100 group-hover:bg-emerald-50 transition-colors">
                                <PhoneIcon className="w-3 h-3" />
                              </div>
                              <span className="text-xs font-medium tracking-tight">{customer.phone}</span>
                            </div>
                          )}
                          {!customer.email && !customer.phone && (
                            <span className="text-slate-300 text-xs italic font-medium">No contact details provided</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-slate-500">
                          <div className="font-bold text-slate-900 text-sm">
                            {new Date(customer.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            Joined System
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-50 rounded-xl transition-all shadow-sm">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-20 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6">
                          <Users className="w-10 h-10 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900">No customers found</h3>
                        <p className="text-slate-400 max-w-xs mx-auto mt-2 font-medium">
                          {searchTerm
                            ? "Try refining your search terms to find who you're looking for."
                            : "Your community is waiting. Start building your relation with clients today."}
                        </p>
                        {!searchTerm && (
                          <button
                            onClick={() => setShowModal(true)}
                            className="mt-6 flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                          >
                            <Plus className="w-4 h-4" />
                            Add First Customer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>

      {/* Add Customer Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden overflow-y-auto max-h-screen no-scrollbar"
            >
              <div className="p-8 pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">New Member</h2>
                  <p className="text-slate-500 font-medium text-sm">Register a new client profile</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-8 pt-4 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">
                    Full Identity *
                  </label>
                  <div className="flex items-center bg-slate-50/50 border border-slate-100 rounded-[1.2rem] p-4 focus-within:ring-4 focus-within:ring-slate-100 focus-within:border-slate-300 transition-all group">
                    <User className="text-slate-400 w-5 h-5 mr-4 group-focus-within:text-slate-900 transition-colors" />
                    <input
                      type="text"
                      value={newCustomer.name}
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, name: e.target.value })
                      }
                      className="flex-1 bg-transparent border-none outline-none text-slate-900 font-bold placeholder:text-slate-300"
                      placeholder="e.g. Alexander Pierce"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">
                    Digital Reach
                  </label>
                  <div className="flex items-center bg-slate-50/50 border border-slate-100 rounded-[1.2rem] p-4 focus-within:ring-4 focus-within:ring-slate-100 focus-within:border-slate-300 transition-all group">
                    <Mail className="text-slate-400 w-5 h-5 mr-4 group-focus-within:text-slate-900 transition-colors" />
                    <input
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, email: e.target.value })
                      }
                      className="flex-1 bg-transparent border-none outline-none text-slate-900 font-bold placeholder:text-slate-300"
                      placeholder="alexander@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">
                    Direct Handle
                  </label>
                  <div className="flex items-center bg-slate-50/50 border border-slate-100 rounded-[1.2rem] p-4 focus-within:ring-4 focus-within:ring-slate-100 focus-within:border-slate-300 transition-all group">
                    <Phone className="text-slate-400 w-5 h-5 mr-4 group-focus-within:text-slate-900 transition-colors" />
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, phone: e.target.value })
                      }
                      className="flex-1 bg-transparent border-none outline-none text-slate-900 font-bold placeholder:text-slate-300"
                      placeholder="+234 800 000 0000"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium px-1 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Preferred for notification alerts
                  </p>
                </div>
              </div>

              <div className="p-8 pt-4 flex gap-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-4 text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-[1.2rem] font-bold transition-all active:scale-95"
                  disabled={submitting}
                >
                  Discard
                </button>
                <button
                  onClick={handleCreateCustomer}
                  disabled={submitting || !newCustomer.name.trim()}
                  className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-[1.2rem] font-black hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-xl shadow-slate-200"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Verify & Create
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}