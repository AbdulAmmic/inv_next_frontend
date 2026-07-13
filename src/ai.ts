/**
 * ai.ts — Puter.js AI assistant, scoped to this tenant's own data.
 *
 * The AI never gets a live connection to the database: for every question we
 * assemble a compact, ROLE-SCOPED snapshot (staff see their shop, admins see
 * the whole business) from the local Dexie cache and send it along with the
 * question. Puter.js (https://js.puter.com) provides the model client-side —
 * no API keys, gated per tenant by the platform admin via business.ai_enabled.
 */

import { db } from "./db";
import { buildLocalStats } from "./apiCalls";
import { getBusinessName, isAIEnabled } from "./businessTheme";

declare global {
  interface Window {
    puter?: any;
  }
}

const PUTER_SRC = "https://js.puter.com/v2/";
let puterLoading: Promise<any> | null = null;

/** Inject the Puter.js script once and resolve window.puter. */
export function loadPuter(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.puter?.ai) return Promise.resolve(window.puter);
  if (puterLoading) return puterLoading;

  puterLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PUTER_SRC;
    script.async = true;
    script.onload = () => {
      if (window.puter?.ai) resolve(window.puter);
      else reject(new Error("Puter.js loaded but AI API unavailable"));
    };
    script.onerror = () => {
      puterLoading = null; // allow retry on next call
      reject(new Error("Could not load the AI engine — check your internet connection"));
    };
    document.head.appendChild(script);
  });
  return puterLoading;
}

// ─────────────────────────────────────────────
// Role-scoped context assembly
// ─────────────────────────────────────────────

function getSessionUser(): { role: string; shop_id: string | null; name: string } {
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const u = JSON.parse(raw);
      return {
        role: (u.role || "staff").toLowerCase(),
        shop_id: u.shop_id || localStorage.getItem("selected_shop_id") || null,
        name: u.full_name || u.name || "User",
      };
    }
  } catch { /* fall through */ }
  return { role: "staff", shop_id: localStorage.getItem("selected_shop_id"), name: "User" };
}

const dayStr = (d: Date) => d.toISOString().slice(0, 10);

async function topProductsToday(scopeShopId?: string | null) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const sales = await db.sales
    .filter((s: any) =>
      !s.is_deleted &&
      (s.status || "completed") === "completed" &&
      new Date(s.created_at) >= start &&
      (!scopeShopId || s.shop_id === scopeShopId)
    )
    .toArray();
  if (sales.length === 0) return [];

  const items = await db.sale_items.where("sale_id").anyOf(sales.map((s) => s.id)).toArray();
  const byProduct = new Map<string, { qty: number; revenue: number }>();
  for (const it of items) {
    const cur = byProduct.get(it.product_id) || { qty: 0, revenue: 0 };
    cur.qty += Number(it.quantity || 0);
    cur.revenue += Number(it.total_price ?? (it.quantity * it.unit_price)) || 0;
    byProduct.set(it.product_id, cur);
  }

  const ids = Array.from(byProduct.keys());
  const products = await db.products.bulkGet(ids);
  const named = ids.map((id, i) => ({
    name: products[i]?.name || "Unknown",
    qty: Math.round(byProduct.get(id)!.qty * 100) / 100,
    revenue: Math.round(byProduct.get(id)!.revenue),
  }));
  return named.sort((a, b) => b.revenue - a.revenue).slice(0, 5);
}

async function lowStockList(scopeShopId?: string | null) {
  const stocks = await (scopeShopId
    ? db.stocks.where("shop_id").equals(scopeShopId).filter((s: any) => !s.is_deleted).toArray()
    : db.stocks.filter((s: any) => !s.is_deleted).toArray());
  const low = stocks.filter((s: any) => Number(s.quantity || 0) <= Number(s.min_quantity || 0));
  const products = await db.products.bulkGet(low.slice(0, 10).map((s: any) => s.product_id));
  return low.slice(0, 10).map((s: any, i: number) => ({
    name: products[i]?.name || "Unknown",
    quantity: Number(s.quantity || 0),
    min: Number(s.min_quantity || 0),
  }));
}

