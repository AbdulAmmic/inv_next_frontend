// src/apiCalls.ts
import axios from "axios";
import { db } from "./db";
import { queueChange, pushChanges, pullUpdates } from "./syncEngine";
import { waitForSync } from "./syncGate";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://inv-flask-api.onrender.com";

// -------------------------------------------------------------
// 🔧 AXIOS INSTANCE
// -------------------------------------------------------------
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

// -------------------------------------------------------------
// 🔧 UTILS
// -------------------------------------------------------------

/**
 * Safely extract an array from an API response.
 * Handles both:
 *   - Raw array response:          [{ ... }, { ... }]
 *   - Wrapped success response:    { success: true, data: [...] }
 *   - Nested data response:        { data: [...] }
 */
const extractArr = (responseData: any): any[] => {
  if (Array.isArray(responseData)) return responseData;
  if (responseData && Array.isArray(responseData.data)) return responseData.data;
  if (responseData && Array.isArray(responseData.items)) return responseData.items;
  return [];
};

/** True if we're in a browser and online */
const isOnline = () => typeof window !== "undefined" && navigator.onLine;

const parseJwt = (token: string) => {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    return null;
  }
};

// -------------------------------------------------------------
// 🔐 REQUEST INTERCEPTOR — Attach Token & Auto Refresh
// -------------------------------------------------------------
api.interceptors.request.use(
  async (config) => {
    if (typeof window !== "undefined") {
      let token = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");

      if (token && refreshToken) {
        const payload = parseJwt(token);
        const now = Date.now() / 1000;

        if (payload && payload.exp - now < 300) {
          try {
            console.log("🔄 Refreshing token...");
            const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refresh_token: refreshToken,
            });

            if (res.data.access_token) {
              token = res.data.access_token;
              localStorage.setItem("access_token", token!);
              console.log("✅ Token flushed");
            }
          } catch (err) {
            console.error("❌ Token refresh failed", err);
          }
        }
      }

      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.clear();
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export { api };

// #############################################################
// 📌 AUTH
// #############################################################
export const loginUser = (email: string, password: string) =>
  api.post(`/auth/login`, { email, password });

export const registerUser = (data: {
  name: string;
  email: string;
  password: string;
  role: string;
  shop_id?: string;
}) => api.post(`/auth/register`, data);


// #############################################################
// 👤 USERS (ADMIN ONLY)
// #############################################################

export const getUsers = () => api.get(`/users`);
export const getUserById = (id: string) => api.get(`/users/${id}`);
export const updateUserById = (id: string, data: any) => api.put(`/users/${id}`, data);
export const deleteUserById = (id: string) => api.delete(`/users/${id}`);


// #############################################################
// 🏪 SHOPS
// #############################################################
export const getShops = async () => {
  if (isOnline()) {
    try {
      const res = await api.get('/shops');
      const shops = extractArr(res.data);
      if (shops.length > 0) await db.shops.bulkPut(shops).catch(() => {});
      return { data: shops };
    } catch (e) { console.warn('getShops API failed, using cache:', e); }
  }
  return { data: await db.shops.toArray() };
};
export const createShop = async (data: { name: string; location?: string }) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const shop = { ...data, id, created_at: now, updated_at: now, is_active: true };
  await db.shops.add(shop);
  await queueChange('shops', id, 'CREATE', shop);
  return { data: shop };
};

// #############################################################
// 📦 PRODUCTS (GLOBAL CATALOG)
// #############################################################
export const getProducts = async (params?: {
  include_stock?: boolean;
  shop_id?: string;
}) => {
  if (isOnline()) {
    try {
      const res = await api.get('/products', { params: params?.shop_id ? { shop_id: params.shop_id } : {} });
      const products = extractArr(res.data);
      if (products.length > 0)
        await db.products.bulkPut(products.map((p: any) => ({ ...p, updated_at: p.updated_at || new Date().toISOString() }))).catch(() => {});

      if (params?.include_stock) {
        // Fetch stocks from API too
        try {
          const sRes = await api.get('/stocks', { params: params.shop_id ? { shop_id: params.shop_id } : {} });
          const stocks = extractArr(sRes.data);
          if (stocks.length > 0) await db.stocks.bulkPut(stocks).catch(() => {});
          return { data: products.map(p => ({
            ...p,
            stock: stocks.find((s: any) => s.product_id === p.id && (!params.shop_id || s.shop_id === params.shop_id))
          })) };
        } catch { /* use products without stock */ }
      }
      return { data: products };
    } catch (e) { console.warn('getProducts API failed, using cache:', e); }
  }
  // Offline fallback
  const products = await db.products.toArray();
  if (params?.include_stock) {
    const stocks = await db.stocks.toArray();
    return { data: products.map(p => ({ ...p, stock: stocks.find(s => s.product_id === p.id && (!params.shop_id || s.shop_id === params.shop_id)) })) };
  }
  return { data: products };
};

