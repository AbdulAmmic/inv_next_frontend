// src/apiCalls.ts
import axios from "axios";
import { db } from "./db";
import { queueChange, pushChanges, pullUpdates } from "./syncEngine";
import { waitForSync } from "./syncGate";
import { getApiBase, resolveApiBase } from "./apiBase";

// -------------------------------------------------------------
// 🔧 AXIOS INSTANCE
// -------------------------------------------------------------
// baseURL is re-pinned per request from apiBase.ts (runtime tunnel-URL
// discovery), so a changed tunnel hostname applies without an app restart.
const api = axios.create({
  baseURL: getApiBase(),
  timeout: 15000, // Faster fallback to local cache
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

const isNetworkError = (error: any) => {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  return (
    msg.includes("network error") ||
    msg.includes("timeout") ||
    msg.includes("cancel") ||
    error.code === "ECONNABORTED" ||
    error.code === "ERR_NETWORK"
  );
};

/**
 * Batch-fetch products by id in a single Dexie call instead of one `.get()`
 * per row — enriching a few hundred stock/sale-item rows individually was
 * a major source of page-load lag.
 */
const bulkGetProductMap = async (productIds: (string | undefined | null)[]): Promise<Map<string, any>> => {
  const uniqueIds = Array.from(new Set(productIds.filter((id): id is string => Boolean(id))));
  if (uniqueIds.length === 0) return new Map();
  const products = await db.products.bulkGet(uniqueIds);
  const map = new Map<string, any>();
  products.forEach((p, i) => {
    if (p) map.set(uniqueIds[i], p);
  });
  return map;
};

const normalizePurchaseItems = (items: any[] = []) =>
  items.map((item) => {
    const ordered_quantity = Number(item.ordered_quantity ?? item.quantity ?? 0);
    const cost = Number(item.cost ?? item.cost_price ?? item.unit_price ?? 0);
    const selling_price = item.selling_price === undefined || item.selling_price === null || item.selling_price === ""
      ? undefined
      : Number(item.selling_price);

    return {
      ...item,
      product_id: item.product_id,
      quantity: ordered_quantity,
      ordered_quantity,
      received_quantity: Number(item.received_quantity ?? 0),
      cost,
      cost_price: cost,
      selling_price,
      total_price: cost * ordered_quantity,
    };
  });

const normalizePurchase = (purchase: any, items?: any[]) => {
  const normalizedItems = normalizePurchaseItems(items ?? purchase?.items ?? []);
  const total_amount = Number(
    purchase?.total_amount ??
    normalizedItems.reduce((sum, item) => sum + Number(item.cost || 0) * Number(item.ordered_quantity || 0), 0)
  );

  return {
    ...purchase,
    status: purchase?.status || "ordered",
    total_amount,
    items: normalizedItems,
  };
};

export const buildLocalStats = async (shop_id?: string, start_date?: string, end_date?: string) => {
  const CACHE_KEY = `local_stats_${shop_id || 'global'}_${start_date || 'all'}_${end_date || 'all'}`;

  try {
    const [products, customers, suppliers, stocks, allSales, allPurchases, allExpenses, allGrievances] = await Promise.all([
      db.products.filter((p: any) => !p.is_deleted).toArray(),
      db.customers.filter((c: any) => !c.is_deleted).toArray(),
      db.suppliers.filter((s: any) => !s.is_deleted).toArray(),
      shop_id
        ? db.stocks.where('shop_id').equals(shop_id).filter((s: any) => !s.is_deleted).toArray()
        : db.stocks.filter((s: any) => !s.is_deleted).toArray(),
      shop_id
        ? db.sales.where('shop_id').equals(shop_id).filter((s: any) => !s.is_deleted).toArray()
        : db.sales.filter((s: any) => !s.is_deleted).toArray(),
      shop_id
        ? db.purchases.where('shop_id').equals(shop_id).filter((p: any) => !p.is_deleted).toArray()
        : db.purchases.filter((p: any) => !p.is_deleted).toArray(),
      shop_id
        ? db.expenses.where('shop_id').equals(shop_id).filter((e: any) => !e.is_deleted).toArray()
        : db.expenses.filter((e: any) => !e.is_deleted).toArray(),
      shop_id
        ? db.adjustments.where('shop_id').equals(shop_id).filter((a: any) => a.adjustment_type === 'grievance' && !a.is_deleted).toArray()
        : db.adjustments.filter((a: any) => a.adjustment_type === 'grievance' && !a.is_deleted).toArray(),
    ]);

    // Date filtering helper
    const isWithinRange = (dateStr: string) => {
      if (!start_date && !end_date) return true;
      if (!dateStr) return false;
      const d = new Date(dateStr).getTime();
      const start = start_date ? new Date(start_date).getTime() : 0;
      const end = end_date ? new Date(end_date).setHours(23, 59, 59, 999) : Infinity;
      return d >= start && d <= end;
    };

    const sales = allSales.filter((s: any) => isWithinRange(s.created_at));
    const purchases = allPurchases.filter((p: any) => isWithinRange(p.created_at));
    const expenses = allExpenses.filter((e: any) => isWithinRange(e.created_at));
    const grievances = allGrievances.filter((g: any) => isWithinRange(g.created_at));

    // Only completed (non-refunded, non-cancelled) sales
    const completedSales = sales.filter((sale: any) =>
      (sale.status || 'completed') === 'completed'
    );

    const completedSaleIds = completedSales.map((s: any) => s.id);

    // Fetch sale items optimized (only for completed sales in range, not entire table)
    const saleItems = completedSaleIds.length > 0
      ? await db.sale_items.where('sale_id').anyOf(completedSaleIds).toArray()
      : [];

    const total_sales_amount = completedSales.reduce(
      (sum: number, sale: any) => sum + Number(sale.total_amount || 0), 0
    );

    const total_expenses = expenses.reduce(
      (sum: number, expense: any) => sum + Number(expense.amount || 0), 0
    );

    const total_purchase_amount = purchases.reduce(
      (sum: number, purchase: any) => sum + Number(purchase.total_amount || 0), 0
    );

    // Build shop-specific cost map with compound keys for accurate COGS
    const shopCostMap = new Map<string, number>();
    for (const stock of stocks) {
      const cost = Number(
        (stock as any).shop_cost_price ?? (stock as any).cost_price ?? 0
      );
      shopCostMap.set(`${stock.shop_id}_${stock.product_id}`, cost);
    }

    // O(1) product lookups — this used to be products.find() inside every
    // reduce below, an O(products × rows) scan repeated 4 times (hundreds
    // of thousands of comparisons on a real product/stock catalog).
    const productMap = new Map(products.map((p: any) => [p.id, p]));

    const total_grievance_cost = grievances.reduce((sum: number, g: any) => {
      const shopCost = shopCostMap.get(`${g.shop_id}_${g.product_id}`);
      const product = productMap.get(g.product_id);
      const cost = shopCost ?? Number(product?.cost_price || 0);
      return sum + Number(g.quantity || 0) * cost;
    }, 0);
    
    // Grievances are considered a form of expense (cost of damaged goods)
    const combined_expenses = total_expenses + total_grievance_cost;

    const saleShopMap = new Map<string, string>();
    for (const sale of completedSales) {
      saleShopMap.set(sale.id, sale.shop_id);
    }
    
    // Deduplicate sale items to prevent COGS double-counting from offline sync
    const uniqueSaleItemsMap = new Map<string, any>();
    for (const item of saleItems) {
      uniqueSaleItemsMap.set(`${item.sale_id}_${item.product_id}`, item);
    }
    
    const total_cost_of_goods_sold = Array.from(uniqueSaleItemsMap.values()).reduce((sum: number, item: any) => {
      // Prefer the cost snapshot taken at sale time (item.cost_price) —
      // falling back to today's shop/product cost for older sale_items
      // recorded before that snapshot existed. Without the snapshot, a
      // supplier price change today silently rewrites the profit of every
      // historical sale of that product.
      const shopId = saleShopMap.get(item.sale_id);
      const shopCost = shopId ? shopCostMap.get(`${shopId}_${item.product_id}`) : undefined;
      const product = productMap.get(item.product_id);
      const cost = item.cost_price ?? shopCost ?? Number(product?.cost_price || 0);
      return sum + Number(item.quantity || 0) * Number(cost);
    }, 0);

    // Inventory values using shop_cost_price / shop_price where available
    const inventory_cost_value = stocks.reduce((sum: number, stock: any) => {
      const product = productMap.get(stock.product_id);
      const cost = Number(stock.shop_cost_price ?? stock.cost_price ?? product?.cost_price ?? 0);
      return sum + Number(stock.quantity || 0) * cost;
    }, 0);

    const inventory_selling_value = stocks.reduce((sum: number, stock: any) => {
      const product = productMap.get(stock.product_id);
      const price = Number(stock.shop_price ?? stock.price ?? product?.price ?? 0);
      return sum + Number(stock.quantity || 0) * price;
    }, 0);

    const gross_profit = total_sales_amount - total_cost_of_goods_sold;
    const net_profit = gross_profit - combined_expenses;

    const result = {
      shop_id,
      total_sales_amount: Math.round(total_sales_amount * 100) / 100,
      total_sales_count: completedSales.length,
      total_purchase_amount: Math.round(total_purchase_amount * 100) / 100,
      total_purchases_count: purchases.length,
      total_expenses: Math.round(combined_expenses * 100) / 100,
      total_expenses_count: expenses.length,
      inventory_cost_value: Math.round(inventory_cost_value * 100) / 100,
      inventory_selling_value: Math.round(inventory_selling_value * 100) / 100,
      low_stock_count: stocks.filter((s: any) => Number(s.quantity || 0) <= Number(s.min_quantity || 0)).length,
      out_of_stock_count: stocks.filter((s: any) => Number(s.quantity || 0) <= 0).length,
      customers_count: customers.length,
      suppliers_count: suppliers.length,
      products_count: shop_id ? stocks.length : products.length,
      gross_profit: Math.round(gross_profit * 100) / 100,
      net_profit: Math.round(net_profit * 100) / 100,
    };

    // Cache in sessionStorage so page refreshes don't show blanks
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } catch { /* storage full — skip */ }

    return result;
  } catch (dbErr) {
    console.warn('buildLocalStats DB error, checking sessionStorage cache:', dbErr);
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch { /* ignore */ }

    // Absolute fallback — zero state
    return {
      shop_id,
      total_sales_amount: 0, total_sales_count: 0,
      total_purchase_amount: 0, total_purchases_count: 0,
      total_expenses: 0, total_expenses_count: 0,
      inventory_cost_value: 0, inventory_selling_value: 0,
      low_stock_count: 0, out_of_stock_count: 0,
      customers_count: 0, suppliers_count: 0, products_count: 0,
      gross_profit: 0, net_profit: 0,
    };
  }
};

// -------------------------------------------------------------
// 🔐 REQUEST INTERCEPTOR — Attach Token & Auto Refresh
// -------------------------------------------------------------
api.interceptors.request.use(
  async (config) => {
    // Pin to the currently-discovered API base on every request
    config.baseURL = getApiBase();
    if (typeof window !== "undefined") {
      let token = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");

      if (token && refreshToken) {
        const payload = parseJwt(token);
        const now = Date.now() / 1000;

        // Refresh proactively if token expires within 5 minutes
        if (payload && payload.exp - now < 300) {
          try {
            console.log("🔄 Refreshing token...");
            const res = await axios.post(`${getApiBase()}/auth/refresh`, {
              refresh_token: refreshToken,
            });

            if (res.data.access_token) {
              token = res.data.access_token;
              localStorage.setItem("access_token", token!);
              console.log("✅ Token refreshed");
            }
          } catch (err) {
            // Refresh failed — continue with the existing token.
            // The response interceptor will handle a 401 if the token is truly expired.
            console.warn("⚠️ Token refresh failed — using existing token", err);
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
    // A network-level failure may mean the tunnel hostname changed — kick
    // off discovery (rate-limited internally) so the next request heals.
    if (isNetworkError(error)) {
      resolveApiBase();
    }
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // Clear ONLY auth keys. localStorage.clear() also wiped the sync
      // watermark (last_sync_timestamp) and offline caches (shop settings,
      // cached users), forcing a full re-pull and breaking offline receipts
      // after every session expiry.
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
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


export const getUsers = async () => {
  if (isOnline()) {
    try {
      const res = await api.get(`/users`);
      if (typeof window !== "undefined" && res.data) {
        localStorage.setItem("cached_users", JSON.stringify(res.data));
      }
      return res;
    } catch (e) {
      console.warn("getUsers backend failed, using cache:", e);
    }
  }
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("cached_users");
      if (cached) return { data: JSON.parse(cached) };
    } catch (err) {
      console.warn("getUsers failed to parse cached users:", err);
    }
  }
  return { data: [] };
};

export const getUserById = (id: string) => api.get(`/users/${id}`);
export const updateUserById = (id: string, data: any) => api.put(`/users/${id}`, data);
export const deleteUserById = (id: string) => api.delete(`/users/${id}`);
// #############################################################
// ⚙️ SHOP SETTINGS (refund policy, receipt footer, etc.)
// #############################################################

// Key used for localStorage caching
const shopSettingsKey = (shop_id: string) => `shop_settings_${shop_id}`;

export const getShopSettings = async (shop_id: string) => {
  // 1. Try the backend first when online (also refreshes cache)
  if (isOnline()) {
    try {
      const res = await api.get(`/shops/${shop_id}/settings`);
      const settings = res.data?.settings || res.data || {};
      // Persist to localStorage for offline use
      if (typeof window !== 'undefined') {
        localStorage.setItem(shopSettingsKey(shop_id), JSON.stringify(settings));
      }
      return { data: settings };
    } catch (e) {
      console.warn('getShopSettings backend failed, using local cache:', e);
    }
  }

  // 2. Offline: read from localStorage cache
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(shopSettingsKey(shop_id));
    if (cached) {
      try { return { data: JSON.parse(cached) }; } catch {}
    }

    // 3. Last resort: check if shop row in Dexie has embedded settings
    try {
      const shop = await db.shops.get(shop_id);
      if (shop && (shop as any).settings) {
        return { data: (shop as any).settings };
      }
    } catch {}
  }

  return { data: {} };
};

export const updateShopSettings = async (shop_id: string, settings: any) => {
  // Always write to localStorage immediately so receipts work offline right away
  if (typeof window !== 'undefined') {
    localStorage.setItem(shopSettingsKey(shop_id), JSON.stringify(settings));
  }

  // Also persist into Dexie so the sync queue can push it
  try {
    const existing = await db.shops.get(shop_id);
    if (existing) {
      const updated = { ...existing, settings, updated_at: new Date().toISOString() };
      await db.shops.put(updated);
      // Queue for backend sync — no updated_at in the payload: device
      // wall-clock time there triggers false conflict rejections on
      // devices whose clock runs behind the server.
      await queueChange('shops', shop_id, 'UPDATE', { settings });
    }
  } catch (e) {
    console.warn('Could not persist shop settings to Dexie:', e);
  }

  // If online, push to backend immediately
  if (isOnline()) {
    try {
      const res = await api.put(`/shops/${shop_id}/settings`, settings);
      const updated = res.data?.settings || res.data || settings;
      // Re-write confirmed data from server
      if (typeof window !== 'undefined') {
        localStorage.setItem(shopSettingsKey(shop_id), JSON.stringify(updated));
      }
      return { data: updated };
    } catch (e) {
      console.warn('updateShopSettings backend push failed, queued for later sync:', e);
    }
  }

  // Offline — return the local version, will sync when online
  return { data: settings };
};



// #############################################################
// 🏪 SHOPS
// #############################################################
export const getShops = async () => {
  if (isOnline()) {
    try {
      const res = await api.get('/shops');
      const shops = extractArr(res.data);
      if (shops.length > 0) db.shops.bulkPut(shops).catch(() => {});
      return { data: shops };
    } catch (e) {
      console.warn('getShops API failed, falling back to cache:', e);
    }
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
      const res = await api.get('/products', { 
        params: { 
          shop_id: params?.shop_id || undefined,
          include_stock: params?.include_stock || false
        } 
      });
      const products = extractArr(res.data);
      
      if (products.length > 0) {
        // Background cache update
        db.products.bulkPut(products.map((p: any) => ({ ...p, updated_at: p.updated_at || new Date().toISOString() }))).catch(() => {});
        
        // If the backend already included stock, cache those too
        if (params?.include_stock) {
          const stocks = products.map((p: any) => p.stock).filter(Boolean);
          if (stocks.length > 0) db.stocks.bulkPut(stocks).catch(() => {});
        }
      }
      return { data: products };
    } catch (e) {
      console.warn('getProducts API failed, falling back to cache:', e);
    }
  }

  // Offline fallback
  const products = await db.products.filter((p: any) => !p.is_deleted).toArray();
  if (params?.include_stock) {
    const allStocks = await db.stocks.filter((s: any) => !s.is_deleted).toArray();
    const relevantStocks = params.shop_id
      ? allStocks.filter((s) => s.shop_id === params.shop_id)
      : allStocks;
    // Map instead of a per-product .find() scan — was O(products × stocks).
    const stockByProductId = new Map<string, any>();
    for (const s of relevantStocks) {
      if (!stockByProductId.has(s.product_id)) stockByProductId.set(s.product_id, s);
    }
    return { data: products.map(p => ({ ...p, stock: stockByProductId.get(p.id) })) };
  }
  return { data: products };
};

export const getProduct = async (id: string) => {
  if (isOnline()) {
    try {
      const res = await api.get(`/products/${id}`);
      const product = res.data;
      if (product) {
        await db.products.put({ ...product, updated_at: product.updated_at || new Date().toISOString() });
      }
      return { data: product };
    } catch (e: any) {
      if (e.response?.status === 404) {
        throw new Error('Product not found');
      }
      console.warn('getProduct API failed, falling back to cache:', e);
    }
  }

  const p = await db.products.get(id);
  return { data: p };
};

export const createProduct = async (data: any) => {
  const id = data.id || crypto.randomUUID();
  const record = { ...data, id, updated_at: new Date().toISOString() };

  // Atomic: a crash between the Dexie write and queueChange would otherwise
  // leave a product that exists locally but never syncs (or vice versa).
  await db.transaction('rw', db.products, db.sync_queue, async () => {
    await db.products.add(record);
    await queueChange('products', id, 'CREATE', record);
  });

  return { data: record };
};

export const updateProduct = async (id: string, data: any) => {
  const updated_at = new Date().toISOString();

  // Atomic: a crash between the Dexie write and queueChange would otherwise
  // leave a product that is updated locally but never syncs.
  await db.transaction('rw', db.products, db.sync_queue, async () => {
    await db.products.update(id, { ...data, updated_at });
    await queueChange('products', id, 'UPDATE', data);
  });

  return { data: { id, ...data } };
};

export const deleteProduct = async (id: string) => {
  const now = new Date().toISOString();

  // Soft-delete locally so the record survives until the sync queue pushes
  // the DELETE to the server. A hard-delete here meant a failed push would
  // let the next pull resurrect the product (server still had it).
  await db.transaction('rw', db.products, db.sync_queue, async () => {
    await db.products.update(id, { is_deleted: true, updated_at: now });
    await queueChange('products', id, 'DELETE', null);
  });
  return { data: { success: true } };
};

// #############################################################
// 📊 STOCK MANAGEMENT (PER SHOP)
// #############################################################
export const getStocks = async (shop_id?: string) => {
  if (isOnline()) {
    try {
      const res = await api.get('/stocks', { params: shop_id ? { shop_id } : {} });
      // The backend wraps the data: { success, data: [...] }
      const allStocks = extractArr(res.data?.data ?? res.data);
      if (allStocks.length > 0) {
        db.stocks.bulkPut(allStocks.map((s: any) => ({
          ...s,
          quantity: s.quantity ?? s.currentStock ?? 0,
          updated_at: s.updated_at || new Date().toISOString()
        }))).catch(() => {});
      }
      const stocks = shop_id ? allStocks.filter((s: any) => s.shop_id === shop_id) : allStocks;
      // Backend already enriches with productName etc., but enrich from local if missing.
      // Single bulk lookup instead of one Dexie read per row (was 600+ individual
      // awaited reads on a full stock list).
      const needsLookup = stocks.filter((s: any) => !s.productName);
      const productMap = await bulkGetProductMap(needsLookup.map((s: any) => s.product_id));
      const enriched = stocks.map((s: any) => {
        if (s.productName) return { ...s, currentStock: s.quantity ?? s.currentStock ?? 0 };
        const product = productMap.get(s.product_id);
        return { ...s, productName: product?.name || 'Unknown', sku: product?.sku || '', sellingPrice: s.shop_price || product?.price || 0, currentStock: s.quantity ?? s.currentStock ?? 0 };
      });
      return { data: enriched };
    } catch (e) {
      console.warn('getStocks API failed, falling back to cache:', e);
    }
  }

  // Offline fallback — enrich from local Dexie
  const stocks = shop_id
    ? await db.stocks.where('shop_id').equals(shop_id).filter((s: any) => !s.is_deleted).toArray()
    : await db.stocks.filter((s: any) => !s.is_deleted).toArray();
  const productMap = await bulkGetProductMap(stocks.map((s: any) => s.product_id));
  const enriched = stocks.map((s) => {
    const product = productMap.get(s.product_id);
    return { ...s, productName: product?.name || 'Unknown', sku: product?.sku || '', sellingPrice: s.shop_price || product?.price || 0, currentStock: s.quantity ?? s.currentStock ?? 0 };
  });
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
  if (isOnline()) {
    try {
      const res = await api.put(`/stocks/${id}`, data);
      const stock = res.data?.data || res.data;
      if (stock?.id) {
        await db.stocks.put({ ...stock, updated_at: stock.updated_at || new Date().toISOString() });
      }
      return { data: stock };
    } catch (e) {
      if (!isNetworkError(e)) throw e;
      console.warn('updateStock API failed, queueing offline:', e);
    }
  }

  const now = new Date().toISOString();
  await db.stocks.update(id, { ...data, updated_at: now });
  await queueChange('stocks', id, 'UPDATE', data);
  return { data: { id, ...data } };
};

export const deleteStock = async (id: string) => {
  const now = new Date().toISOString();

  // Soft-delete locally — same rationale as deleteProduct above.
  await db.transaction('rw', db.stocks, db.sync_queue, async () => {
    await db.stocks.update(id, { is_deleted: true, updated_at: now });
    await queueChange('stocks', id, 'DELETE', null);
  });
  return { data: { success: true } };
};

export const adjustStock = async (data: {
  shop_id: string;
  product_id: string;
  quantity: number;
  reason?: string;
}) => {
  if (isOnline()) {
    try {
      const res = await api.patch('/stocks/adjust', data);
      const stock = res.data?.data || res.data;
      if (stock?.id) {
        await db.stocks.put({ ...stock, updated_at: stock.updated_at || new Date().toISOString() });
      }
      return { data: stock };
    } catch (e) {
      if (!isNetworkError(e)) throw e;
      console.warn('adjustStock API failed, queueing offline:', e);
    }
  }

  // Offline: route through the same `adjustments` queuing path createAdjustment
  // uses, instead of duplicating a second, slightly different ad-hoc
  // stock-update path. Keeps exactly one code path for "offline stock delta".
  await createAdjustment({
    shop_id: data.shop_id,
    product_id: data.product_id,
    adjustment_type: data.quantity >= 0 ? 'addition' : 'subtraction',
    quantity_change: data.quantity,
    reason: data.reason,
  });
  return { data: { success: true } };
};

// ######################
// SALES
// ######################
export const createSale = async (data: any) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const saleNumber = `SL-${id.substring(0, 8).toUpperCase()}`;

  // Assign stable ids up front so the same item ids land in both the local
  // sale_items table and the queued sync payload — otherwise a fresh
  // randomUUID() was generated only for the Dexie row while the queued
  // payload reused the caller's original items with no id, so the server
  // minted a DIFFERENT id and left a duplicate row locally after the next pull.
  const items = (data.items || []).map((item: any) => ({
    ...item,
    id: item.id || crypto.randomUUID(),
  }));

  // Calculate total, subtotal, discount
  const subtotal = items.reduce((acc: number, item: any) => acc + (item.quantity * item.unit_price), 0);
  const discount = data.discount_amount || 0;
  const total = subtotal - discount + (data.other_charges || 0);

  const sale = {
    ...data,
    id,
    items,
    sale_number: saleNumber,
    total_amount: total,
    created_at: now,
    updated_at: now,
    status: 'completed'
  };
  
  // Fetch Shop Info from local Dexie database
  let shopName = "Tuhanas Shop";
  let shopAddress = "";
  let shopPhone = "";

  // Fetch Staff Info from localStorage user profile
  let staffName = "Staff Member";
  try {
    const localUserStr = localStorage.getItem('user');
    if (localUserStr) {
      const localUser = JSON.parse(localUserStr);
      staffName = localUser.full_name || localUser.name || staffName;
    }
  } catch {}

  // Fetch Customer Info from local Dexie database
  let customerName = "Walk-in Customer";

  const itemsList: any[] = [];

  // Atomic: a crash partway through this sequence would otherwise leave the
  // sale, its items, the stock decrement, and the sync queue out of sync
  // with each other.
  await db.transaction('rw', [db.sales, db.sale_items, db.stocks, db.shops, db.customers, db.products, db.sync_queue], async () => {
    await db.sales.add(sale);

    if (data.shop_id) {
      const shop = await db.shops.get(data.shop_id);
      if (shop) {
        shopName = shop.name || shopName;
        shopAddress = shop.address || "";
        shopPhone = shop.phone || "";
      }
    }

    if (data.customer_id) {
      const customer = await db.customers.get(data.customer_id);
      if (customer) {
        customerName = customer.name || customerName;
      }
    }

    // Also add items and update stock
    for (const item of items) {
      // Fetch Product + stock info for receipt AND to snapshot the cost at
      // time of sale — without this, COGS/profit for this sale would be
      // silently recomputed from whatever the product's cost is *today*,
      // drifting every time a supplier price changes.
      const product = await db.products.get(item.product_id);
      const stock = await db.stocks.where({
        shop_id: data.shop_id,
        product_id: item.product_id
      }).first();
      const costPrice = Number(
        (stock as any)?.shop_cost_price ?? (stock as any)?.cost_price ?? product?.cost_price ?? 0
      );

      const saleItem = { ...item, sale_id: id, cost_price: costPrice };
      await db.sale_items.add(saleItem);
      item.cost_price = costPrice;

      const productName = product ? product.name : "Product Item";
      itemsList.push({
        product_name: productName,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price
      });

      // Local optimistic decrement for instant UI feedback only. The
      // authoritative decrement happens server-side, derived from this
      // sale's own items (see backend sync_push) — we no longer push a
      // separate raw absolute-quantity 'stocks' update, since that raced
      // against other offline actions on the same stock row and silently
      // lost updates.
      if (stock) {
        const newQty = Math.max(0, (stock.quantity || 0) - (item.quantity || 0));
        await db.stocks.update(stock.id, { quantity: newQty, updated_at: now });
      }
    }

    await queueChange('sales', id, 'CREATE', sale);
  });

  const responseData = {
    sale: {
      ...sale,
      shop_name: shopName,
      shop_address: shopAddress,
      shop_phone: shopPhone,
      staff_name: staffName,
      customer_name: customerName,
      subtotal,
      discount,
      total,
    },
    items: itemsList
  };
  
  return { data: responseData };
};

export const getSales = async (shop_id?: string) => {
  if (isOnline()) {
    try {
      const res = await api.get('/sales', { params: shop_id ? { shop_id } : {} });
      // Backend returns { success, data: [...] }
      const all = extractArr(res.data?.data ?? res.data);
      if (all.length > 0) {
        // Cache sales locally
        await db.sales.bulkPut(all.map((s: any) => ({ ...s, updated_at: s.updated_at || new Date().toISOString() }))).catch(() => {});
        // Extract and cache sale items if embedded
        const allItems: any[] = [];
        for (const sale of all) {
          if (sale.items) {
            allItems.push(...sale.items.map((i: any) => ({ ...i, sale_id: sale.id })));
          }
        }
        if (allItems.length > 0) await db.sale_items.bulkPut(allItems).catch(() => {});
      }
      return { data: shop_id ? all.filter((s: any) => s.shop_id === shop_id) : all };
    } catch (e) {
      console.warn('getSales API failed, falling back to cache:', e);
    }
  }
  const sales = shop_id
    ? await db.sales.where('shop_id').equals(shop_id).filter((s: any) => !s.is_deleted).toArray()
    : await db.sales.filter((s: any) => !s.is_deleted).toArray();
  return { data: sales };
};

export const getSale = async (id: string) => {
  if (false && isOnline()) {
    try {
      const res = await api.get(`/sales/${id}`);
      const sale = res.data.sale;
      const items = Array.isArray(res.data.items) ? res.data.items : [];

      if (sale) {
        await db.sales.put({ ...sale, updated_at: sale.updated_at || new Date().toISOString() });
      }
      if (items.length > 0) {
        await db.sale_items.bulkPut(items.map((item: any) => ({
          ...item,
          sale_id: id,
          updated_at: item.updated_at || new Date().toISOString(),
        }))).catch(() => {});
      }

      const enrichedItems = await Promise.all(items.map(async (item: any) => {
        if (item.product_name) return item;
        const product = await db.products.get(item.product_id);
        return {
          ...item,
          product_name: item.product_name || product?.name || item.product_id,
        };
      }));

      return { data: { sale, items: enrichedItems } };
    } catch (e: any) {
      if (e.response?.status === 404) {
        throw new Error('Sale not found');
      }
      console.warn('getSale API failed, falling back to cache:', e);
    }
  }

  const sale = await db.sales.get(id);
  const items = await db.sale_items.where('sale_id').equals(id).toArray();
  const enrichedItems = await Promise.all(items.map(async (item: any) => {
    const product = await db.products.get(item.product_id);
    const unit_price = Number(item.unit_price ?? item.price ?? item.unitPrice ?? product?.price ?? 0);
    const quantity = Number(item.quantity || 1);
    return {
      ...item,
      product_name: item.product_name || product?.name || item.product_id || "Unknown Product",
      unit_price,
      total_price: Number(item.total_price) || (unit_price * quantity),
      quantity
    };
  }));

  // Deduplicate by product_id to remove sync duplicates
  const uniqueMap = new Map();
  for (const item of enrichedItems) {
    const existing = uniqueMap.get(item.product_id);
    if (!existing || (existing.total_price === 0 && item.total_price > 0)) {
      uniqueMap.set(item.product_id, item);
    }
  }

  return { data: { sale, items: Array.from(uniqueMap.values()) } };
};

export const refundSale = async (id: string) => {
  const now = new Date().toISOString();
  const sale = await db.sales.get(id);
  if (!sale) throw new Error("Sale not found");

  // Atomic: sale status flip, local stock restore, and the queued sync entry
  // stay consistent even if the app crashes mid-sequence.
  await db.transaction('rw', db.sales, db.sale_items, db.stocks, db.sync_queue, async () => {
    await db.sales.update(id, { status: 'refunded', updated_at: now });
    // The server restores stock itself when it sees the status flip to
    // 'refunded' (see backend sync_push) — do NOT queue a raw absolute
    // stock quantity here: the backend deliberately ignores those (they
    // race against other offline changes), which is why refunds used to
    // sync the status but silently never restore server stock.
    await queueChange('sales', id, 'UPDATE', { status: 'refunded' });

    // Local optimistic stock restore for instant UI feedback only
    const items = await db.sale_items.where('sale_id').equals(id).toArray();
    for (const item of items) {
      const stock = await db.stocks.where({
        shop_id: sale.shop_id,
        product_id: item.product_id
      }).first();

      if (stock) {
        const newQty = (stock.quantity || 0) + (item.quantity || 0);
        await db.stocks.update(stock.id, { quantity: newQty, updated_at: now });
      }
    }
  });

  return { data: { success: true } };
};

// #############################################################
// 🧍 CUSTOMERS
// #############################################################
export const getCustomers = async () => {
  if (false && isOnline()) {
    try {
      const res = await api.get('/customers');
      const customers = extractArr(res.data);
      if (customers.length > 0) db.customers.bulkPut(customers).catch(() => {});
      return { data: customers };
    } catch (e) {
      console.warn('getCustomers API failed, falling back to cache:', e);
    }
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
  if (false && isOnline()) {
    try {
      const res = await api.get('/suppliers');
      const suppliers = extractArr(res.data);
      if (suppliers.length > 0) db.suppliers.bulkPut(suppliers).catch(() => {});
      return { data: suppliers };
    } catch (e) {
      console.warn('getSuppliers API failed, falling back to cache:', e);
    }
  }
  return { data: await db.suppliers.filter((s: any) => !s.is_deleted).toArray() };
};

export const createSupplier = async (data: any) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const supplier = { ...data, id, updated_at: now };
  await db.suppliers.add(supplier);
  await queueChange('suppliers', id, 'CREATE', supplier);
  return { data: supplier };
};
export const deleteSupplier = async (id: string) => {
  const now = new Date().toISOString();

  // Soft-delete locally — same rationale as deleteProduct above.
  // Also fixed payload from {} to null for consistency with other deletes.
  await db.transaction('rw', db.suppliers, db.sync_queue, async () => {
    await db.suppliers.update(id, { is_deleted: true, updated_at: now });
    await queueChange('suppliers', id, 'DELETE', null);
  });
  return { data: { success: true } };
};
export const getSupplierTransactions = async (id: string) => {
  if (isOnline()) {
    try {
      const res = await api.get(`/suppliers/${id}/transactions`);
      const txs = extractArr(res.data);
      if (txs.length > 0) db.supplier_transactions.bulkPut(txs).catch(() => {});
      return { data: txs };
    } catch (e) {
      console.warn('getSupplierTransactions API failed, falling back to cache:', e);
    }
  }
  const cached = await db.supplier_transactions.where('supplier_id').equals(id).reverse().sortBy('created_at');
  return { data: cached };
};
export const getSupplierSummary = async (id: string) => {
  const cacheKey = `supplier_summary_${id}`;
  if (isOnline()) {
    try {
      const res = await api.get(`/suppliers/${id}/summary`);
      const summary = res.data;
      if (typeof window !== 'undefined') {
        localStorage.setItem(cacheKey, JSON.stringify(summary));
      }
      return { data: summary };
    } catch (e) {
      console.warn('getSupplierSummary API failed, falling back to cache:', e);
    }
  }
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        return { data: JSON.parse(cached) };
      } catch {}
    }
  }
  const txs = await db.supplier_transactions.where('supplier_id').equals(id).toArray();
  const total_credit = txs.filter((t: any) => t.type === 'credit').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const total_loss = txs.filter((t: any) => t.type === 'loss').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  return { data: { supplier_id: id, total_credit, total_loss, net_position: total_credit - total_loss } };
};

