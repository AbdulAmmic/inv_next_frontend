/**
 * syncEngine.ts
 *
 * Robust sync engine — push queued changes UP to server, pull delta DOWN.
 *
 * Events dispatched (window):
 *   tuhanas:pull-start    — pull is beginning
 *   tuhanas:pull-progress — { detail: { step, total, label, pct } }
 *   tuhanas:pull-complete — { detail: { total } }
 *   tuhanas:push-complete — { detail: { pushed, failed, conflicts } }
 *   tuhanas:bg-sync-complete — background sync finished (push + pull)
 */

import axios from 'axios';
import { db, SyncQueueEntry } from './db';

const LAST_SYNC_KEY = 'last_sync_timestamp';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://player-linear-mills-newcastle.trycloudflare.com';

// Own axios instance — NO import from apiCalls.ts (avoids circular deps)
const syncApi = axios.create({ baseURL: API_BASE, timeout: 120000 });

const MAX_SYNC_RETRIES = 3;
const RETRY_BASE_MS = 1500;

// Failed / rate-limited entries keep auto-retrying on the normal sync cadence
// until they've accumulated this many attempts; after that they only go out
// again on a manual Retry (which resets the counter). This is what makes the
// queue self-healing after transient server errors without letting a
// permanently-rejected entry hot-loop forever.
const MAX_AUTO_RETRY_ATTEMPTS = 8;

