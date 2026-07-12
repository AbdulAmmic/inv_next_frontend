"use client";

import { useState, useEffect } from "react";
import {
  createProduct,
  updateProduct,
  getShops,
  getProduct,
  createStock,
  createAdjustment,
} from "@/apiCalls";
import type { Product } from "@/app/types/products";
import { toast } from "react-toastify";

interface Shop {
  id: string;
  name: string;
}

interface ProductFormModalProps {
  product?: Product;
  onClose: () => void;
  onSave: (p: Product) => void;
}

export default function ProductFormModal({
  product,
  onClose,
  onSave,
}: ProductFormModalProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);

  // Current shop from localStorage
  const initialShopId =
    typeof window !== "undefined"
      ? localStorage.getItem("selected_shop_id") || ""
      : "";

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    description: "",
    barcode: "",
    supplier_id: "",
    quantity: 0,
    min_quantity: 0,
    max_quantity: undefined as number | undefined,
    price: 0,
    cost_price: 0,
    shop_id: initialShopId,
    shelf_location: "",
    unit: "",
  });

  const [initialQuantity, setInitialQuantity] = useState(0);

  // Pharmacy-style sub-unit selling: one base unit (e.g. pack) contains
  // `per_base` of this unit (e.g. 10 cards), each sold at `price`.
  const [subUnits, setSubUnits] = useState<{ name: string; per_base: number; price: number }[]>([]);

  // -------------------------------------------
  // Load shops + for edit mode load product
  // -------------------------------------------
  useEffect(() => {
    const loadShops = async () => {
      try {
        const res = await getShops();
        setShops(res.data || []);
      } catch (e) {
        toast.error("Failed to load shops");
      }
    };

    loadShops();

    if (product) {
      loadProductDetails(product.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const loadProductDetails = async (id: string) => {
    try {
      const res = await getProduct(id);
      const p = res.data;
      const initialQty = p.stock?.quantity ?? 0;

      setInitialQuantity(initialQty);

      setFormData((prev) => ({
        ...prev,
        name: p.name ?? "",
        sku: p.sku ?? "",
        category: p.category ?? "",
        description: p.description ?? "",
        barcode: p.barcode ?? "",
        supplier_id: p.supplier_id ?? "",
        unit: p.unit ?? "",
        quantity: initialQty,
        min_quantity: p.stock?.min_quantity ?? 0,
        max_quantity: p.stock?.max_quantity ?? undefined,
        price: p.stock?.price ?? p.price ?? 0,
        cost_price: p.stock?.cost_price ?? p.cost_price ?? 0,
        shop_id: p.stock?.shop_id ?? initialShopId,
        shelf_location: p.stock?.shelf_location ?? "",
      }));
      setSubUnits(Array.isArray(p.sub_units) ? p.sub_units : []);
    } catch (e) {
      toast.error("Failed to load product details");
    }
  };

  const updateField = (key: string, value: any) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  // -------------------------------------------
  // Submit (create / update)
  // -------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!formData.shop_id && !product) {
      toast.error("Please select a shop");
      return;
    }

    setLoading(true);
    try {
      // Global product payload (no shop/quantity here)
      const productPayload = {
        name: formData.name.trim(),
        sku: formData.sku || `SKU-${Date.now()}`,
        barcode: formData.barcode || undefined,
        category: formData.category || undefined,
        description: formData.description || undefined,
        unit: formData.unit || undefined,
        sub_units: subUnits.filter((u) => u.name.trim() && u.per_base > 0),
        price: Number(formData.price) || 0,
        cost_price: Number(formData.cost_price) || 0,
        supplier_id: formData.supplier_id || undefined,
      };

      let saved: any;

      if (product) {
        // UPDATE PRODUCT
        const res = await updateProduct(product.id, productPayload);
        saved = res.data;

        // If stock quantity was manually edited, record a grievance
        if (formData.quantity !== initialQuantity && formData.shop_id) {
           const diff = formData.quantity - initialQuantity;
           await createAdjustment({
             shop_id: formData.shop_id,
             product_id: product.id,
             adjustment_type: "manual_edit",
             quantity_change: diff,
             reason: `Manual edit via product form (Discrepancy: ${diff})`
           });
        }

      } else {
        // CREATE PRODUCT
        const res = await createProduct({
          ...productPayload,
          shop_id: formData.shop_id, // backend may use this to attach default stock
          quantity: formData.quantity || 0,
          shelf_location: formData.shelf_location || undefined,
        });
        saved = res.data.product || res.data;
      }

      // If this is a *new* product and we specified quantity, ensure stock row exists
      if (!product && formData.quantity > 0 && formData.shop_id) {
        try {
          await createStock({
            product_id: saved.id,
            shop_id: formData.shop_id,
            quantity: formData.quantity,
            min_quantity: formData.min_quantity,
            max_quantity: formData.max_quantity,
            shelf_location: formData.shelf_location || undefined,
          });
        } catch (err) {
          console.warn("Stock creation failed/skipped:", err);
        }
      }

      const finalProduct: Product = {
        id: saved.id,
        name: saved.name,
        sku: saved.sku,
        barcode: saved.barcode,
        category: saved.category,
        description: saved.description,
        costPrice: Number(saved.cost_price),
        sellingPrice: Number(saved.price),
        profitMargin:
          Number(saved.price) - Number(saved.cost_price ?? 0),
        stockQuantity: formData.quantity,
        min_quantity: formData.min_quantity,
        max_quantity: formData.max_quantity,
        shelfLocation: formData.shelf_location || undefined,
        unit: saved.unit ?? formData.unit,
        shop_id: formData.shop_id || null,
      };

      onSave(finalProduct);
      toast.success(product ? "Product updated" : "Product created");
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------
  // UI
  // -------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {product ? "Edit Product" : "Add Product"}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {/* SHOP */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Shop {product ? "" : "*"}
            </label>
            <select
              value={formData.shop_id}
              onChange={(e) => updateField("shop_id", e.target.value)}
              disabled={Boolean(product)} // don't change shop when editing
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select shop</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          {/* NAME */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* CATEGORY + UNIT */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => updateField("category", e.target.value)}
                placeholder="e.g. Drinks, Groceries"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Unit
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => updateField("unit", e.target.value)}
                placeholder="e.g. Pack, Piece, Tube"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* PRICING */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Cost Price *
              </label>
              <input
                type="number"
                min={0}
                value={formData.cost_price}
                onChange={(e) =>
                  updateField("cost_price", Number(e.target.value) || 0)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Selling Price *
              </label>
              <input
                type="number"
                min={0}
                value={formData.price}
                onChange={(e) =>
                  updateField("price", Number(e.target.value) || 0)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
          </div>

          {/* SUB-UNITS (pharmacy: sell tablets/cards out of a pack) */}
          <div className="rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Sell in smaller units{formData.unit ? ` (per ${formData.unit})` : ""}
              </label>
              <button
                type="button"
                onClick={() => setSubUnits((prev) => [...prev, { name: "", per_base: 0, price: 0 }])}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                + Add unit
              </button>
            </div>
            {subUnits.length === 0 && (
              <p className="text-xs text-gray-400">
                Optional — e.g. a {formData.unit || "pack"} contains 10 cards sold at ₦200 each.
              </p>
            )}
            {subUnits.map((u, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                <div>
                  <label className="mb-1 block text-[11px] text-gray-500">Unit name</label>
                  <input
                    type="text"
                    value={u.name}
                    onChange={(e) => setSubUnits((prev) => prev.map((s, i) => i === idx ? { ...s, name: e.target.value } : s))}
                    placeholder="e.g. Card"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-gray-500">Per {formData.unit || "base unit"}</label>
                  <input
                    type="number"
                    min={0}
                    value={u.per_base || ""}
                    onChange={(e) => setSubUnits((prev) => prev.map((s, i) => i === idx ? { ...s, per_base: Number(e.target.value) || 0 } : s))}
                    placeholder="10"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-gray-500">Price each</label>
                  <input
                    type="number"
                    min={0}
                    value={u.price || ""}
                    onChange={(e) => setSubUnits((prev) => prev.map((s, i) => i === idx ? { ...s, price: Number(e.target.value) || 0 } : s))}
                    placeholder="200"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSubUnits((prev) => prev.filter((_, i) => i !== idx))}
                  className="p-2 mb-0.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                  title="Remove unit"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* STOCK – only when shop selected */}
          {formData.shop_id && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Qty
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.quantity}
                  onChange={(e) =>
                    updateField("quantity", Number(e.target.value) || 0)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Min
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.min_quantity}
                  onChange={(e) =>
                    updateField("min_quantity", Number(e.target.value) || 0)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Max
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.max_quantity ?? ""}
                  onChange={(e) =>
                    updateField(
                      "max_quantity",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-3">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Shelf / location (e.g. "A1")
                </label>
                <input
                  type="text"
                  value={formData.shelf_location}
                  onChange={(e) => updateField("shelf_location", e.target.value)}
                  placeholder="Where this item is physically kept"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* DESCRIPTION */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                updateField("description", e.target.value)
              }
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {/* BARCODE */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Barcode
            </label>
            <input
              type="text"
              value={formData.barcode}
              onChange={(e) => updateField("barcode", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {/* ACTIONS */}
          <div className="mt-3 flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading
                ? "Saving..."
                : product
                ? "Update Product"
                : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
