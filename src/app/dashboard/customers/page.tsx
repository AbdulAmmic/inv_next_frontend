"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { getCustomers, createCustomer } from "@/apiCalls";
import { toast } from "react-toastify";
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
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

export default function CustomersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Loading customers...</p>
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
                  Customers
                </h1>
                <p className="text-gray-600 text-lg">
                  Manage all registered customers
                </p>
              </div>

              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold group"
              >
                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Add Customer
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {totalCustomers}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">New This Month</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {newThisMonth}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Active</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {totalCustomers}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <User className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Customers Grid/Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-6 font-semibold text-gray-900">Customer</th>
                    <th className="text-left p-6 font-semibold text-gray-900">Contact</th>
                    <th className="text-left p-6 font-semibold text-gray-900">Joined</th>
                    <th className="p-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-semibold text-lg">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {customer.name}
                            </h3>
                            <p className="text-gray-500 text-sm">Customer</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="space-y-2">
                          {customer.email && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <MailIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{customer.email}</span>
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <PhoneIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{customer.phone}</span>
                            </div>
                          )}
                          {!customer.email && !customer.phone && (
                            <span className="text-gray-400 text-sm">No contact info</span>
                          )}
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="text-gray-600">
                          <div className="font-medium">
                            {new Date(customer.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-sm">
                            {new Date(customer.created_at).toLocaleTimeString()}
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

            {/* Mobile Cards */}
            <div className="lg:hidden">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="p-6 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors duration-150"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-semibold text-lg">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg mb-1">
                          {customer.name}
                        </h3>
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <MailIcon className="w-3 h-3 text-gray-400" />
                              <span className="text-sm">{customer.email}</span>
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <PhoneIcon className="w-3 h-3 text-gray-400" />
                              <span className="text-sm">{customer.phone}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-gray-500 text-sm mt-2">
                          Joined {new Date(customer.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredCustomers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {searchTerm ? "No customers found" : "No customers yet"}
                </p>
                <p className="text-gray-400 mt-1">
                  {searchTerm ? "Try adjusting your search" : "Get started by adding your first customer"}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Add Customer
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in fade-in duration-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add New Customer</h2>
              <p className="text-gray-600 mt-1">Enter customer details below</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200">
                  <User className="text-gray-400 w-5 h-5 mr-3" />
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, name: e.target.value })
                    }
                    className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400"
                    placeholder="Enter customer name"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200">
                  <Mail className="text-gray-400 w-5 h-5 mr-3" />
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, email: e.target.value })
                    }
                    className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400"
                    placeholder="Optional email address"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200">
                  <Phone className="text-gray-400 w-5 h-5 mr-3" />
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, phone: e.target.value })
                    }
                    className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400"
                    placeholder="Optional phone number"
                  />
                </div>
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
                onClick={handleCreateCustomer}
                disabled={submitting || !newCustomer.name.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Customer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}