/** If the question names a product we know, attach its details. */
async function matchedProducts(question: string, scopeShopId?: string | null) {
  const q = question.toLowerCase();
  if (q.length < 4) return [];
  const products = await db.products.filter((p: any) => !p.is_deleted).toArray();
  const hits = products
    .filter((p: any) => p.name && q.includes(p.name.toLowerCase()))
    .slice(0, 3);
  const result = [];
  for (const p of hits) {
    const stocks = await db.stocks
      .where("product_id").equals(p.id)
      .filter((s: any) => !s.is_deleted && (!scopeShopId || s.shop_id === scopeShopId))
      .toArray();
    result.push({
      name: p.name,
      category: p.category,
      unit: p.unit,
      price: Number(p.price || 0),
      sub_units: p.sub_units || undefined,
      stock_on_hand: stocks.reduce((sum: number, s: any) => sum + Number(s.quantity || 0), 0),
    });
  }
  return result;
}

async function buildContext(question: string) {
  const user = getSessionUser();
  // Staff are scoped to their shop; admins see the whole business
  const scopeShopId = user.role === "admin" ? undefined : user.shop_id || undefined;

  const now = new Date();
  const today = dayStr(now);
  const monthStart = dayStr(new Date(now.getFullYear(), now.getMonth(), 1));
  const yesterday = dayStr(new Date(now.getTime() - 86400000));

  const [todayStats, yesterdayStats, monthStats, topToday, lowStock, productsAsked] = await Promise.all([
    buildLocalStats(scopeShopId, today, today),
    buildLocalStats(scopeShopId, yesterday, yesterday),
    buildLocalStats(scopeShopId, monthStart, today),
    topProductsToday(scopeShopId),
    lowStockList(scopeShopId),
    matchedProducts(question, scopeShopId),
  ]);

  const pick = (s: any) => ({
    sales_total: s.total_sales_amount,
    sales_count: s.total_sales_count,
    expenses: s.total_expenses,
    gross_profit: s.gross_profit,
    net_profit: s.net_profit,
  });

  return {
    business: getBusinessName(),
    user_role: user.role,
    scope: scopeShopId ? "single shop" : "all shops",
    now: now.toLocaleString(),
    currency: "NGN (₦)",
    today: pick(todayStats),
    yesterday: pick(yesterdayStats),
    month_to_date: pick(monthStats),
    inventory: {
      cost_value: (monthStats as any).inventory_cost_value,
      selling_value: (monthStats as any).inventory_selling_value,
      products_count: (monthStats as any).products_count,
      low_stock_count: (monthStats as any).low_stock_count,
      out_of_stock_count: (monthStats as any).out_of_stock_count,
    },
    top_products_today: topToday,
    low_stock_items: lowStock,
    products_mentioned: productsAsked.length ? productsAsked : undefined,
  };
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

function extractText(res: any): string {
  if (typeof res === "string") return res;
  return res?.message?.content ?? res?.text ?? String(res ?? "");
}

/** Ask the assistant a business question, answered from the caller's own scoped data. */
export async function askAI(question: string): Promise<string> {
  if (!isAIEnabled()) throw new Error("AI is not enabled for this business");
  const puter = await loadPuter();
  const context = await buildContext(question);

  const system =
    `You are the built-in AI assistant of "${context.business}", an inventory/POS system. ` +
    `You are talking to a ${context.user_role} whose visibility is: ${context.scope}. ` +
    `Answer ONLY from the data snapshot below — never invent numbers. Amounts are in ${context.currency}. ` +
    `Be brief and practical (2-6 sentences unless asked for detail). If the snapshot can't answer, say what's missing.\n\n` +
    `DATA SNAPSHOT:\n${JSON.stringify(context, null, 1)}`;

  const res = await puter.ai.chat([
    { role: "system", content: system },
    { role: "user", content: question },
  ]);
  return extractText(res);
}

/** Short selling-assistant blurb about one product (used at the POS). */
export async function askAboutProduct(product: {
  productName: string;
  category?: string;
  sellingPrice?: number;
  unit?: string;
  currentStock?: number;
  subUnits?: { name: string; per_base: number; price: number }[];
  nearestExpiry?: string | null;
}): Promise<string> {
  if (!isAIEnabled()) throw new Error("AI is not enabled for this business");
  const puter = await loadPuter();

  const system =
    `You are a point-of-sale assistant in "${getBusinessName()}". A cashier is selling an item and wants ` +
    `a quick briefing. In 3-5 short sentences: what this product typically is/is used for, anything a ` +
    `cashier should mention to the customer, and its price/units from the data. If it looks like a ` +
    `medicine, add general usage context only and end with "Please follow the pack leaflet or a ` +
    `pharmacist's advice." Never invent prices — use only the given data. Currency is ₦.`;

  const res = await puter.ai.chat([
    { role: "system", content: system },
    { role: "user", content: `Product data: ${JSON.stringify(product)}` },
  ]);
  return extractText(res);
}
