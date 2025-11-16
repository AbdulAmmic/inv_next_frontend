// src/app/types/products.ts

export type StockStatus = "inStock" | "lowStock" | "outOfStock";

export interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  description?: string;

  // Pricing
  costPrice: number;
  sellingPrice: number;
  profitMargin: number;

  // Stock (for the *current* shop)
  stockQuantity: number;
  min_quantity?: number;
  max_quantity?: number;

  // Ownership / meta
  shop_id?: string | null;
  unit?: string;
  status?: StockStatus;
}
