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
import { db } from './db';

const LAST_SYNC_KEY = 'last_sync_timestamp';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://inv-flask-api.onrender.com';

// Own axios instance — NO import from apiCalls.ts (avoids circular deps)
const syncApi = axios.create({ baseURL: API_BASE, timeout: 120000 });

const MAX_SYNC_RETRIES = 3;
const RETRY_BASE_MS = 1500;

const isOnline = () => typeof window !== 'undefined' && navigator.onLine;
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

// Attach Bearer token on every request
syncApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─────────────────────────────────────────────
// PUSH: Send queued local changes to server
// ─────────────────────────────────────────────
export async function pushChanges(): Promise<{ pushed: number; failed: number; conflicts: number }> {
  const pendingChanges = await db.sync_queue
    .where('status')
    .anyOf(['pending', 'failed'])
    .toArray();

  if (pendingChanges.length === 0) {
    dispatch('tuhanas:push-complete', { pushed: 0, failed: 0, conflicts: 0 });
    return { pushed: 0, failed: 0, conflicts: 0 };
  }

  if (!isOnline()) {
    console.warn('⚠️ Offline — pushChanges skipped');
    return { pushed: 0, failed: 0, conflicts: 0 };
  }

  const mappedChanges = pendingChanges.map((c) => {
    const change: any = {
      entity: c.entity,
      entityId: c.entityId,
      operation: c.operation,
      payload: c.payload,
      timestamp: c.timestamp,
    };
    if (c.payload?.updated_at) {
      change.payload.updated_at = c.payload.updated_at;
    }
    return change;
  });

  let attempt = 0;
  while (attempt < MAX_SYNC_RETRIES) {
    try {
      const response = await syncApi.post('/sync/push', { changes: mappedChanges });

      if (response.data.success) {
        const processed = response.data.changes || [];
        const conflicts = (response.data.errors || []).filter(
          (e: any) => e.reason === 'conflict_detected'
        );

        // Mark successfully processed as synced
        if (processed.length > 0) {
          const syncedIds = processed
            .map((p: any) =>
              pendingChanges.find(
                (c) => c.entityId === p.id && c.entity === p.entity
              )?.id
            )
            .filter(Boolean);

          if (syncedIds.length > 0) {
            await db.sync_queue.bulkUpdate(
              syncedIds.map((id) => ({ key: id, changes: { status: 'synced' } }))
            );
          }
        }

        // Mark conflicts
        if (conflicts.length > 0) {
          const conflictIds = conflicts
            .map((e: any) =>
              pendingChanges.find(
                (c) => c.entityId === e.id && c.entity === e.entity
              )?.id
            )
            .filter(Boolean);

          if (conflictIds.length > 0) {
            await db.sync_queue.bulkUpdate(
              conflictIds.map((id) => ({
                key: id,
                changes: { status: 'conflict_detected' },
              }))
            );
          }
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
          pushed: processed.length,
          failed: (response.data.errors || []).length - conflicts.length,
          conflicts: conflicts.length,
        };
        dispatch('tuhanas:push-complete', result);
        return result;
      }

      dispatch('tuhanas:push-complete', { pushed: 0, failed: pendingChanges.length, conflicts: 0 });
      return { pushed: 0, failed: pendingChanges.length, conflicts: 0 };
    } catch (error: any) {
      if (isNetworkError(error)) {
        attempt += 1;
        if (attempt < MAX_SYNC_RETRIES) {
          console.warn(`⚠️ Network issue during push, retrying (${attempt}/${MAX_SYNC_RETRIES})`);
          await delay(RETRY_BASE_MS * attempt);
          continue;
        }
        console.warn('⚠️ Push skipped — network unavailable');
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

      // Permanent failure — mark as failed
      await db.sync_queue
        .where('id')
        .anyOf(pendingChanges.map((c) => c.id!))
        .modify({ status: 'failed', error: error.message });
      return { pushed: 0, failed: pendingChanges.length, conflicts: 0 };
    }
  }

  return { pushed: 0, failed: 0, conflicts: 0 };
}

// ─────────────────────────────────────────────
// PULL: Fetch records changed since lastSync
// ─────────────────────────────────────────────
export async function pullUpdates(): Promise<{ total: number }> {
  if (!isOnline()) {
    console.warn('⚠️ Offline — pullUpdates skipped');
    return { total: 0 };
  }

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
        response = await syncApi.get('/sync/pull', { params: { lastSync: '' } });
        break;
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

      dispatch('tuhanas:pull-complete', { total: 0 });
      throw err;
    }
  }

  const { updates, timestamp } = response.data;

  if (!updates) {
    dispatch('tuhanas:pull-complete', { total: 0 });
    return { total: 0 };
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
      const toUpsert = records.filter((r) => r.id && !r.is_deleted);
      const toDelete = records.filter((r) => r.id && r.is_deleted).map((r) => r.id);

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
      // Don't let one bad table block the rest
      console.warn(`⚠️ Could not sync table "${dexieTable}":`, err.message);
    }
  }

  if (typeof window !== 'undefined' && timestamp) {
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
  });
}

// ─────────────────────────────────────────────
// STATS for the SyncBanner UI
// ─────────────────────────────────────────────
export async function getQueueStats() {
  const [pending, failed, synced, conflicts] = await Promise.all([
    db.sync_queue.where('status').equals('pending').count(),
    db.sync_queue.where('status').equals('failed').count(),
    db.sync_queue.where('status').equals('synced').count(),
    db.sync_queue.where('status').equals('conflict_detected').count(),
  ]);
  return {
    pending,
    failed,
    synced,
    conflicts,
    total: pending + failed + synced + conflicts,
  };
}

export { pullUpdates as pullFromServer, pushChanges as pushToServer };
