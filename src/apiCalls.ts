// src/apiCalls.ts
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://invflask-connectorstech7925-12l4k6at.leapcell.dev";

// -------------------------------------------------------------
// 🔧 AXIOS INSTANCE
// -------------------------------------------------------------
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// -------------------------------------------------------------
// 🔐 REQUEST INTERCEPTOR — Attach Token
// -------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// -------------------------------------------------------------
// 🔐 RESPONSE INTERCEPTOR — Auto Logout on 401
// -------------------------------------------------------------
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

export const updateUserById = (id: string, data: any) =>
  api.put(`/users/${id}`, data);

export const deleteUserById = (id: string) =>
  api.delete(`/users/${id}`);


// #############################################################
// 🏪 SHOPS
// #############################################################
export const getShops = () => api.get(`/shops`);

export const createShop = (data: { name: string; location?: string }) =>
  api.post(`/shops`, data);

// #############################################################
// 📦 PRODUCTS (GLOBAL CATALOG)
// #############################################################
export const getProducts = (params?: { 
  include_stock?: boolean; 
  shop_id?: string; 
}) =>
  api.get(`/products`, {
    params: {
      include_stock: params?.include_stock ? "true" : "false",
      shop_id: params?.shop_id ?? undefined,
    },
  });


export const getProduct = (id: string) => api.get(`/products/${id}`);

export const createProduct = (data: {
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  category?: string;
  supplier_id?: string;
  price: number;
  cost_price: number;
  shop_id?: string; // optional → used for creating initial stock
  quantity?: number;
  min_quantity?: number;
  max_quantity?: number;
}) => api.post(`/products`, data);

export const updateProduct = (
  id: string,
  data: {
    name?: string;
    sku?: string;
    barcode?: string;
    description?: string;
    category?: string;
    supplier_id?: string;
    price?: number;
    cost_price?: number;
  }
) => api.put(`/products/${id}`, data);

export const deleteProduct = (id: string) =>
  api.delete(`/products/${id}`);

// #############################################################
// 📊 STOCK MANAGEMENT (PER SHOP)
// #############################################################
export const getStocks = (shop_id?: string) =>
  api.get(`/stocks`, { params: shop_id ? { shop_id } : {} });

export const getStockByProduct = (product_id: string, shop_id?: string) =>
  api.get(`/stocks/product/${product_id}`, {
    params: shop_id ? { shop_id } : {},
  });

export const createStock = (data: {
  shop_id: string;
  product_id: string;
  quantity?: number;
  min_quantity?: number;
  max_quantity?: number;
  shop_price?: number;
  shop_cost_price?: number;
}) => api.post(`/stocks`, data);

export const adjustStock = (data: {
  shop_id: string;
  product_id: string;
  quantity: number; // +5 or -5
  reason?: string;
}) => api.patch(`/stocks/adjust`, data);

// #############################################################
// 🔁 TRANSFERS (Between Shops)
// #############################################################
export const createTransfer = (data: {
  from_shop_id: string;
  to_shop_id: string;
  product_id: string;
  quantity: number;
  note?: string;
}) => api.post(`/transfers`, data);

export const getTransfers = () => api.get(`/transfers`);

// #############################################################
// PURCHASES
// #############################################################
export const createPurchase = (data: {
  supplier_id: string;
  shop_id: string;
  items: {
    product_id: string;
    quantity: number;
    cost: number;
    selling_price?: number;
  }[];
}) => api.post(`/purchases`, data);

export const getPurchases = (shop_id?: string) =>
  api.get(`/purchases`, { params: shop_id ? { shop_id } : {} });

export const getPurchase = (id: string) =>
  api.get(`/purchases/${id}`);

export const deletePurchase = (id: string) =>
  api.delete(`/purchases/${id}`);

export const updatePurchase = (id: string, data: object) =>
  api.put(`/purchases/${id}`, data);


export const receivePurchase = (id: string, payload: any) =>
  api.post(`/purchases/${id}/receive`, payload);

// #############################################################
// 🧍 CUSTOMERS
// #############################################################
export const getCustomers = () => api.get(`/customers`);

export const createCustomer = (data: {
  name: string;
  email?: string;
  phone?: string;
}) => api.post(`/customers`, data);

// #############################################################
// 🧑‍💼 SUPPLIERS
// #############################################################
export const getSuppliers = () => api.get(`/suppliers`);

export const createSupplier = (data: {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
}) => api.post(`/suppliers`, data);

export const getSupplierTransactions = (supplier_id: string) =>
  api.get(`/suppliers/${supplier_id}/transactions`);

export const getSupplierSummary = (supplier_id: string) =>
  api.get(`/suppliers/${supplier_id}/summary`);

// ######################
// SALES

//#######################
export const createSale = (data: {
  shop_id: string;
  payment_method: string;
  discount_amount?: number;
  other_charges?: number;
  items: { product_id: string; quantity: number; unit_price: number }[];
}) => api.post("/sales", data);

export const getSales = (shop_id?: string) =>
  api.get("/sales", { params: shop_id ? { shop_id } : {} });

export const getSale = (id: string) => api.get(`/sales/${id}`);

// Refund a sale
export const refundSale = (sale_id: string) =>
  api.post(`/sales/${sale_id}/refund`);

// #############################################################
// 💸 EXPENSES
// #############################################################
export const getExpenseCategories = () =>
  api.get(`/expenses/categories`);

export const createExpenseCategory = (data: { name: string }) =>
  api.post(`/expenses/categories`, data);

export const getExpenses = (shop_id?: string) =>
  api.get(`/expenses`, { params: shop_id ? { shop_id } : {} });


// delete Expenses

export const deleteExpense = (id: string) =>
  api.delete(`/expenses/${id}`);  

export const createExpense = (data: {
  shop_id: string;
  category_id: string;
  amount: number;
  description?: string;
}) => api.post(`/expenses`, data);

// #############################################################
// 📈 REPORTS
// #############################################################
export const getDailySales = (shop_id?: string) =>
  api.get(`/reports/daily-sales`, { params: { shop_id } });

export const getInventoryReport = (shop_id?: string) =>
  api.get(`/reports/inventory`, { params: { shop_id } });


// #############################################################
// ⚙ HEALTH
// #############################################################
export const healthCheck = () => api.get(`/health`);