export const getProduct = async (id: string) => {
  const p = await db.products.get(id);
  return { data: p };
};

export const createProduct = async (data: any) => {
  const id = data.id || crypto.randomUUID();
  const record = { ...data, id, updated_at: new Date().toISOString() };
  
  await db.products.add(record);
  await queueChange('products', id, 'CREATE', record);
  
  return { data: record };
};

export const updateProduct = async (id: string, data: any) => {
  const updated_at = new Date().toISOString();
  await db.products.update(id, { ...data, updated_at });
  await queueChange('products', id, 'UPDATE', data);
  
  return { data: { id, ...data } };
};

export const deleteProduct = async (id: string) => {
  await db.products.delete(id);
  await queueChange('products', id, 'DELETE', null);
  return { data: { success: true } };
};

// #############################################################
// 📊 STOCK MANAGEMENT (PER SHOP)
// #############################################################
export const getStocks = async (shop_id?: string) => {
  if (isOnline()) {
    try {
      const res = await api.get('/stocks', { params: shop_id ? { shop_id } : {} });
      const allStocks = extractArr(res.data);
      if (allStocks.length > 0) await db.stocks.bulkPut(allStocks).catch(() => {});
      const stocks = shop_id ? allStocks.filter((s: any) => s.shop_id === shop_id) : allStocks;
      // Enrich with product info if missing
      const enriched = await Promise.all(stocks.map(async (s: any) => {
        if (s.productName) return { ...s, currentStock: s.quantity || s.currentStock || 0 };
        const product = await db.products.get(s.product_id);
        return { ...s, productName: product?.name || 'Unknown', sku: product?.sku || '', sellingPrice: s.shop_price || product?.price || 0, currentStock: s.quantity || 0 };
      }));
      return { data: enriched };
    } catch (e) { console.warn('getStocks API failed, using cache:', e); }
  }
  // Offline fallback
  const stocks = shop_id ? await db.stocks.where('shop_id').equals(shop_id).toArray() : await db.stocks.toArray();
  const enriched = await Promise.all(stocks.map(async (s) => {
    const product = await db.products.get(s.product_id);
    return { ...s, productName: product?.name || 'Unknown', sku: product?.sku || '', sellingPrice: s.shop_price || product?.price || 0, currentStock: s.quantity || 0 };
  }));
  return { data: enriched };
};

export const createStock = async (data: any) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const stock = { ...data, id, updated_at: now };
  await db.stocks.add(stock);
  await queueChange('stocks', id, 'CREATE', stock);
  return { data: stock };
};

export const updateStock = async (id: string, data: any) => {
  const now = new Date().toISOString();
  await db.stocks.update(id, { ...data, updated_at: now });
  await queueChange('stocks', id, 'UPDATE', data);
  return { data: { id, ...data } };
};

export const deleteStock = async (id: string) => {
  await db.stocks.delete(id);
  await queueChange('stocks', id, 'DELETE', null);
  return { data: { success: true } };
};

export const adjustStock = async (data: {
  shop_id: string;
  product_id: string;
  quantity: number;
  reason?: string;
}) => {
  const stock = await db.stocks.where({ shop_id: data.shop_id, product_id: data.product_id }).first();
  const now = new Date().toISOString();
  if (stock) {
    const newQty = (stock.quantity || 0) + data.quantity;
    await db.stocks.update(stock.id, { quantity: newQty, updated_at: now });
    await queueChange('stocks', stock.id, 'UPDATE', { quantity: newQty });
  }
  return { data: { success: true } };
};

// ######################
// SALES
// ######################
export const createSale = async (data: any) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const sale = { 
    ...data, 
    id, 
    created_at: now, 
    updated_at: now, 
    status: 'completed' 
  };
  
  await db.sales.add(sale);
  
  // Also add items and update stock
  if (data.items) {
    for (const item of data.items) {
      const itemId = crypto.randomUUID();
      const saleItem = { ...item, id: itemId, sale_id: id };
      await db.sale_items.add(saleItem);

      // DECREMENT STOCK
      const stock = await db.stocks.where({ 
        shop_id: data.shop_id, 
        product_id: item.product_id 
      }).first();

      if (stock) {
        const newQty = (stock.quantity || 0) - (item.quantity || 0);
        await db.stocks.update(stock.id, { quantity: newQty, updated_at: now });
        await queueChange('stocks', stock.id, 'UPDATE', { quantity: newQty });
      }
    }
  }
  
  await queueChange('sales', id, 'CREATE', sale);
  return { data: sale };
};

