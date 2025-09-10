"use client";

import { useState, useEffect } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Menu, UserPlus, Edit, Trash2, Plus, X, Search, Eye, Mail, Phone, MapPin, Calendar } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  joinDate: string;
  orders: number;
  totalSpent: number;
}

const initialCustomers: Customer[] = [
  { id: "1", name: "John Smith", email: "john.smith@example.com", phone: "+1 (555) 123-4567", address: "123 Main St, New York, NY 10001", joinDate: "2023-01-15", orders: 12, totalSpent: 1254.32 },
  { id: "2", name: "Emma Johnson", email: "emma.j@example.com", phone: "+1 (555) 987-6543", address: "456 Oak Ave, Los Angeles, CA 90001", joinDate: "2022-11-03", orders: 8, totalSpent: 876.50 },
  { id: "3", name: "Michael Brown", email: "m.brown@example.com", phone: "+1 (555) 456-7890", address: "789 Pine Rd, Chicago, IL 60601", joinDate: "2023-03-22", orders: 5, totalSpent: 542.75 },
  { id: "4", name: "Sarah Davis", email: "sarahd@example.com", phone: "+1 (555) 234-5678", address: "321 Elm St, Miami, FL 33101", joinDate: "2022-08-30", orders: 15, totalSpent: 2108.40 },
  { id: "5", name: "David Wilson", email: "dwilson@example.com", phone: "+1 (555) 876-5432", address: "654 Maple Dr, Seattle, WA 98101", joinDate: "2023-02-14", orders: 3, totalSpent: 327.90 },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>(initialCustomers);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: "", email: "", phone: "", address: ""
  });

  // Filter customers based on search query
  useEffect(() => {
    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [searchQuery, customers]);

  const toggleSidebar = () => setIsSidebarOpen(v => !v);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const newCust = {
      id: Math.random().toString(36).substr(2, 9),
      ...newCustomer,
      joinDate: new Date().toISOString().split('T')[0],
      orders: 0,
      totalSpent: 0
    };
    setCustomers([...customers, newCust]);
    setNewCustomer({ name: "", email: "", phone: "", address: "" });
    setShowAdd(false);
  };

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetail(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      setCustomers(customers.filter(c => c.id !== id));
    }
  };

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
              <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
            </div>
            
            <div className="flex-1">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Add Customer
            </button>
          </div>

          {/* Add Customer Modal */}
          {showAdd && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Add Customer</h2>
                  <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-gray-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddCustomer} className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Full Name</label>
                    <input
                      type="text"
                      value={newCustomer.name}
                      onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Email Address</label>
                    <input
                      type="email"
                      value={newCustomer.email}
                      onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Address</label>
                    <textarea
                      value={newCustomer.address}
                      onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
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
                      Add Customer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Customer Detail Modal */}
          {showDetail && selectedCustomer && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Customer Details</h2>
                  <button onClick={() => setShowDetail(false)} className="p-1 rounded-lg hover:bg-gray-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-xl font-semibold">
                        {selectedCustomer.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{selectedCustomer.name}</h3>
                      <p className="text-gray-500">{selectedCustomer.email}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Orders</p>
                      <p className="text-lg font-semibold">{selectedCustomer.orders}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Total Spent</p>
                      <p className="text-lg font-semibold">${selectedCustomer.totalSpent.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <span>{selectedCustomer.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <span>{selectedCustomer.address}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <span>Joined {new Date(selectedCustomer.joinDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowDetail(false)}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Customers Table */}
          {filteredCustomers.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-blue-600 text-sm font-semibold">
                                {customer.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                              <div className="text-xs text-gray-500">Joined {new Date(customer.joinDate).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{customer.email}</div>
                          <div className="text-xs text-gray-500">{customer.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {customer.orders} orders
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${customer.totalSpent.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleViewDetails(customer)}
                              className="p-2 rounded-lg hover:bg-gray-100 text-blue-600 transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                              title="Edit customer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 rounded-lg hover:bg-gray-100 text-red-600 transition-colors"
                              onClick={() => handleDelete(customer.id)}
                              title="Delete customer"
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
              <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No customers found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? "Try adjusting your search query" : "Get started by adding your first customer"}
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Customer
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}