// #############################################################
// 🔁 TRANSFERS (Between Shops)
// #############################################################
export const createTransfer = async (data: any) => {
  if (isOnline()) {
    try {
      const res = await api.post('/transfers', data);
      const transfer = res.data;
      if (transfer?.id) {
        await db.transfers.put({ ...transfer, updated_at: transfer.updated_at || new Date().toISOString() });
      }
      return { data: transfer };
    } catch (e) {
      if (!isNetworkError(e)) throw e;
      console.warn('createTransfer API failed, queueing offline:', e);
    }
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const transfer = { ...data, id, status: 'pending', created_at: now, updated_at: now };

  // Atomic: keeps the transfer record, both local stock rows, and the sync
  // queue entry consistent even if the app crashes mid-sequence.
  await db.transaction('rw', db.transfers, db.stocks, db.sync_queue, async () => {
    await db.transfers.add(transfer);

    // Local optimistic stock updates for instant UI feedback only. The
    // authoritative move happens server-side from the transfer's own
    // from/to/quantity fields (see backend sync_push) — we no longer push a
    // separate raw absolute-quantity 'stocks' update, since that raced
    // against other offline actions on the same stock row and could
    // silently lose or double-apply an update.
    const fromStock = await db.stocks.where({
      shop_id: data.from_shop_id,
      product_id: data.product_id
    }).first();
    if (fromStock) {
      const newQty = Math.max(0, (fromStock.quantity || 0) - (data.quantity || 0));
      await db.stocks.update(fromStock.id, { quantity: newQty, updated_at: now });
    }

    const toStock = await db.stocks.where({
      shop_id: data.to_shop_id,
      product_id: data.product_id
    }).first();
    if (toStock) {
      await db.stocks.update(toStock.id, { quantity: (toStock.quantity || 0) + (data.quantity || 0), updated_at: now });
    } else {
      await db.stocks.add({
        id: crypto.randomUUID(),
        shop_id: data.to_shop_id,
        product_id: data.product_id,
        quantity: data.quantity || 0,
        min_quantity: 0,
        updated_at: now
      });
    }

    await queueChange('transfers', id, 'CREATE', transfer);
  });

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
    quantity_change: data.quantity_change,
    note: data.reason || 'manual_edit',
    staff_id: user.id,
    created_at: now,
    updated_at: now
  };

  // Atomic: keeps the adjustment record, the local stock row, and the sync
  // queue entry consistent even if the app crashes mid-sequence.
  await db.transaction('rw', db.adjustments, db.stocks, db.sync_queue, async () => {
    await db.adjustments.add(adjustment);

    // Local optimistic stock update for instant UI feedback only. The
    // authoritative change happens server-side from this adjustment's own
    // signed `quantity_change` (see backend sync_push) — we no longer push
    // a separate raw absolute-quantity 'stocks' update, since that raced
    // against other offline actions on the same stock row and could
    // silently lose an update.
    const stock = await db.stocks.where({
      shop_id: data.shop_id,
      product_id: data.product_id
    }).first();

    if (stock) {
      const newQty = Math.max(0, (stock.quantity || 0) + data.quantity_change);
      await db.stocks.update(stock.id, { quantity: newQty, updated_at: now });
    } else {
      await db.stocks.add({
        id: crypto.randomUUID(),
        shop_id: data.shop_id,
        product_id: data.product_id,
        quantity: data.quantity_change > 0 ? data.quantity_change : 0,
        min_quantity: 0,
        updated_at: now
      });
    }

    await queueChange('adjustments', id, 'CREATE', adjustment);
  });

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
  // Assign stable ids up front so the same item ids land in both the local
  // purchase_items table and the queued sync payload — otherwise offline
  // items with no id would get a fresh randomUUID() at Dexie-insert time but
  // a *different* server-generated id once synced, leaving duplicate rows
  // locally after the next pull.
  const items = normalizePurchaseItems(data.items || []).map((item) => ({
    ...item,
    id: item.id || crypto.randomUUID(),
  }));
  const serverPayload = { ...data, items };

  if (isOnline()) {
    try {
      const res = await api.post('/purchases', serverPayload);
      const purchase = normalizePurchase(res.data.purchase || res.data);
      await db.purchases.put(purchase);
      if (purchase.items.length > 0) {
        await db.purchase_items.bulkPut(purchase.items.map((item: any) => ({ ...item, purchase_id: purchase.id }))).catch(() => {});
      }
      return { data: purchase };
    } catch (e) {
      if (!isNetworkError(e)) throw e;
      console.warn('createPurchase API failed, queueing offline:', e);
    }
  }

  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const purchase = normalizePurchase({
    ...data,
    id,
    items,
    created_at: now,
    updated_at: now,
    status: data.status || 'ordered',
  });
  
  // Atomic: a crash partway through a multi-item purchase would otherwise
  // leave Dexie with a purchase missing some of its items.
  await db.transaction('rw', db.purchases, db.purchase_items, db.sync_queue, async () => {
    await db.purchases.add(purchase);
    if (items.length > 0) {
      await db.purchase_items.bulkAdd(items.map((item) => ({ ...item, purchase_id: id })));
    }
    await queueChange('purchases', id, 'CREATE', purchase);
  });
  return { data: purchase };
};