export const getSales = async (shop_id?: string) => {
  if (isOnline()) {
    try {
      const res = await api.get('/sales', { params: shop_id ? { shop_id } : {} });
      const all = extractArr(res.data);
      if (all.length > 0) await db.sales.bulkPut(all).catch(() => {});
      return { data: shop_id ? all.filter((s: any) => s.shop_id === shop_id) : all };
    } catch (e) { console.warn('getSales API failed, using cache:', e); }
  }
  const sales = shop_id ? await db.sales.where('shop_id').equals(shop_id).toArray() : await db.sales.toArray();
  return { data: sales };
};

export const getSale = async (id: string) => {
  const sale = await db.sales.get(id);
  const items = await db.sale_items.where('sale_id').equals(id).toArray();
  return { data: { sale, items } };
};

export const refundSale = async (id: string) => {
  const now = new Date().toISOString();
  const sale = await db.sales.get(id);
  if (!sale) throw new Error("Sale not found");

  // Update sale status
  await db.sales.update(id, { status: 'refunded', updated_at: now });
  await queueChange('sales', id, 'UPDATE', { status: 'refunded' });

  // Reverse stock changes
  const items = await db.sale_items.where('sale_id').equals(id).toArray();
  for (const item of items) {
    const stock = await db.stocks.where({ 
      shop_id: sale.shop_id, 
      product_id: item.product_id 
    }).first();

    if (stock) {
      const newQty = (stock.quantity || 0) + (item.quantity || 0);
      await db.stocks.update(stock.id, { quantity: newQty, updated_at: now });
      await queueChange('stocks', stock.id, 'UPDATE', { quantity: newQty });
    }
  }

  return { data: { success: true } };
};

// #############################################################
// 🧍 CUSTOMERS
// #############################################################
export const getCustomers = async () => {
  if (isOnline()) {
    try {
      const res = await api.get('/customers');
      const customers = extractArr(res.data);
      if (customers.length > 0) await db.customers.bulkPut(customers).catch(() => {});
      return { data: customers };
    } catch (e) { console.warn('getCustomers API failed, using cache:', e); }
  }
  return { data: await db.customers.toArray() };
};

export const createCustomer = async (data: any) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const customer = { ...data, id, updated_at: now };
  await db.customers.add(customer);
  await queueChange('customers', id, 'CREATE', customer);
  return { data: customer };
};

// #############################################################
// 🧑‍💼 SUPPLIERS
// #############################################################
export const getSuppliers = async () => {
  if (isOnline()) {
    try {
      const res = await api.get('/suppliers');
      const suppliers = extractArr(res.data);
      if (suppliers.length > 0) await db.suppliers.bulkPut(suppliers).catch(() => {});
      return { data: suppliers };
    } catch (e) { console.warn('getSuppliers API failed, using cache:', e); }
  }
  return { data: await db.suppliers.toArray() };
};

export const createSupplier = async (data: any) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const supplier = { ...data, id, updated_at: now };
  await db.suppliers.add(supplier);
  await queueChange('suppliers', id, 'CREATE', supplier);
  return { data: supplier };
};
export const getSupplierTransactions = (id: string) => api.get(`/suppliers/${id}/transactions`);
export const getSupplierSummary = (id: string) => api.get(`/suppliers/${id}/summary`);

// #############################################################
// 🔁 TRANSFERS (Between Shops)
// #############################################################
export const createTransfer = async (data: any) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const transfer = { ...data, id, status: 'pending', created_at: now, updated_at: now };
  
  await db.transfers.add(transfer);
  await queueChange('transfers', id, 'CREATE', transfer);

  // Decrement source stock
  const stock = await db.stocks.where({ 
    shop_id: data.from_shop_id, 
    product_id: data.product_id 
  }).first();

  if (stock) {
    const newQty = (stock.quantity || 0) - (data.quantity || 0);
    await db.stocks.update(stock.id, { quantity: newQty, updated_at: now });
    await queueChange('stocks', stock.id, 'UPDATE', { quantity: newQty });
  }
  
  return { data: transfer };
};

export const getTransfers = async () => {
  if (isOnline()) {
    try {
      const res = await api.get('/transfers');
      const transfers = extractArr(res.data);
      if (transfers.length > 0) await db.transfers.bulkPut(transfers).catch(() => {});
      return { data: transfers };
    } catch (e) { console.warn('getTransfers API failed, using cache:', e); }
  }
  return { data: await db.transfers.toArray() };
};

