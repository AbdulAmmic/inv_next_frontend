/**
 * businessTheme.ts
 *
 * Per-tenant branding (name, logo, primary color) for the SaaS dashboard.
 * The login page is pre-auth and deliberately generic — we don't know which
 * business a visitor belongs to until they sign in. Right after login (and
 * on every dashboard boot while a session exists), the app fetches its own
 * business via GET /businesses/me and caches it here so every component
 * that needs a logo/name/color reads from one place instead of hardcoding
 * a specific tenant's assets.
 */

export type BusinessInfo = {
  id: string;
  name: string;
  theme?: { primary_color?: string; logo_url?: string };
  // Platform admin gates the AI assistant per tenant
  ai_enabled?: boolean;
};

const CACHE_KEY = "business_info";

export function getCachedBusiness(): BusinessInfo | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const DEFAULT_TITLE = "Inventory Manager";

export function applyBusinessTheme(b: BusinessInfo | null) {
  if (typeof window === "undefined") return;
  const color = b?.theme?.primary_color;
  if (color) {
    document.documentElement.style.setProperty("--brand-600", color);
    document.documentElement.style.setProperty("--brand-500", color);
  }
  document.title = b?.name ? `${b.name} — Inventory` : DEFAULT_TITLE;
}

export function cacheBusiness(b: BusinessInfo) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(b));
  applyBusinessTheme(b);
}

const ACTIVE_BUSINESS_KEY = "active_business_id";

async function hasAnyLocalData(db: any): Promise<boolean> {
  const counts = await Promise.all([
    db.products.count(),
    db.customers.count(),
    db.suppliers.count(),
    db.sales.count(),
  ]);
  return counts.some((c) => c > 0);
}

/**
 * This is an offline-first app: everything (products, suppliers, sales, ...)
 * is cached in one shared IndexedDB per browser/device, not scoped by
 * tenant. If this device was previously used for a *different* business,
 * that business's data is still sitting in the local cache and gets shown
 * immediately (before any resync) under the new login — e.g. Tuhanas
 * suppliers appearing under a Namutunci session on the same device.
 *
 * Call this right after login, before the dashboard reads anything local:
 * if the cached tenant differs from the one just logged into, wipe every
 * local table and reset the sync gate so the dashboard is forced to do a
 * full fresh pull for the new business instead of trusting stale rows.
 */
export async function ensureLocalDataMatchesBusiness(newBusinessId: string | null | undefined): Promise<void> {
  if (typeof window === "undefined" || !newBusinessId) return;
  const active = localStorage.getItem(ACTIVE_BUSINESS_KEY);

  const [{ db }, { resetSyncReady }] = await Promise.all([
    import("./db"),
    import("./syncGate"),
  ]);

  // Every device that existed before this check shipped has no marker at
  // all yet — but may still be sitting on another tenant's cached data
  // from before. Without a marker we can't tell whose data it is, so a
  // device with anything cached locally gets wiped once, defensively,
  // rather than trusting it. A genuinely fresh device just has nothing to
  // clear either way.
  const mismatched = active ? active !== newBusinessId : await hasAnyLocalData(db);

  if (mismatched) {
    await db.transaction("rw", db.tables, async () => {
      await Promise.all(db.tables.map((t) => t.clear()));
    });
    localStorage.removeItem("selected_shop_id");
    localStorage.removeItem("db_seeded_v4");
    resetSyncReady();
  }
  localStorage.setItem(ACTIVE_BUSINESS_KEY, newBusinessId);
}

export function clearCachedBusiness() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
  document.title = DEFAULT_TITLE;
}

/** Call once right after login, and once on dashboard boot, to refresh the cache. */
export async function refreshBusinessInfo(apiInstance: { get: (url: string) => Promise<{ data: BusinessInfo }> }) {
  try {
    const res = await apiInstance.get("/businesses/me");
    cacheBusiness(res.data);
    return res.data;
  } catch {
    return getCachedBusiness();
  }
}

export function getBusinessName(fallback = "Inventory Manager"): string {
  return getCachedBusiness()?.name || fallback;
}

export function getBusinessLogoUrl(): string | null {
  return getCachedBusiness()?.theme?.logo_url || null;
}

export function getBusinessInitial(): string {
  const name = getBusinessName("I");
  return name.trim().charAt(0).toUpperCase() || "I";
}

/** True when the platform admin has enabled the AI assistant for this tenant. */
export function isAIEnabled(): boolean {
  return getCachedBusiness()?.ai_enabled === true;
}