export const getPurchases = async (shop_id?: string) => {
  if (false && isOnline()) {
    try {
      const res = await api.get('/purchases', { params: shop_id ? { shop_id } : {} });
      const all = extractArr(res.data);
      if (all.length > 0) {
        // Save purchases
        await db.purchases.bulkPut(all.map((p: any) => normalizePurchase(p))).catch(() => {});
        // Extract and save items from all purchases
        const allItems: any[] = [];
        for (const p of all) {
          if (p.items) {
            allItems.push(...p.items.map((i: any) => ({ ...i, purchase_id: p.id })));
          }
        }
        if (allItems.length > 0) await db.purchase_items.bulkPut(allItems).catch(() => {});
      }
      const normalized = all.map((p: any) => normalizePurchase(p));
      return { data: shop_id ? normalized.filter((p: any) => p.shop_id === shop_id) : normalized };
    } catch (e) {
      console.warn('getPurchases API failed, falling back to cache:', e);
    }
  }
  const purchases = shop_id ? await db.purchases.where('shop_id').equals(shop_id).toArray() : await db.purchases.toArray();
  const items = await db.purchase_items.toArray();
  return {
    data: purchases.map((purchase: any) =>
      normalizePurchase(purchase, items.filter((item: any) => item.purchase_id === purchase.id))
    )
  };
};

