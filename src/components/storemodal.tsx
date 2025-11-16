"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { Building, MapPin, Phone, User, X, Store, CheckCircle, AlertCircle } from "lucide-react";

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (storeData: any) => void;
}

export default function StoreModal({ isOpen, onClose, onSave }: StoreModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    manager: "",
    phone: "",
    status: "Active" as "Active" | "Inactive",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: "",
        location: "",
        manager: "",
        phone: "",
        status: "Active",
      });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Store name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Store name must be at least 2 characters";
    }

    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    }

    if (!formData.manager.trim()) {
      newErrors.manager = "Manager name is required";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Please enter a valid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      await onSave(formData);
      // Success state - form will be reset by the useEffect
    } catch (error) {
      console.error("Error saving store:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handlePhoneChange = (value: string) => {
    // Basic phone formatting
    const formatted = value.replace(/\D/g, "").slice(0, 15);
    handleInputChange("phone", formatted);
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose} 
      className="relative z-50"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      
      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <Dialog.Title className="text-xl font-bold text-gray-900">
                  Create New Store
                </Dialog.Title>
                <p className="text-sm text-gray-500 mt-1">
                  Add a new store location to your network
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200 group"
            >
              <X className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Store Name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                Store Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={`w-full pl-4 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                    errors.name 
                      ? "border-red-300 focus:ring-red-500 bg-red-50" 
                      : "border-gray-200 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  }`}
                  placeholder="Enter store name"
                />
                {formData.name && !errors.name && (
                  <CheckCircle className="w-4 h-4 text-green-500 absolute right-3 top-3.5" />
                )}
              </div>
              {errors.name && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errors.name}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  className={`w-full pl-4 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                    errors.location 
                      ? "border-red-300 focus:ring-red-500 bg-red-50" 
                      : "border-gray-200 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  }`}
                  placeholder="Enter store location"
                />
                {formData.location && !errors.location && (
                  <CheckCircle className="w-4 h-4 text-green-500 absolute right-3 top-3.5" />
                )}
              </div>
              {errors.location && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errors.location}
                </div>
              )}
            </div>

            {/* Manager */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Manager
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.manager}
                  onChange={(e) => handleInputChange("manager", e.target.value)}
                  className={`w-full pl-4 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                    errors.manager 
                      ? "border-red-300 focus:ring-red-500 bg-red-50" 
                      : "border-gray-200 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  }`}
                  placeholder="Enter manager name"
                />
                {formData.manager && !errors.manager && (
                  <CheckCircle className="w-4 h-4 text-green-500 absolute right-3 top-3.5" />
                )}
              </div>
              {errors.manager && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errors.manager}
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`w-full pl-4 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                    errors.phone 
                      ? "border-red-300 focus:ring-red-500 bg-red-50" 
                      : "border-gray-200 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  }`}
                  placeholder="Enter phone number"
                />
                {formData.phone && !errors.phone && (
                  <CheckCircle className="w-4 h-4 text-green-500 absolute right-3 top-3.5" />
                )}
              </div>
              {errors.phone && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errors.phone}
                </div>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Status
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleInputChange("status", "Active")}
                  className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                    formData.status === "Active"
                      ? "border-green-500 bg-green-50 text-green-700 font-semibold"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      formData.status === "Active" ? "bg-green-500" : "bg-gray-400"
                    }`} />
                    Active
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange("status", "Inactive")}
                  className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                    formData.status === "Inactive"
                      ? "border-red-500 bg-red-50 text-red-700 font-semibold"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      formData.status === "Inactive" ? "bg-red-500" : "bg-gray-400"
                    }`} />
                    Inactive
                  </div>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 font-semibold shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </div>
                ) : (
                  "Create Store"
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}