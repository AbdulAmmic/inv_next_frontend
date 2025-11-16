"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";

import {
  getSuppliers,
  createSupplier,
  getSupplierSummary,
  getSupplierTransactions,
} from "@/apiCalls";

import { toast } from "react-toastify";
import {
  Plus,
  User,
  Phone,
  Mail,
  MapPin,
  Receipt,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function SuppliersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  // New supplier form
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
  });

  // Supplier expanded section
  const [expanded, setExpanded] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>({});
  const [transactions, setTransactions] = useState<any>({});

  // ==========================
  // LOAD SUPPLIERS
  // ==========================
  const loadSuppliers = async () => {
    try {
      const res = await getSuppliers();
      setSuppliers(res.data);
    } catch (err) {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  // ==========================
  // LOAD SUMMARY & TRANSACTIONS
  // ==========================
  const toggleExpand = async (supplier_id: string) => {
    if (expanded === supplier_id) {
      setExpanded(null);
      return;
    }

    try {
      const [sumRes, txRes] = await Promise.all([
        getSupplierSummary(supplier_id),
        getSupplierTransactions(supplier_id),
      ]);

      setSummary((prev: any) => ({ ...prev, [supplier_id]: sumRes.data }));
      setTransactions((prev:any) => ({ ...prev, [supplier_id]: txRes.data }));

      setExpanded(supplier_id);
    } catch (err) {
      toast.error("Failed to load supplier financials");
    }
  };

  // ==========================
  // CREATE SUPPLIER
  // ==========================
  const handleCreateSupplier = async () => {
    if (!newSupplier.name) {
      toast.error("Supplier name is required");
      return;
    }

    try {
      const payload = {
        name: newSupplier.name,
        contact_person: newSupplier.contact_person,
        phone: newSupplier.phone,
        email: newSupplier.email,
        address: newSupplier.address,
      };

      const res = await createSupplier(payload);

      setSuppliers((prev) => [res.data, ...prev]);
      toast.success("Supplier added successfully");

      setShowModal(false);
      setNewSupplier({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create supplier");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading suppliers...
      </div>
    );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isMobile={false}
      />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-6">
          {/* TOP BAR */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Suppliers</h1>
              <p className="text-gray-600">
                Manage suppliers, credits, and financial summaries
              </p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4" />
              Add Supplier
            </button>
          </div>

          {/* SUPPLIERS TABLE */}
          <div className="bg-white p-6 rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left">
                  <th className="p-3">Name</th>
                  <th className="p-3">Contact Person</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Expand</th>
                </tr>
              </thead>

              <tbody>
                {suppliers.map((s) => (
                  <>
                    <tr
                      key={s.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpand(s.id)}
                    >
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3">{s.contact_person || "—"}</td>
                      <td className="p-3">{s.phone || "—"}</td>
                      <td className="p-3">{s.email || "—"}</td>
                      <td className="p-3">
                        {expanded === s.id ? (
                          <ChevronUp className="w-5" />
                        ) : (
                          <ChevronDown className="w-5" />
                        )}
                      </td>
                    </tr>

                    {/* EXPANDED SECTION */}
                    {expanded === s.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={5} className="p-4">
                          <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <Receipt className="w-4" />
                            Financial Summary
                          </h3>

                          {summary[s.id] ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                              <div className="p-4 bg-white border rounded-xl">
                                <p className="text-gray-500 text-sm">Total Credit</p>
                                <p className="text-xl font-bold text-blue-600">
                                  ₦{summary[s.id].total_credit.toLocaleString()}
                                </p>
                              </div>

                              <div className="p-4 bg-white border rounded-xl">
                                <p className="text-gray-500 text-sm">Total Loss</p>
                                <p className="text-xl font-bold text-red-600">
                                  ₦{summary[s.id].total_loss.toLocaleString()}
                                </p>
                              </div>

                              <div className="p-4 bg-white border rounded-xl">
                                <p className="text-gray-500 text-sm">Net Position</p>
                                <p className="text-xl font-bold text-emerald-600">
                                  ₦{summary[s.id].net_position.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p>Loading summary...</p>
                          )}

                          <h3 className="font-semibold mb-2">Transactions</h3>

                          <div className="overflow-auto max-h-60 border rounded-lg">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-white border-b">
                                  <th className="p-2">Type</th>
                                  <th className="p-2">Amount</th>
                                  <th className="p-2">Reason</th>
                                  <th className="p-2">Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {transactions[s.id]?.length > 0 ? (
                                  transactions[s.id].map((t: any) => (
                                    <tr key={t.id} className="border-b">
                                      <td className="p-2 capitalize">{t.type}</td>
                                      <td className="p-2">
                                        ₦{Number(t.amount).toLocaleString()}
                                      </td>
                                      <td className="p-2">{t.note || "—"}</td>
                                      <td className="p-2">
                                        {new Date(t.created_at).toLocaleString()}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={4} className="p-4 text-center text-gray-500">
                                      No transactions
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* ===========================
              ADD SUPPLIER MODAL
              =========================== */}
          {showModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white w-full max-w-lg p-6 rounded-xl shadow-xl">
                <h2 className="text-xl font-bold mb-4">Add Supplier</h2>

                <div className="space-y-4">
                  {/* NAME */}
                  <div>
                    <label className="text-sm text-gray-600">Supplier Name</label>
                    <div className="flex items-center bg-gray-50 border rounded-lg p-2">
                      <User className="text-gray-400 w-4 mr-2" />
                      <input
                        type="text"
                        value={newSupplier.name}
                        onChange={(e) =>
                          setNewSupplier({ ...newSupplier, name: e.target.value })
                        }
                        className="flex-1 bg-transparent outline-none"
                        placeholder="Supplier name"
                      />
                    </div>
                  </div>

                  {/* CONTACT PERSON */}
                  <div>
                    <label className="text-sm text-gray-600">Contact Person</label>
                    <input
                      type="text"
                      value={newSupplier.contact_person}
                      onChange={(e) =>
                        setNewSupplier({ ...newSupplier, contact_person: e.target.value })
                      }
                      className="w-full bg-gray-50 border rounded-lg px-3 py-2"
                      placeholder="Person in charge"
                    />
                  </div>

                  {/* PHONE */}
                  <div>
                    <label className="text-sm text-gray-600">Phone</label>
                    <input
                      type="text"
                      value={newSupplier.phone}
                      onChange={(e) =>
                        setNewSupplier({ ...newSupplier, phone: e.target.value })
                      }
                      className="w-full bg-gray-50 border rounded-lg px-3 py-2"
                      placeholder="Phone number"
                    />
                  </div>

                  {/* EMAIL */}
                  <div>
                    <label className="text-sm text-gray-600">Email</label>
                    <input
                      type="email"
                      value={newSupplier.email}
                      onChange={(e) =>
                        setNewSupplier({ ...newSupplier, email: e.target.value })
                      }
                      className="w-full bg-gray-50 border rounded-lg px-3 py-2"
                      placeholder="Email address"
                    />
                  </div>

                  {/* ADDRESS */}
                  <div>
                    <label className="text-sm text-gray-600">Address</label>
                    <div className="flex items-center bg-gray-50 border rounded-lg p-2">
                      <MapPin className="text-gray-400 w-4 mr-2" />
                      <input
                        type="text"
                        value={newSupplier.address}
                        onChange={(e) =>
                          setNewSupplier({ ...newSupplier, address: e.target.value })
                        }
                        className="flex-1 bg-transparent outline-none"
                        placeholder="Supplier address"
                      />
                    </div>
                  </div>

                  {/* BUTTONS */}
                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 bg-gray-200 rounded-lg"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleCreateSupplier}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Supplier
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