export const getPurchase = async (id: string) => {
  if (isOnline()) {
    try {
      const res = await api.get(`/purchases/${id}`);
      const purchase = normalizePurchase(res.data);
      await db.purchases.put(purchase);
      if (purchase.items.length > 0) {
        await db.purchase_items.bulkPut(purchase.items.map((item: any) => ({ ...item, purchase_id: id }))).catch(() => {});
      }
      return { data: purchase };
    } catch (e: any) {
      if (e.response?.status === 404) throw new Error('Purchase not found');
      console.warn('getPurchase API failed, falling back to cache:', e);
    }
  }

  const purchase = await db.purchases.get(id);
  const items = await db.purchase_items.where('purchase_id').equals(id).toArray();
  return { data: normalizePurchase(purchase, items) as any };
};

export const updatePurchase = async (id: string, data: any) => {
  if (isOnline()) {
    try {
      const res = await api.put(`/purchases/${id}`, data);
      const purchase = normalizePurchase(res.data);
      await db.purchases.put(purchase);
      return { data: purchase };
    } catch (e) {
      if (!isNetworkError(e)) throw e;
      console.warn('updatePurchase API failed, queueing offline:', e);
    }
  }

  const now = new Date().toISOString();
  await db.purchases.update(id, { ...data, updated_at: now });
  await queueChange('purchases', id, 'UPDATE', data);
  return { data: { id, ...data } };
};

