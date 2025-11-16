export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

export interface StockItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  lastUpdated: string;
  status: StockStatus;
  location: string;
  supplier: string;
}

export interface StockAdjustmentData {
  shop_id: string;
  product_id: string;
  quantity: number;
  reason?: string;
}

export interface StockFilters {
  searchTerm: string;
  category: string;
  status: StockStatus | "all";
  location: string;
}