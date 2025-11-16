"use client";

import { useState, useEffect } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import {
  Menu,
  Plus,
  Search,
  Building,
  MapPin,
  MoreVertical,
  Filter,
  Download,
  Users,
  Store,
  Eye
} from "lucide-react";
import StoreModal from "@/components/storemodal";
import { getShops, createShop } from "@/apiCalls";

interface Store {
  id: string;
  name: string;
  location?: string;
  manager?: string;
  phone?: string;
  status?: "Active" | "Inactive";
}

const statusOptions = ["All", "Active", "Inactive"];

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch stores
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await getShops();
        const data = res.data;

        const mapped: Store[] = data.map((s: any) => ({
          id: s.id,
          name: s.name,
          location: s.location || "—",
          manager: s.meta?.manager || "—",
          phone: s.meta?.phone || "—",
          status: s.meta?.status || "Active",
        }));

        setStores(mapped);
        setFilteredStores(mapped);
      } catch (err) {
        console.error("Failed to fetch stores:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  // Search & Filter
  useEffect(() => {
    let filtered = stores.filter(
      (store) =>
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (store.location ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.manager?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (statusFilter !== "All") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    setFilteredStores(filtered);
  }, [searchQuery, stores, statusFilter]);

  const toggleSidebar = () => setIsSidebarOpen((v) => !v);

  // Create Store
  const handleCreateStore = async (formData: any) => {
    try {
      const payload = {
        name: formData.name,
        location: formData.location,
      };
      const res = await createShop(payload);
      const newStore = res.data;

      setStores((prev) => [
        ...prev,
        {
          id: newStore.id,
          name: newStore.name,
          location: newStore.location || "—",
          manager: newStore.meta?.manager || "—",
          phone: newStore.meta?.phone || "—",
          status: newStore.meta?.status || "Active",
        },
      ]);

      setShowCreateModal(false);
    } catch (err) {
      console.error("Error creating store:", err);
    }
  };

  // Calculate stats
  const activeStores = stores.filter(store => store.status === "Active").length;
  const totalStores = stores.length;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} isMobile={false} />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="p-6 max-w-7xl mx-auto w-full">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg bg-white border border-gray-200 lg:hidden hover:bg-gray-50 transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Stores
                </h1>
                <p className="text-gray-500 mt-1">Manage your store locations</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4" />
                <span>Filter</span>
              </button>
              
              <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                New Store
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Stores</p>
                  <p className="text-xl font-semibold text-gray-900 mt-1">{totalStores}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Store className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Stores</p>
                  <p className="text-xl font-semibold text-gray-900 mt-1">{activeStores}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <Building className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Managers</p>
                  <p className="text-xl font-semibold text-gray-900 mt-1">{stores.length}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search stores..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white transition-colors"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white transition-colors"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stores Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading stores...</p>
              </div>
            ) : filteredStores.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Store
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Manager
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStores.map((store) => (
                      <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <Building className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {store.name}
                              </div>
                              <div className="text-sm text-gray-500">{store.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {store.location}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {store.manager}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              store.status === "Active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {store.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Building className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No stores found</h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery || statusFilter !== "All" 
                    ? "Try adjusting your search criteria."
                    : "Get started by creating your first store."}
                </p>
                <div className="flex gap-3 justify-center">
                  {(searchQuery || statusFilter !== "All") && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("All");
                      }}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Clear Filters
                    </button>
                  )}
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors font-medium"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Add Store
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Create Store Modal */}
          <StoreModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSave={handleCreateStore}
          />
        </main>
      </div>
    </div>
  );
}