export const receivePurchase = async (id: string, payload: any) => {
  if (isOnline()) {
    try {
      const res = await api.post(`/purchases/${id}/receive`, payload);
      const purchase = normalizePurchase(res.data);
      const now = new Date().toISOString();

      // Update local stocks with the differences
      if (purchase.items && purchase.items.length > 0) {
        for (const item of purchase.items) {
          const localItem = await db.purchase_items.get(item.id);
          const previouslyReceived = localItem?.received_quantity || 0;
          const diff = (item.received_quantity || 0) - previouslyReceived;

          // Reflect the item's cost/selling price locally too — the server
          // already updated the product/stock price on receive, but the
          // local Dexie cache wouldn't otherwise see it until the next pull.
          const priceFields: any = {};
          if (item.cost !== undefined && item.cost !== null) priceFields.shop_cost_price = item.cost;
          if (item.selling_price) priceFields.shop_price = item.selling_price;

          if (diff !== 0 || Object.keys(priceFields).length > 0) {
            const stock = await db.stocks.where({ shop_id: purchase.shop_id, product_id: item.product_id }).first();
            if (stock) {
              const newQty = Math.max(0, (stock.quantity || 0) + diff);
              await db.stocks.update(stock.id, { quantity: newQty, updated_at: now, ...priceFields });
            } else if (diff > 0) {
              const stockId = crypto.randomUUID();
              await db.stocks.add({
                id: stockId,
                shop_id: purchase.shop_id,
                product_id: item.product_id,
                quantity: diff,
                min_quantity: 0,
                updated_at: now,
                ...priceFields
              });
            }
          }

          if (item.cost !== undefined && item.cost !== null) {
            await db.products.update(item.product_id, { cost_price: item.cost, updated_at: now });
          }
          if (item.selling_price) {
            await db.products.update(item.product_id, { price: item.selling_price, updated_at: now });
          }
        }
      }

      await db.purchases.put(purchase);
      if (purchase.items.length > 0) {
        await db.purchase_items.bulkPut(purchase.items.map((item: any) => ({ ...item, purchase_id: id }))).catch(() => {});
      }
      return { data: purchase };
    } catch (e) {
      if (!isNetworkError(e)) throw e;
      console.warn('receivePurchase API failed, queueing offline:', e);
    }
  }

  const now = new Date().toISOString();
  const purchase = await db.purchases.get(id);
  if (!purchase) throw new Error("Purchase not found");

  // payload.items contains the form data with received_quantity per item
  const payloadItems: any[] = payload?.items || [];

  // Build a map of item_id → received_quantity from the form
  const receivedQtyMap: Record<string, number> = {};
  for (const pi of payloadItems) {
    if (!pi.is_cancelled) {
      receivedQtyMap[pi.id] = Number(pi.received_quantity || 0);
    }
  }

  let itemsTouched = 0;

  // Atomic: keeps the purchase status, each purchase_item, the local stock
  // rows, and the sync queue entries consistent even if the app crashes
  // mid-sequence.
  await db.transaction('rw', [db.purchases, db.purchase_items, db.stocks, db.products, db.sync_queue], async () => {
    await db.purchases.update(id, { status: 'received', updated_at: now });
    await queueChange('purchases', id, 'UPDATE', { status: 'received' });

    // Fetch all purchase items for this purchase
    const items = await db.purchase_items.where('purchase_id').equals(id).toArray();
    itemsTouched = items.length;

    for (const item of items) {
      // Use received_quantity from form if available, fallback to ordered quantity
      const receivedQty = receivedQtyMap[item.id] ?? Number(item.ordered_quantity ?? item.quantity ?? 0);

      const previouslyReceived = item.received_quantity || 0;
      const diff = receivedQty - previouslyReceived;
      if (diff === 0) continue;

      // Update purchase_item with actual received quantity
      const updatedFields = {
        quantity: receivedQty,
        received_quantity: receivedQty,
        updated_at: now
      };
      await db.purchase_items.update(item.id, updatedFields as any);

      // Queue the *delta*, not the absolute received_quantity: another
      // device may have already received part of this same purchase before
      // this syncs, and an absolute overwrite here would silently clobber
      // that. The server applies `received_quantity_delta` atomically to
      // both the purchase_item and the shop's stock (see backend sync_push).
      // NO updated_at in the payload: it would be device wall-clock time,
      // and a device with a slow clock then hits false 'conflict_detected'
      // rejections on every receive (server compares it to its own clock).
      await queueChange('purchase_items', item.id, 'UPDATE', {
        received_quantity: receivedQty,
        received_quantity_delta: diff
      });

      // Local optimistic stock update for instant UI feedback only — the
      // authoritative update (including price, see below) happens
      // server-side once this syncs.
      const stock = await db.stocks
        .where({ shop_id: purchase.shop_id, product_id: item.product_id })
        .first();

      // Reflect this item's cost/selling price locally too, matching what
      // the backend does on sync — otherwise the product/stock still shows
      // the old price locally until the next full pull.
      const priceFields: any = {};
      if (item.cost !== undefined && item.cost !== null) priceFields.shop_cost_price = item.cost;
      if (item.selling_price) priceFields.shop_price = item.selling_price;

      if (stock) {
        const newQty = Math.max(0, (stock.quantity || 0) + diff);
        await db.stocks.update(stock.id, { quantity: newQty, updated_at: now, ...priceFields });
      } else if (diff > 0) {
        await db.stocks.add({
          id: crypto.randomUUID(),
          shop_id: purchase.shop_id,
          product_id: item.product_id,
          quantity: diff,
          min_quantity: 0,
          updated_at: now,
          ...priceFields
        });
      }

      if (item.cost !== undefined && item.cost !== null) {
        await db.products.update(item.product_id, { cost_price: item.cost, updated_at: now });
      }
      if (item.selling_price) {
        await db.products.update(item.product_id, { price: item.selling_price, updated_at: now });
      }
    }
  });

  return { data: { success: true, message: `Stock updated for ${itemsTouched} items` } };
};

