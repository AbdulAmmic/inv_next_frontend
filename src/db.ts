import Dexie, { Table } from 'dexie';

// ──────────────────────────────────────────────
// TypeScript interfaces matching tuhanas_db.sql
// Using 'any' for most optional fields to avoid conflicts
// with page-level local type definitions.
// ──────────────────────────────────────────────

export interface Shop {
  id: string;
  name: string;
  location?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at: string;
  is_deleted?: boolean;
  [key: string]: any;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  category?: string;
  price: number;
  cost_price: number;
  supplier_id?: string;
  is_active?: boolean;
  updated_at: string;
  is_deleted?: boolean;
  [key: string]: any;
}

export interface Sale {
  id: string;
  shop_id: string;
  staff_id: string;
  customer_id?: string;
  subtotal: number;
  discount_amount: number;
  other_charges: number;
  total_amount: number;
  status: string;
  payment_method: string;
  note?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  [key: string]: any;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_deleted?: boolean;
  [key: string]: any;
}

export interface Stock {
  id: string;
  shop_id: string;
  product_id: string;
  quantity: number;
  min_quantity: number;
  max_quantity?: number;
  shop_price?: number;
  shop_cost_price?: number;
  updated_at: string;
  is_deleted?: boolean;
  [key: string]: any;
}

export interface Purchase {
  id: string;
  shop_id: string;
  supplier_id?: string;
  total_amount?: number;
  status: string;
  note?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  [key: string]: any;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
  is_deleted?: boolean;
  [key: string]: any;
}

export interface Expense {
  id: string;
  shop_id: string;
  category_id: string;
  amount: number;
  description: string;
  date: string;
  reference?: string;
  created_at?: string;
  updated_at: string;
  is_deleted?: boolean;
  [key: string]: any;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  updated_at: string;
  is_deleted?: boolean;
  [key: string]: any;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_balance?: number;
  created_at?: string;
  updated_at: string;
  is_deleted?: boolean;
  [key: string]: any;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  updated_at: string;
  is_deleted?: boolean;
  [key: string]: any;
}

export interface Transfer {
  id: string;
  from_shop_id: string;
  to_shop_id: string;
  product_id: string;
  quantity: number;
  status: string;
  note?: string;
  created_at?: string;
  updated_at: string;
  is_deleted?: boolean;
  [key: string]: any;
}

export interface Adjustment {
  id: string;
  product_id: string;
  shop_id: string;
  staff_id?: string;
  adjustment_type: string;
  quantity: number;
  note?: string;
  created_at?: string;
  updated_at: string;
  is_deleted?: boolean;
  [key: string]: any;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource?: string;
  resource_id?: string;
  meta?: any;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export interface SyncQueueEntry {
  id?: number;
  entity: string;
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
  error?: string;
}

// ──────────────────────────────────────────────
// Dexie Database Class
// ──────────────────────────────────────────────

export class TuhanasDB extends Dexie {
  shops!: Table<Shop>;
  products!: Table<Product>;
  sales!: Table<Sale>;
  sale_items!: Table<SaleItem>;
  stocks!: Table<Stock>;
  purchases!: Table<Purchase>;
  purchase_items!: Table<PurchaseItem>;
  expenses!: Table<Expense>;
  expense_categories!: Table<ExpenseCategory>;
  customers!: Table<Customer>;
  suppliers!: Table<Supplier>;
  transfers!: Table<Transfer>;
  adjustments!: Table<Adjustment>;
  audit_logs!: Table<AuditLog>;
  sync_queue!: Table<SyncQueueEntry>;

  constructor() {
    super('TuhanasDB');
    this.version(4).stores({
      shops: 'id, name, updated_at, is_deleted',
      products: 'id, name, sku, barcode, category, supplier_id, updated_at, is_deleted',
      sales: 'id, shop_id, staff_id, customer_id, status, created_at, updated_at, is_deleted',
      sale_items: 'id, sale_id, product_id, is_deleted',
      stocks: 'id, shop_id, product_id, updated_at, is_deleted',
      purchases: 'id, shop_id, supplier_id, status, updated_at, is_deleted',
      purchase_items: 'id, purchase_id, product_id, is_deleted',
      expenses: 'id, shop_id, category_id, updated_at, is_deleted',
      expense_categories: 'id, name, updated_at, is_deleted',
      customers: 'id, name, phone, email, updated_at, is_deleted',
      suppliers: 'id, name, updated_at, is_deleted',
      transfers: 'id, from_shop_id, to_shop_id, product_id, status, updated_at, is_deleted',
      adjustments: 'id, product_id, shop_id, staff_id, adjustment_type, updated_at, is_deleted',
      audit_logs: 'id, user_id, action, resource, created_at, is_deleted',
      sync_queue: '++id, entity, entityId, operation, status, timestamp'
    });
  }
}

export const db = new TuhanasDB();
