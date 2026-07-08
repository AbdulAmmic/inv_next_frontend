/**
 * apiBase.ts
 *
 * Runtime discovery of the API base URL.
 *
 * The backend is reachable through a Cloudflare *quick* tunnel whose random
 * trycloudflare.com hostname changes every time the tunnel restarts. The VPS
 * publishes the current URL into the DNS TXT record of
 * tuhanas-api.duckdns.org (see tuhanas-tunnel-publisher.service on the VPS);
 * this module looks it up via DNS-over-HTTPS so every installed app heals
 * itself after a tunnel restart instead of being stranded on a dead
 * hostname baked into the build.
 *
 * Resolution order: last known-good URL (localStorage) → TXT discovery →
 * built-in fallback. A discovered URL is only adopted after its /health
 * endpoint answers.
 */

const FALLBACK =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://player-linear-mills-newcastle.trycloudflare.com';

const CACHE_KEY = 'tuhanas_api_base';
const DISCOVERY_HOST = 'tuhanas-api.duckdns.org';

let current: string = FALLBACK;
if (typeof window !== 'undefined') {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached && cached.startsWith('https://')) current = cached;
}

/** Current API base URL — synchronous, always returns something usable. */
export function getApiBase(): string {
  return current;
}

async function lookupTxt(): Promise<string | null> {
  const endpoints = [
    `https://dns.google/resolve?name=${DISCOVERY_HOST}&type=TXT`,
    `https://cloudflare-dns.com/dns-query?name=${DISCOVERY_HOST}&type=TXT`,
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      // Cloudflare wraps TXT data in escaped quotes, Google doesn't
      const txt = (data.Answer || [])
        .map((a: any) => String(a.data || '').replace(/^"+|"+$/g, '').trim())
        .find((t: string) => t.startsWith('https://'));
      if (txt) return txt;
    } catch {
      // try the next resolver
    }
  }
  return null;
}

async function isHealthy(base: string): Promise<boolean> {
  try {
    const res = await fetch(`${base}/health`, {
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Single-flight + light rate limit so error storms (every failed request
// calls this) don't hammer the DoH resolvers.
let _resolving: Promise<string> | null = null;
let _lastResolveAt = 0;
const MIN_RESOLVE_INTERVAL_MS = 30_000;

/**
 * Re-resolve the API base from the discovery TXT record. Cheap to call
 * often — coalesces concurrent calls and rate-limits to one lookup per 30s.
 * Call sites: app boot, and any network-level request failure.
 */
export function resolveApiBase(force = false): Promise<string> {
  if (typeof window === 'undefined') return Promise.resolve(current);
  if (_resolving) return _resolving;
  if (!force && Date.now() - _lastResolveAt < MIN_RESOLVE_INTERVAL_MS) {
    return Promise.resolve(current);
  }

  _resolving = (async () => {
    _lastResolveAt = Date.now();
    try {
      const discovered = await lookupTxt();
      if (discovered && discovered !== current && (await isHealthy(discovered))) {
        current = discovered;
        localStorage.setItem(CACHE_KEY, discovered);
        console.log('🔗 API base updated via discovery:', discovered);
      } else if (
        discovered &&
        discovered === current &&
        current !== FALLBACK
      ) {
        // Discovery confirms what we already use — keep the cache fresh
        localStorage.setItem(CACHE_KEY, discovered);
      }
    } catch {
      // Keep whatever we have — the fallback still applies
    } finally {
      _resolving = null;
    }
    return current;
  })();

  return _resolving;
}