// #############################################################
// 💸 EXPENSES
// #############################################################
export const getExpenseCategories = async () => {
  if (isOnline()) {
    try {
      const res = await api.get('/expenses/categories');
      const cats = extractArr(res.data);
      if (cats.length > 0) db.expense_categories.bulkPut(cats).catch(() => {});
      return { data: cats };
    } catch (e) {
      console.warn('getExpenseCategories API failed, falling back to cache:', e);
    }
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
      if (all.length > 0) db.expenses.bulkPut(all).catch(() => {});
      return { data: shop_id ? all.filter((e: any) => e.shop_id === shop_id) : all };
    } catch (e) {
      console.warn('getExpenses API failed, falling back to cache:', e);
    }
  }
  const expenses = shop_id 
    ? await db.expenses.where('shop_id').equals(shop_id).filter((e: any) => !e.is_deleted).toArray() 
    : await db.expenses.filter((e: any) => !e.is_deleted).toArray();
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
  const now = new Date().toISOString();

  // Soft-delete locally — same rationale as deleteProduct above.
  await db.transaction('rw', db.expenses, db.sync_queue, async () => {
    await db.expenses.update(id, { is_deleted: true, updated_at: now });
    await queueChange('expenses', id, 'DELETE', null);
  });
  return { data: { success: true } };
};