// `navigator.onLine` is known to be unreliable (especially in Electron) — it
// can report `false` while the network is actually fine, which would
// otherwise make pushChanges/pullUpdates silently no-op forever, freezing
// the whole sync queue with no visible error. Trust it when it says we're
// online (fast path, no network round trip); when it says we're offline,
// actively probe the API before giving up.
async function isOnline(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (navigator.onLine) return true;
  try {
    await syncApi.get('/health', { timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

// Global lock — prevents pushChanges/pullUpdates from ever running
// concurrently, regardless of how many timers/components trigger them
// (dashboard's background interval, the sync banner's poll, online-event
// listeners, manual retry buttons, etc). Without this, two overlapping
// calls could both read the same 'pending' rows and submit them twice, or
// race on the sync_queue status updates.
let _syncLock = false;
export function isSyncInProgress(): boolean {
  return _syncLock;
}
function acquireSyncLock(): boolean {
  if (_syncLock) return false;
  _syncLock = true;
  return true;
}
function releaseSyncLock(): void {
  _syncLock = false;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isNetworkError = (error: any) => {
  return (
    !error?.response ||
    error.code === 'ECONNABORTED' ||
    String(error.message).includes('Network Error') ||
    String(error.message).includes('timeout')
  );
};

/** Dispatch a typed window event safely */
function dispatch(name: string, detail?: any) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

// ─────────────────────────────────────────────
// AUTH — the sync engine must survive an expired access token. Previously it
// only attached whatever token was in localStorage; an expired token meant a
// 401 that marked the ENTIRE queue as failed. Now it proactively refreshes
// (like apiCalls does) and retries once on 401.
// ─────────────────────────────────────────────
const parseJwt = (token: string) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

// Single-flight refresh — concurrent 401s share one refresh request
let _refreshPromise: Promise<string | null> | null = null;
function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return Promise.resolve(null);

  if (!_refreshPromise) {
    _refreshPromise = axios
      .post(`${API_BASE}/auth/refresh`, { refresh_token: refreshToken })
      .then((res) => {
        const token = res.data?.access_token || null;
        if (token) localStorage.setItem('access_token', token);
        return token;
      })
      .catch(() => null)
      .finally(() => {
        _refreshPromise = null;
      });
  }
  return _refreshPromise;
}

// Attach Bearer token on every request, refreshing proactively if it's
// about to expire (within 5 minutes)
syncApi.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    let token = localStorage.getItem('access_token');
    if (token) {
      const payload = parseJwt(token);
      const now = Date.now() / 1000;
      if (payload?.exp && payload.exp - now < 300) {
        token = (await refreshAccessToken()) || token;
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// On 401: refresh once and retry the request. If that fails too, the error
// propagates and push/pull leave the queue untouched (entries stay pending
// and go out on the next cycle) — they are NOT marked failed.
syncApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config as any;
    if (error.response?.status === 401 && config && !config._retried) {
      const token = await refreshAccessToken();
      if (token) {
        config._retried = true;
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        return syncApi.request(config);
      }
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────
// PUSH: Send queued local changes to server
// ─────────────────────────────────────────────
export async function pushChanges(includeFailed = false): Promise<{ pushed: number; failed: number; conflicts: number }> {
  const empty = { pushed: 0, failed: 0, conflicts: 0 };
  if (typeof window === 'undefined') return empty;

  if (!acquireSyncLock()) {
    console.warn('⚠️ Sync already in progress — skipping this push');
    return empty;
  }

  try {
    // Read the queue INSIDE the lock so no other push can grab the same rows.
    //  - auto mode: pending + stuck entries still under the auto-retry cap
    //  - manual retry: everything, including conflicts, with counters reset
    const statuses = includeFailed
      ? ['pending', 'failed', 'rate_limited', 'conflict_detected']
      : ['pending', 'failed', 'rate_limited'];
    let pendingChanges = await db.sync_queue
      .where('status')
      .anyOf(statuses)
      .toArray();

    if (!includeFailed) {
      pendingChanges = pendingChanges.filter(
        (c) => c.status === 'pending' || (c.attempts ?? 0) < MAX_AUTO_RETRY_ATTEMPTS
      );
    }

    // Push in the order changes were made — a CREATE must reach the server
    // before its UPDATEs (queue ids are auto-increment).
    pendingChanges.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

    if (pendingChanges.length === 0) {
      dispatch('tuhanas:push-complete', empty);
      return empty;
    }

    if (!(await isOnline())) {
      console.warn('⚠️ Offline — pushChanges skipped');
      return empty;
    }

    return await pushChangesLocked(pendingChanges, includeFailed);
  } finally {
    releaseSyncLock();
  }
}

async function pushChangesLocked(
  pendingChanges: SyncQueueEntry[],
  includeFailed: boolean
): Promise<{ pushed: number; failed: number; conflicts: number }> {
  const mappedChanges = pendingChanges.map((c) => {
    const payload = c.payload ? { ...c.payload } : c.payload;
    // Manual retry of a conflicted entry: strip the stale updated_at so the
    // server applies it (last-write-wins by explicit user intent). Otherwise
    // the same old timestamp re-conflicts forever and the entry can never
    // be resolved.
    if (includeFailed && c.status === 'conflict_detected' && payload?.updated_at) {
      delete payload.updated_at;
    }
    return {
      entity: c.entity,
      entityId: c.entityId,
      operation: c.operation,
      payload,
      timestamp: c.timestamp,
    };
  });

  const bumpAttempts = async (
    status: SyncQueueEntry['status'] | null,
    error?: string
  ) => {
    // Increment attempts on every entry in this batch; optionally force a
    // status. Entries that blow past the auto-retry cap get parked as
    // 'failed' so they stop hot-looping but stay visible for manual retry.
    await db.sync_queue.bulkUpdate(
      pendingChanges.map((c) => {
        const attempts = (c.attempts ?? 0) + 1;
        const nextStatus =
          status ?? (attempts >= MAX_AUTO_RETRY_ATTEMPTS ? ('failed' as const) : c.status);
        return {
          key: c.id!,
          changes: { attempts, status: nextStatus, ...(error ? { error } : {}) },
        };
      })
    );
  };

  let attempt = 0;
  while (attempt < MAX_SYNC_RETRIES) {
    try {
      const response = await syncApi.post('/sync/push', { changes: mappedChanges });

      if (response.data.success) {
        const processed = response.data.changes || [];
        const conflicts = (response.data.errors || []).filter(
          (e: any) => e.reason === 'conflict_detected'
        );
        const otherErrors = (response.data.errors || []).filter(
          (e: any) => e.reason !== 'conflict_detected'
        );

        const conflictIndices = new Set<number>();
        conflicts.forEach((e: any) => {
          if (typeof e.index === "number") conflictIndices.add(e.index);
        });

        const failedIndices = new Set<number>();
        otherErrors.forEach((e: any) => {
          if (typeof e.index === "number") failedIndices.add(e.index);
        });

        // 100% robust index-based status resolution for the entire batch
        const updates = pendingChanges.map((c, index) => {
          if (conflictIndices.has(index)) {
            return {
              key: c.id!,
              changes: { status: 'conflict_detected' as const, attempts: (c.attempts ?? 0) + 1 },
            };
          } else if (failedIndices.has(index)) {
            const errDetail = otherErrors.find((e: any) => e.index === index);
            return {
              key: c.id!,
              changes: {
                status: 'failed' as const,
                attempts: (c.attempts ?? 0) + 1,
                error: errDetail?.reason || 'Server sync failed',
              },
            };
          } else {
            return { key: c.id!, changes: { status: 'synced' as const } };
          }
        });

        if (updates.length > 0) {
          await db.sync_queue.bulkUpdate(updates);
        }

        if (conflicts.length > 0) {
          console.warn(`⚠️ ${conflicts.length} conflicts detected`);
        }

        // Clean up old synced entries (>48h)
        const cutoff = Date.now() - 48 * 60 * 60 * 1000;
        await db.sync_queue
          .where('timestamp')
          .below(cutoff)
          .and((item) => item.status === 'synced')
          .delete();

        const result = {
          pushed: pendingChanges.length - conflictIndices.size - failedIndices.size,
          failed: failedIndices.size,
          conflicts: conflictIndices.size,
        };
        dispatch('tuhanas:push-complete', result);
        return result;
      }

      // success: false without an HTTP error (shouldn't happen) — transient
      await bumpAttempts(null, response.data?.error || 'Server rejected sync batch');
      const failResult = { pushed: 0, failed: pendingChanges.length, conflicts: 0 };
      dispatch('tuhanas:push-complete', failResult);
      return failResult;
    } catch (error: any) {
      if (isNetworkError(error)) {
        attempt += 1;
        if (attempt < MAX_SYNC_RETRIES) {
          console.warn(`⚠️ Network issue during push, retrying (${attempt}/${MAX_SYNC_RETRIES})`);
          await delay(RETRY_BASE_MS * attempt);
          continue;
        }
        // Network gone — leave everything untouched; the next sync cycle
        // picks the same entries up again.
        console.warn('⚠️ Push skipped — network unavailable');
        return { pushed: 0, failed: 0, conflicts: 0 };
      }

      // Auth failure even after the interceptor's refresh+retry — leave the
      // queue untouched (entries stay pending). Marking them failed here was
      // how an expired token used to strand the entire queue.
      if (error.response?.status === 401) {
        console.warn('⚠️ Push skipped — authentication expired');
        return { pushed: 0, failed: 0, conflicts: 0 };
      }

      // Rate limited
      if (error.response?.status === 429) {
        console.warn('⚠️ Rate limited — backing off sync');
        await db.sync_queue
          .where('id')
          .anyOf(pendingChanges.map((c) => c.id!))
          .modify({ status: 'rate_limited' });
        return { pushed: 0, failed: 0, conflicts: 0 };
      }

      // Server error (5xx etc.) — treat as transient: bump attempt counters
      // so a genuinely poisoned batch eventually parks as 'failed', but keep
      // retrying automatically until then.
      await bumpAttempts(null, error.message);
      console.warn('⚠️ Push failed with server error — will retry:', error.message);
      return { pushed: 0, failed: pendingChanges.length, conflicts: 0 };
    }
  }

  return { pushed: 0, failed: 0, conflicts: 0 };
}

// ─────────────────────────────────────────────
// PULL: Fetch records changed since lastSync
// ─────────────────────────────────────────────
export async function pullUpdates(): Promise<{ total: number }> {
  if (!(await isOnline())) {
    console.warn('⚠️ Offline — pullUpdates skipped');
    return { total: 0 };
  }

  if (!acquireSyncLock()) {
    console.warn('⚠️ Sync already in progress — skipping this pull');
    return { total: 0 };
  }

  try {
    return await pullUpdatesLocked();
  } finally {
    releaseSyncLock();
  }
}

async function pullUpdatesLocked(): Promise<{ total: number }> {
  dispatch('tuhanas:pull-start');
  dispatch('tuhanas:pull-progress', {
    step: 0,
    total: 14,
    label: 'Connecting to server...',
    pct: 5,
  });

  const lastSync =
    typeof window !== 'undefined' ? localStorage.getItem(LAST_SYNC_KEY) || '' : '';

  let response: any;
  let attempt = 0;

  while (attempt < MAX_SYNC_RETRIES) {
    try {
      response = await syncApi.get('/sync/pull', { params: { lastSync } });
      break;
    } catch (err: any) {
      if (
        err.response?.status === 400 &&
        err.response?.data?.error === 'invalid_lastSync_format'
      ) {
        console.warn('Resetting invalid sync timestamp');
        if (typeof window !== 'undefined') localStorage.removeItem(LAST_SYNC_KEY);
        try {
          response = await syncApi.get('/sync/pull', { params: { lastSync: '' } });
          break;
        } catch (err2: any) {
          dispatch('tuhanas:pull-complete', { total: 0 });
          return { total: 0 };
        }
      }

      if (isNetworkError(err)) {
        attempt += 1;
        if (attempt < MAX_SYNC_RETRIES) {
          dispatch('tuhanas:pull-progress', {
            step: 0,
            total: 14,
            label: `Retrying connection (${attempt}/${MAX_SYNC_RETRIES})...`,
            pct: Math.round((attempt / MAX_SYNC_RETRIES) * 15),
          });
          console.warn(`⚠️ Network issue during pull, retrying (${attempt}/${MAX_SYNC_RETRIES})`);
          await delay(RETRY_BASE_MS * attempt);
          continue;
        }
        console.warn('⚠️ Pull skipped — network unavailable');
        dispatch('tuhanas:pull-complete', { total: 0 });
        return { total: 0 };
      }

      // Auth/server error — end the pull cleanly (never leave the UI
      // hanging in "pulling" state) and try again on the next cycle.
      console.warn('⚠️ Pull failed:', err?.message);
      dispatch('tuhanas:pull-complete', { total: 0 });
      return { total: 0 };
    }
  }

  const { updates, timestamp } = response.data;

  if (!updates) {
    dispatch('tuhanas:pull-complete', { total: 0 });
    return { total: 0 };
  }

  // Protect local rows that still have unsynced queued changes: a pull must
  // never clobber an offline edit that hasn't reached the server yet
  // (backgroundSync pushes before pulling, but a failed or conflicted push
  // has to survive the pull that follows it).
  const unsynced = await db.sync_queue
    .where('status')
    .anyOf(['pending', 'failed', 'rate_limited', 'conflict_detected'])
    .toArray();
  const protectedIds = new Map<string, Set<string>>();
  for (const c of unsynced) {
    if (!protectedIds.has(c.entity)) protectedIds.set(c.entity, new Set());
    protectedIds.get(c.entity)!.add(c.entityId);
  }

  // Table order matters: shops first, then products, then dependents
  const tableOrder: [string, string][] = [
    ['shops', 'shops'],
    ['products', 'products'],
    ['customers', 'customers'],
    ['suppliers', 'suppliers'],
    ['supplier_transactions', 'supplier_transactions'],
    ['stocks', 'stocks'],
    ['expense_categories', 'expense_categories'],
    ['expenses', 'expenses'],
    ['purchases', 'purchases'],
    ['purchase_items', 'purchase_items'],
    ['sales', 'sales'],
    ['sale_items', 'sale_items'],
    ['transfers', 'transfers'],
    ['adjustments', 'adjustments'],
  ];

  let total = 0;
  let step = 0;
  let hadTableErrors = false;

  for (const [backendKey, dexieTable] of tableOrder) {
    step++;
    const records: any[] = updates[backendKey] || [];
    const pct = Math.round(5 + (step / tableOrder.length) * 90);

    dispatch('tuhanas:pull-progress', {
      step,
      total: tableOrder.length,
      label: records.length > 0
        ? `Syncing ${dexieTable} (${records.length} records)...`
        : `Checking ${dexieTable}...`,
      pct,
    });

    if (records.length === 0) continue;

    try {
      const guard = protectedIds.get(dexieTable);
      const toUpsert = records.filter((r) => r.id && !r.is_deleted && !guard?.has(r.id));
      const toDelete = records
        .filter((r) => r.id && r.is_deleted && !guard?.has(r.id))
        .map((r) => r.id);

      if (toUpsert.length > 0) {
        await (db as any)[dexieTable].bulkPut(toUpsert);
        total += toUpsert.length;
      }
      if (toDelete.length > 0) {
        await (db as any)[dexieTable].bulkDelete(toDelete);
      }

      console.log(
        `  ✓ ${dexieTable}: ${toUpsert.length} upserted, ${toDelete.length} deleted`
      );
    } catch (err: any) {
      // Don't let one bad table block the rest — but remember the failure so
      // we don't advance the sync watermark past records we failed to apply.
      hadTableErrors = true;
      console.warn(`⚠️ Could not sync table "${dexieTable}":`, err.message);
    }
  }

  // After pulling shops, pre-warm the settings cache for offline receipt printing
  try {
    const allShops = await db.shops.toArray();
    await Promise.all(allShops.map(async (shop: any) => {
      try {
        const res = await syncApi.get('/shops/' + shop.id + '/settings');
        const settings = res.data?.settings || res.data || {};
        if (typeof window !== 'undefined' && Object.keys(settings).length > 0) {
          localStorage.setItem(`shop_settings_${shop.id}`, JSON.stringify(settings));
        }
      } catch {
        // Non-critical — skip if this shop settings endpoint fails
      }
    }));
  } catch (e) {
    console.warn('Could not warm shop settings cache:', e);
  }

  // Only advance the watermark when everything applied cleanly; otherwise the
  // records in the failed table would be skipped forever on subsequent pulls.
  if (typeof window !== 'undefined' && timestamp && !hadTableErrors) {
    localStorage.setItem(LAST_SYNC_KEY, timestamp);
  }

  dispatch('tuhanas:pull-progress', {
    step: tableOrder.length,
    total: tableOrder.length,
    label: `Pull complete — ${total} records updated`,
    pct: 100,
  });

  console.log(`📥 Pull complete — ${total} records synced`);
  dispatch('tuhanas:pull-complete', { total });

  return { total };
}

// ─────────────────────────────────────────────
// INITIAL SYNC — full pull (no lastSync)
// ─────────────────────────────────────────────
export async function performInitialSync(): Promise<void> {
  if (typeof window !== 'undefined') localStorage.removeItem(LAST_SYNC_KEY);
  await pullUpdates();
}

// ─────────────────────────────────────────────
// QUEUE a local change for later push
// ─────────────────────────────────────────────
export async function queueChange(
  entity: string,
  entityId: string,
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: any
): Promise<void> {
  await db.sync_queue.add({
    entity,
    entityId,
    operation,
    payload,
    timestamp: Date.now(),
    status: 'pending',
    attempts: 0,
  });
}

// ─────────────────────────────────────────────
// STATS for the SyncBanner UI
// ─────────────────────────────────────────────
export async function getQueueStats() {
  const [pending, failed, rateLimited, synced, conflicts] = await Promise.all([
    db.sync_queue.where('status').equals('pending').count(),
    db.sync_queue.where('status').equals('failed').count(),
    db.sync_queue.where('status').equals('rate_limited').count(),
    db.sync_queue.where('status').equals('synced').count(),
    db.sync_queue.where('status').equals('conflict_detected').count(),
  ]);
  return {
    pending,
    failed: failed + rateLimited,
    synced,
    conflicts,
    total: pending + failed + rateLimited + synced + conflicts,
  };
}

export { pullUpdates as pullFromServer, pushChanges as pushToServer };
