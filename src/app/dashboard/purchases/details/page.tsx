"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  getPurchase,
  receivePurchase,
  updatePurchase,
  getSuppliers,
  getProducts,
  getShops
} from "@/apiCalls";

import {
  ArrowLeft,
  Edit,
  Save,
  PackageOpen,
  FileEdit,
  Truck,
  DollarSign,
  Hash,
  Loader2
} from "lucide-react";

import { toast } from "react-toastify";

function PurchaseDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const [purchase, setPurchase] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);

  // Editable fields
  const [editInfo, setEditInfo] = useState({
    invoice_number: "",
    container_number: "",
    vat_percent: 7.5,
    other_charges: 0,
    amount_paid: 0,
    note: "",
  });

  // Receive item states
  const [receiveItems, setReceiveItems] = useState<any[]>([]);
  const [savingInfo, setSavingInfo] = useState(false);
  const [receiving, setReceiving] = useState(false);

  // ============================
  // LOAD PURCHASE DATA
  // ============================
  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const [pRes, prodRes, supRes, shopRes] = await Promise.all([
        getPurchase(id as string),
        getProducts(),
        getSuppliers(),
        getShops()
      ]);

      setPurchase(pRes.data);
      setProducts(prodRes.data);
      setSuppliers(supRes.data);
      setShops(shopRes.data);

      setEditInfo({
        invoice_number: pRes.data.invoice_number || "",
        container_number: pRes.data.container_number || "",
        vat_percent: pRes.data.vat_percent ?? 7.5,
        other_charges: pRes.data.other_charges ?? 0,
        amount_paid: pRes.data.amount_paid ?? 0,
        note: pRes.data.note || "",
      });

      setReceiveItems(
        pRes.data.items.map((i: any) => ({
          id: i.id,
          product_name: i.product_name,
          ordered_quantity: i.ordered_quantity,
          // Default to "fully received" (the common case) rather than the
          // raw stored value, which is 0 for anything not yet received.
          // Previously this pre-filled every row with 0, so any row the
          // user didn't manually retype submitted as "0 received" and
          // silently added nothing to stock — the most common report of
          // "receiving doesn't add to inventory."
          received_quantity:
            i.received_quantity > 0 ? i.received_quantity : i.ordered_quantity,
          batch_number: i.batch_number || "",
          expiry_date: i.expiry_date || "",
          is_cancelled: i.is_cancelled,
          cancel_reason: i.cancel_reason || "",
        }))
      );
    } catch (err) {
      toast.error("Failed to load purchase");
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // SAVE EDITED GENERAL INFO
  // ============================
  const saveInfo = async () => {
    if (savingInfo) return;
    setSavingInfo(true);
    try {
      await updatePurchase(id as string, {
        invoice_number: editInfo.invoice_number,
        container_number: editInfo.container_number,
        vat_percent: Number(editInfo.vat_percent),
        other_charges: Number(editInfo.other_charges),
        amount_paid: Number(editInfo.amount_paid),
        note: editInfo.note,
      });

      toast.success("Purchase updated successfully");
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update");
    } finally {
      setSavingInfo(false);
    }
  };

  // ============================
  // RECEIVE PURCHASE
  // ============================
  const saveReceive = async () => {
    if (receiving) return;
    setReceiving(true);
    try {
      await receivePurchase(id as string, {
        items: receiveItems,
        vat_percent: editInfo.vat_percent,
        other_charges: editInfo.other_charges,
        container_number: editInfo.container_number
      });

      toast.success("Purchase received — inventory updated");
      await loadData();
    } catch (err) {
      toast.error("Failed to receive items");
    } finally {
      setReceiving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'received':
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'ordered':
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'partial': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      case 'partial': return 'bg-blue-100 text-blue-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <p className="text-gray-600 font-medium">No purchase ID provided.</p>
      </div>
    );
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading purchase details...</p>
        </div>
      </div>
    );

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-[100vw] overflow-hidden">
          {/* Header Section */}
          <div className="mb-6 sm:mb-8">
            <button
              onClick={() => router.push("/dashboard/purchases")}
              className="flex items-center gap-3 text-slate-600 hover:text-slate-800 hover:bg-white px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 group text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-3 sm:gap-0">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Purchase Details</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">Manage and track your purchase order</p>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(purchase?.status)}`}>
                  {purchase?.status || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 sm:mb-8 overflow-x-auto">
            <div className="flex space-x-1 bg-white/80 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-200 w-fit min-w-full sm:w-fit">
              {['overview', 'items', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-medium capitalize transition-all duration-200 text-xs sm:text-base whitespace-nowrap ${activeTab === tab
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">

            {/* Left Column - Information Cards */}
            <div className="xl:col-span-2 space-y-4 sm:space-y-6 min-w-0">

              {/* Purchase Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-2 sm:gap-0">
                    <h2 className="text-base sm:text-xl font-semibold text-slate-800 flex items-center gap-2 sm:gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <FileEdit className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600" />
                      </div>
                      <span className="hidden sm:inline">Purchase Information</span>
                      <span className="sm:hidden">Purchase Info</span>
                    </h2>
                    <Edit className="w-4 sm:w-5 h-4 sm:h-5 text-slate-400 flex-shrink-0" />
                  </div>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        Invoice Number
                      </label>
                      <input
                        type="text"
                        value={editInfo.invoice_number}
                        onChange={(e) =>
                          setEditInfo({ ...editInfo, invoice_number: e.target.value })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        placeholder="Enter invoice number"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <PackageOpen className="w-4 h-4" />
                        Container Number
                      </label>
                      <input
                        type="text"
                        value={editInfo.container_number}
                        onChange={(e) =>
                          setEditInfo({ ...editInfo, container_number: e.target.value })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        placeholder="Enter container number"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">VAT Percentage</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={editInfo.vat_percent}
                          onChange={(e) =>
                            setEditInfo({ ...editInfo, vat_percent: Number(e.target.value) })
                          }
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          step="0.1"
                          min="0"
                          max="100"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Other Charges
                      </label>
                      <input
                        type="number"
                        value={editInfo.other_charges}
                        onChange={(e) =>
                          setEditInfo({ ...editInfo, other_charges: Number(e.target.value) })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        min="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Amount Paid
                      </label>
                      <input
                        type="number"
                        value={editInfo.amount_paid}
                        onChange={(e) =>
                          setEditInfo({ ...editInfo, amount_paid: Number(e.target.value) })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Additional Notes</label>
                    <textarea
                      value={editInfo.note}
                      onChange={(e) =>
                        setEditInfo({ ...editInfo, note: e.target.value })
                      }
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                      placeholder="Add any additional notes here..."
                    />
                  </div>

                  <button
                    onClick={saveInfo}
                    disabled={savingInfo}
                    className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center gap-3 font-medium shadow-lg shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-700"
                  >
                    {savingInfo ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {savingInfo ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>

              {/* Items Table Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-slate-100">
                  <h2 className="text-lg md:text-xl font-semibold text-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <PackageOpen className="w-5 h-5 text-emerald-600" />
                    </div>
                    Purchase Items
                  </h2>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="text-left p-6 font-semibold text-slate-700">Product</th>
                        <th className="text-left p-6 font-semibold text-slate-700">Ordered</th>
                        <th className="text-left p-6 font-semibold text-slate-700">Received</th>
                        <th className="text-left p-6 font-semibold text-slate-700">Batch No</th>
                        <th className="text-left p-6 font-semibold text-slate-700">Expiry</th>
                        <th className="text-left p-6 font-semibold text-slate-700">Cancel</th>
                        <th className="text-left p-6 font-semibold text-slate-700">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receiveItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                          <td className="p-6">
                            <div className="font-medium text-slate-800">{item.product_name}</div>
                          </td>
                          <td className="p-6">
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                              {item.ordered_quantity}
                            </span>
                          </td>
                          <td className="p-6">
                            <input
                              type="number"
                              value={item.received_quantity}
                              onChange={(e) => {
                                const updated = [...receiveItems];
                                updated[idx].received_quantity = Number(e.target.value);
                                setReceiveItems(updated);
                              }}
                              className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              min="0"
                            />
                          </td>
                          <td className="p-6">
                            <input
                              type="text"
                              value={item.batch_number}
                              onChange={(e) => {
                                const updated = [...receiveItems];
                                updated[idx].batch_number = e.target.value;
                                setReceiveItems(updated);
                              }}
                              placeholder="Batch"
                              className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            />
                          </td>
                          <td className="p-6">
                            <input
                              type="date"
                              value={item.expiry_date}
                              onChange={(e) => {
                                const updated = [...receiveItems];
                                updated[idx].expiry_date = e.target.value;
                                setReceiveItems(updated);
                              }}
                              className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            />
                          </td>
                          <td className="p-6">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.is_cancelled}
                                onChange={(e) => {
                                  const updated = [...receiveItems];
                                  updated[idx].is_cancelled = e.target.checked;
                                  setReceiveItems(updated);
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                            </label>
                          </td>
                          <td className="p-6">
                            <input
                              type="text"
                              value={item.cancel_reason}
                              onChange={(e) => {
                                const updated = [...receiveItems];
                                updated[idx].cancel_reason = e.target.value;
                                setReceiveItems(updated);
                              }}
                              placeholder="Cancellation reason"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              disabled={!item.is_cancelled}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4 p-4">
                  {receiveItems.map((item, idx) => (
                    <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</p>
                        <p className="text-sm font-medium text-slate-800 mt-1">{item.product_name}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ordered</p>
                          <p className="text-sm font-medium text-slate-800 mt-1">{item.ordered_quantity}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Received</p>
                          <input
                            type="number"
                            value={item.received_quantity}
                            onChange={(e) => {
                              const updated = [...receiveItems];
                              updated[idx].received_quantity = Number(e.target.value);
                              setReceiveItems(updated);
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm mt-1"
                            min="0"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Batch No</p>
                          <input
                            type="text"
                            value={item.batch_number}
                            onChange={(e) => {
                              const updated = [...receiveItems];
                              updated[idx].batch_number = e.target.value;
                              setReceiveItems(updated);
                            }}
                            placeholder="Batch"
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm mt-1"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expiry</p>
                          <input
                            type="date"
                            value={item.expiry_date}
                            onChange={(e) => {
                              const updated = [...receiveItems];
                              updated[idx].expiry_date = e.target.value;
                              setReceiveItems(updated);
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm mt-1"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cancel Item</p>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.is_cancelled}
                              onChange={(e) => {
                                const updated = [...receiveItems];
                                updated[idx].is_cancelled = e.target.checked;
                                setReceiveItems(updated);
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                          </label>
                        </div>
                      </div>

                      {item.is_cancelled && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cancellation Reason</p>
                          <input
                            type="text"
                            value={item.cancel_reason}
                            onChange={(e) => {
                              const updated = [...receiveItems];
                              updated[idx].cancel_reason = e.target.value;
                              setReceiveItems(updated);
                            }}
                            placeholder="Cancellation reason"
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm mt-1"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Summary & Actions */}
            <div className="space-y-4 sm:space-y-6">

              {/* Summary Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <PackageOpen className="w-5 h-5 text-purple-600" />
                    </div>
                    Order Summary
                  </h2>
                </div>

                <div className="p-4 sm:p-6 space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-slate-600">Supplier</span>
                    <span className="font-medium text-slate-800 text-right break-words">{purchase?.supplier?.name || "Unknown"}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-slate-600">Shop</span>
                    <span className="font-medium text-slate-800 text-right break-words">{purchase?.shop?.name || "Unknown"}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-slate-600">Status</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(purchase?.status)}`}>
                      {purchase?.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-slate-600">Total Cost</span>
                    <span className="font-bold text-lg text-slate-800">
                      ₦{purchase?.total_amount?.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-slate-600">Amount Paid</span>
                    <span className="font-bold text-lg text-emerald-600">
                      ₦{purchase?.amount_paid?.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-slate-600">Payment Status</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(purchase?.payment_status)}`}>
                      {purchase?.payment_status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <span className="text-slate-600">Loss Amount</span>
                    <span className="font-bold text-lg text-red-600">
                      ₦{purchase?.loss_amount?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Card */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg overflow-hidden">
                <div className="p-4 sm:p-6">
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
                    <Truck className="w-5 h-5" />
                    Quick Actions
                  </h2>

                  <div className="space-y-4">
                    <button
                      onClick={saveReceive}
                      disabled={receiving}
                      className="w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium flex items-center justify-center gap-3 transition-all duration-200 hover:scale-105 shadow-lg shadow-emerald-500/25 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-emerald-500"
                    >
                      {receiving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Truck className="w-5 h-5" />
                      )}
                      {receiving ? "Receiving..." : "Receive Purchase"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-800">Order Statistics</h2>
                </div>

                <div className="p-4 sm:p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Total Items</span>
                    <span className="font-bold text-slate-800">{receiveItems.length}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Items Received</span>
                    <span className="font-bold text-emerald-600">
                      {receiveItems.filter(item => item.received_quantity > 0).length}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Cancelled Items</span>
                    <span className="font-bold text-red-600">
                      {receiveItems.filter(item => item.is_cancelled).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
    </main>
  );
}

export default function PurchaseDetailsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PurchaseDetailsContent />
    </Suspense>
  );
}