// #############################################################
// 📈 REPORTS
// #############################################################
export const getDailySales = (shop_id?: string) => api.get(`/reports/daily-sales`, { params: { shop_id } });
export const getInventoryReport = (shop_id?: string) => api.get(`/reports/inventory`, { params: { shop_id } });

export const getFullStats = async (params?: any) => {
  const lsKey = `full_stats_${params?.shop_id || 'global'}_${params?.start_date || 'none'}_${params?.end_date || 'none'}`;
  const ssKey = `local_stats_${params?.shop_id || 'global'}`;

  /** Try localStorage → sessionStorage → null */
  const getCached = () => {
    if (typeof window === 'undefined') return null;
    try {
      const ls = localStorage.getItem(lsKey);
      if (ls) return { data: JSON.parse(ls) };
    } catch { /* ignore */ }
    try {
      const ss = sessionStorage.getItem(ssKey);
      if (ss) return { data: JSON.parse(ss) };
    } catch { /* ignore */ }
    return null;
  };

  if (isOnline()) {
    try {
      const res = await api.get('/reports/full-stats', { params, timeout: 20000 });
      const stats = res.data;
      // Cache successful response
      try {
        if (typeof window !== 'undefined') localStorage.setItem(lsKey, JSON.stringify(stats));
      } catch { /* storage full — skip */ }
      return { data: stats };
    } catch (e: any) {
      const status = e.response?.status;
      if (status === 401 || status === 403) throw e; // Auth errors — propagate

      console.warn(`getFullStats API failed (${status || 'network'}), falling back to cache`);
      // Cache-first fallback — never crash the dashboard
      const cached = getCached();
      if (cached) return cached;
      // Last resort — compute from local Dexie data
      return { data: await buildLocalStats(params?.shop_id, params?.start_date, params?.end_date) };
    }
  }

  // Offline path: cache → local compute
  const cached = getCached();
  if (cached) return cached;
  return { data: await buildLocalStats(params?.shop_id, params?.start_date, params?.end_date) };
};


// #############################################################
// 📊 AUDIT LOGS (ADMIN ONLY)
// #############################################################
export const getAuditLogs = async (limit = 200) => {
  // Bounded to the most recent `limit` entries — this table only grows
  // (3000+ rows and counting), and it was previously fetched in full and
  // synchronously JSON.stringify'd into localStorage on every page visit.
  if (isOnline()) {
    try {
      const res = await api.get(`/audit-logs`, { params: { limit } });
      if (typeof window !== "undefined" && res.data) {
        localStorage.setItem("cached_audit_logs", JSON.stringify(res.data));
      }
      return res;
    } catch (e) {
      console.warn("getAuditLogs backend failed, using cache:", e);
    }
  }
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("cached_audit_logs");
      if (cached) return { data: JSON.parse(cached) };
    } catch (err) {
      console.warn("getAuditLogs failed to parse cached logs:", err);
    }
  }
  return { data: [] };
};

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
