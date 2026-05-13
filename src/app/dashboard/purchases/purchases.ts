// app/types/purchases.ts
export interface PurchaseItem {
  id?: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  cost_price: number;
  selling_price?: number;
  total_cost: number;
}

interface Purchase {
  id: string;
  purchase_number: string;
  supplier_id: string;
  supplier_name: string;
  shop_id: string;
  shop_name: string;

  total_amount: number;
  vat_percent?: number;
  other_charges?: number;
  loss_amount?: number;

  container_number?: string;

  status: "ordered" | "receiving" | "received" | "cancelled";
  date: string;
  items: any[];
}


export interface PurchaseFormData {
  supplier_id: string;
  shop_id: string;
  items: {
    product_id: string;
    quantity: number;
    cost_price: number;
    selling_price?: number;
  }[];
}