// #############################################################
// 🛠️ INVENTORY ADJUSTMENTS (BROKEN, LOST, ETC.)
// #############################################################
export const createAdjustment = async (data: {
  shop_id: string;
  product_id: string;
  adjustment_type: string; // 'addition', 'subtraction', 'grievance', 'manual_edit'
  quantity_change: number; // positive for addition, negative for subtraction
  reason?: string;
}) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Get staff from localStorage
  const userRaw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user = userRaw ? JSON.parse(userRaw) : { id: 'unknown' };

  const adjustment = { 
    id, 
    shop_id: data.shop_id,
    product_id: data.product_id,
    adjustment_type: data.adjustment_type,
    quantity: Math.abs(data.quantity_change),
    note: data.reason || 'manual_edit',
    staff_id: user.id,
    created_at: now, 
    updated_at: now 
  };
  
  await db.adjustments.add(adjustment);
  await queueChange('adjustments', id, 'CREATE', adjustment);

  // Update stock levels
  const stock = await db.stocks.where({ 
    shop_id: data.shop_id, 
    product_id: data.product_id 
  }).first();

  if (stock) {
    const newQty = (stock.quantity || 0) + data.quantity_change;
    await db.stocks.update(stock.id, { quantity: newQty, updated_at: now });
    await queueChange('stocks', stock.id, 'UPDATE', { quantity: newQty });
  } else {
    // If no stock exists, create it
    const stockId = crypto.randomUUID();
    const newStock = {
      id: stockId,
      shop_id: data.shop_id,
      product_id: data.product_id,
      quantity: data.quantity_change > 0 ? data.quantity_change : 0,
      min_quantity: 0,
      updated_at: now
    };
    await db.stocks.add(newStock);
    await queueChange('stocks', stockId, 'CREATE', newStock);
  }
  
  return { data: adjustment };
};

export const getAdjustments = async (shop_id?: string) => {
  // No dedicated API endpoint — read from Dexie (populated via sync/pull)
  const adjustments = shop_id
    ? await db.adjustments.where('shop_id').equals(shop_id).toArray()
    : await db.adjustments.toArray();
  return { data: adjustments };
};

// #############################################################
// PURCHASES
// #############################################################
export const createPurchase = async (data: any) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const purchase = { ...data, id, created_at: now, updated_at: now, status: 'pending' };
  
  await db.purchases.add(purchase);
  if (data.items) {
    for (const item of data.items) {
      await db.purchase_items.add({ ...item, id: crypto.randomUUID(), purchase_id: id });
    }
  }
  await queueChange('purchases', id, 'CREATE', purchase);
  return { data: purchase };
};

export const getPurchases = async (shop_id?: string) => {
  if (isOnline()) {
    try {
      const res = await api.get('/purchases', { params: shop_id ? { shop_id } : {} });
      const all = extractArr(res.data);
      if (all.length > 0) await db.purchases.bulkPut(all).catch(() => {});
      return { data: shop_id ? all.filter((p: any) => p.shop_id === shop_id) : all };
    } catch (e) { console.warn('getPurchases API failed, using cache:', e); }
  }
  const purchases = shop_id ? await db.purchases.where('shop_id').equals(shop_id).toArray() : await db.purchases.toArray();
  return { data: purchases };
};

export const getPurchase = async (id: string) => {
  const purchase = await db.purchases.get(id);
  const items = await db.purchase_items.where('purchase_id').equals(id).toArray();
  return { data: { ...purchase, items } as any };
};

export const updatePurchase = async (id: string, data: any) => {
  const now = new Date().toISOString();
  await db.purchases.update(id, { ...data, updated_at: now });
  await queueChange('purchases', id, 'UPDATE', data);
  return { data: { id, ...data } };
};

