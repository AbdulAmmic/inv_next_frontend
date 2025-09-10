"use client";

import { useState, useEffect } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Menu, Building2, Edit, Trash2, Plus, X, Search, Phone, Mail } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  productCount: number;
}

const initialSuppliers: Supplier[] = [
  { id: "1", name: "Beverage Distributors Inc.", contactPerson: "John Smith", email: "john@beveragedist.com", phone: "+1 (555) 123-4567", productCount: 42 },
  { id: "2", name: "Fresh Bakery Supplies", contactPerson: "Sarah Johnson", email: "sarah@freshbakery.com", phone: "+1 (555) 987-6543", productCount: 28 },
  { id: "3", name: "Quality Produce Co.", contactPerson: "Michael Brown", email: "michael@qualityproduce.com", phone: "+1 (555) 456-7890", productCount: 63 },
];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newSupplier, setNewSupplier] = useState({ 
    name: "", 
    contactPerson: "", 
    email: "", 
    phone: "" 
  });
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Filter suppliers based on search query
  useEffect(() => {
    const filtered = suppliers.filter(supplier => 
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.phone.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredSuppliers(filtered);
  }, [searchQuery, suppliers]);

  const toggleSidebar = () => setIsSidebarOpen(v => !v);

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    const newSup = {
      id: Math.random().toString(36).substr(2, 9),
      ...newSupplier,
      productCount: 0
    };
    setSuppliers([...suppliers, newSup]);
    setNewSupplier({ name: "", contactPerson: "", email: "", phone: "" });
    setShowAdd(false);
  };

  const handleEditSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    
    setSuppliers(suppliers.map(supplier => 
      supplier.id === editingSupplier.id ? editingSupplier : supplier
    ));
    setEditingSupplier(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      setSuppliers(suppliers.filter(s => s.id !== id));
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
              <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
            </div>
            
            <div className="flex-1">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
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
              <Plus className="w-5 h-5" />
              Add Supplier
            </button>
          </div>

          {/* Add Supplier Modal */}
          {showAdd && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Add Supplier</h2>
                  <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-gray-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddSupplier} className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Supplier Name</label>
                    <input
                      type="text"
                      value={newSupplier.name}
                      onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={newSupplier.contactPerson}
                      onChange={e => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={newSupplier.email}
                      onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Phone</label>
                    <input
                      type="tel"
                      value={newSupplier.phone}
                      onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
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
                      Add Supplier
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Supplier Modal */}
          {editingSupplier && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Edit Supplier</h2>
                  <button onClick={() => setEditingSupplier(null)} className="p-1 rounded-lg hover:bg-gray-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleEditSupplier} className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Supplier Name</label>
                    <input
                      type="text"
                      value={editingSupplier.name}
                      onChange={e => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={editingSupplier.contactPerson}
                      onChange={e => setEditingSupplier({ ...editingSupplier, contactPerson: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={editingSupplier.email}
                      onChange={e => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editingSupplier.phone}
                      onChange={e => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingSupplier(null)}
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

          {/* Suppliers Table */}
          {filteredSuppliers.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSuppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                          <div className="text-sm text-gray-500">{supplier.contactPerson}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                            <Mail className="w-4 h-4" />
                            {supplier.email}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Phone className="w-4 h-4" />
                            {supplier.phone}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {supplier.productCount} products
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setEditingSupplier(supplier)}
                              className="p-2 rounded-lg hover:bg-gray-100 text-blue-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 rounded-lg hover:bg-gray-100 text-red-600 transition-colors"
                              onClick={() => handleDelete(supplier.id)}
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
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No suppliers found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? "Try adjusting your search query" : "Get started by adding a new supplier"}
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Supplier
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}