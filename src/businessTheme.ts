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