export const receivePurchase = async (id: string, payload: any) => {
  const now = new Date().toISOString();
  const purchase = await db.purchases.get(id);
  if (!purchase) throw new Error("Purchase not found");

  // Update purchase status
  await db.purchases.update(id, { status: 'received', updated_at: now });
  await queueChange('purchases', id, 'UPDATE', { status: 'received' });

  // payload.items contains the form data with received_quantity per item
  const payloadItems: any[] = payload?.items || [];

  // Build a map of item_id → received_quantity from the form
  const receivedQtyMap: Record<string, number> = {};
  for (const pi of payloadItems) {
    if (!pi.is_cancelled) {
      receivedQtyMap[pi.id] = Number(pi.received_quantity || 0);
    }
  }

  // Fetch all purchase items for this purchase
  const items = await db.purchase_items.where('purchase_id').equals(id).toArray();

  for (const item of items) {
    // Use received_quantity from form if available, fallback to ordered quantity
    const receivedQty = receivedQtyMap[item.id] ?? Number(item.quantity || 0);

    // Skip if nothing was received for this item
    if (receivedQty <= 0) continue;

    // Update purchase_item with actual received quantity
    await db.purchase_items.update(item.id, {
      quantity: receivedQty,
      updated_at: now
    } as any);

    // Find stock record for this product in this shop
    const stock = await db.stocks
      .where({ shop_id: purchase.shop_id, product_id: item.product_id })
      .first();

    if (stock) {
      const newQty = (stock.quantity || 0) + receivedQty;
      await db.stocks.update(stock.id, { quantity: newQty, updated_at: now });
      await queueChange('stocks', stock.id, 'UPDATE', { quantity: newQty, updated_at: now });
      console.log(`✅ Stock updated: product=${item.product_id}, +${receivedQty} → total=${newQty}`);
    } else {
      // No stock record yet — create one
      const stockId = crypto.randomUUID();
      const newStock = {
        id: stockId,
        shop_id: purchase.shop_id,
        product_id: item.product_id,
        quantity: receivedQty,
        min_quantity: 0,
        updated_at: now
      };
      await db.stocks.add(newStock);
      await queueChange('stocks', stockId, 'CREATE', newStock);
      console.log(`🆕 Stock created: product=${item.product_id}, qty=${receivedQty}`);
    }
  }

  return { data: { success: true, message: `Stock updated for ${items.length} items` } };
};

// #############################################################
// 💸 EXPENSES
// #############################################################
export const getExpenseCategories = async () => {
  if (isOnline()) {
    try {
      const res = await api.get('/expenses/categories');
      const cats = extractArr(res.data);
      if (cats.length > 0) await db.expense_categories.bulkPut(cats).catch(() => {});
      return { data: cats };
    } catch (e) { console.warn('getExpenseCategories API failed, using cache:', e); }
  }
  return { data: await db.expense_categories.toArray() };
};

export const createExpenseCategory = async (data: { name: string }) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const cat = { ...data, id, updated_at: now };
  await db.expense_categories.add(cat);
  await queueChange('expense_categories', id, 'CREATE', cat);
  return { data: cat };
};

export const getExpenses = async (shop_id?: string) => {
  if (isOnline()) {
    try {
      const res = await api.get('/expenses', { params: shop_id ? { shop_id } : {} });
      const all = extractArr(res.data);
      if (all.length > 0) await db.expenses.bulkPut(all).catch(() => {});
      return { data: shop_id ? all.filter((e: any) => e.shop_id === shop_id) : all };
    } catch (e) { console.warn('getExpenses API failed, using cache:', e); }
  }
  const expenses = shop_id ? await db.expenses.where('shop_id').equals(shop_id).toArray() : await db.expenses.toArray();
  return { data: expenses };
};

export const createExpense = async (data: any) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const expense = { ...data, id, created_at: now, updated_at: now };
  await db.expenses.add(expense);
  await queueChange('expenses', id, 'CREATE', expense);
  return { data: expense };
};

export const deleteExpense = async (id: string) => {
  await db.expenses.delete(id);
  await queueChange('expenses', id, 'DELETE', null);
  return { data: { success: true } };
};

// #############################################################
// 📈 REPORTS
// #############################################################
export const getDailySales = (shop_id?: string) => api.get(`/reports/daily-sales`, { params: { shop_id } });
export const getInventoryReport = (shop_id?: string) => api.get(`/reports/inventory`, { params: { shop_id } });

// #############################################################
// 📊 AUDIT LOGS (ADMIN ONLY)
// #############################################################
export const getAuditLogs = () => api.get(`/audit-logs`);

// #############################################################
// 🔙 BACKUP (ADMIN ONLY)
// #############################################################
export const downloadBackup = (params?: any) => api.get(`/admin/backup`, { params });
export const getBackupEmails = () => api.get(`/admin/backup-emails`);
export const addBackupEmail = (email: string) => api.post(`/admin/backup-emails`, { email });
export const deleteBackupEmail = (id: string) => api.delete(`/admin/backup-emails/${id}`);

// #############################################################
// ⚙ HEALTH
// #############################################################
export const healthCheck = () => api.get(`/health`);

// SYNC UTILS
export { pushChanges, pullUpdates };
