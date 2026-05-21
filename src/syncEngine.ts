/**
 * syncEngine.ts
 *
 * Sync engine — uses its OWN axios instance to avoid circular deps with apiCalls.ts.
 *
 * - PULL: GET /sync/pull  (incremental delta — only records changed since lastSync)
 * - PUSH: POST /sync/push (sends only queued user-triggered changes)
 */

import axios from 'axios';
import { db } from './db';

const LAST_SYNC_KEY = 'last_sync_timestamp';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://inv-flask-api.onrender.com';

// Own axios instance — NO import from apiCalls.ts (breaks circular dep)
const syncApi = axios.create({ baseURL: API_BASE, timeout: 120000 });

const MAX_SYNC_RETRIES = 3;
const RETRY_BASE_MS = 1000;

const isOnline = () => typeof window !== 'undefined' && navigator.onLine;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isNetworkError = (error: any) => {
  return !error?.response || error.code === 'ECONNABORTED' || String(error.message).includes('Network Error') || String(error.message).includes('timeout');
};

// Attach Bearer token on every request
syncApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─────────────────────────────────────────────
// PUSH: Send only queued local changes to server
// ─────────────────────────────────────────────
export async function pushChanges(): Promise<{ pushed: number; failed: number; conflicts: number }> {
  const pendingChanges = await db.sync_queue
    .where('status')
    .anyOf(['pending', 'failed'])
    .toArray();

  if (pendingChanges.length === 0) return { pushed: 0, failed: 0, conflicts: 0 };
  if (!isOnline()) {
    console.warn('⚠️ Offline — pushChanges skipped');
    return { pushed: 0, failed: 0, conflicts: 0 };
  }

  const mappedChanges = pendingChanges.map(c => {
    const change: any = {
      entity: c.entity,
      entityId: c.entityId,
      operation: c.operation,
      payload: c.payload,
      timestamp: c.timestamp
    };
    // Include updated_at for conflict detection
    if (c.payload && c.payload.updated_at) {
      change.payload.updated_at = c.payload.updated_at;
    }
    return change;
  });

  let attempt = 0;
  while (attempt < MAX_SYNC_RETRIES) {
    try {
      const response = await syncApi.post('/sync/push', {
        changes: mappedChanges
      });

      if (response.data.success) {
        const processed = response.data.changes || [];
        const conflicts = (response.data.errors || []).filter((e: any) => e.reason === 'conflict_detected');
        
        // Mark successfully processed changes as synced
        if (processed.length > 0) {
          const syncedIds = processed.map((p: any) => 
            pendingChanges.find(c => c.entityId === p.id && c.entity === p.entity)?.id
          ).filter(Boolean);
          
          if (syncedIds.length > 0) {
            await db.sync_queue
              .bulkUpdate(syncedIds.map(id => ({ key: id, changes: { status: 'synced' } })));
          }
        }
        
        // Mark conflicts with special status for user review
        if (conflicts.length > 0) {
          const conflictIds = conflicts.map((e: any) => 
            pendingChanges.find(c => c.entityId === e.id && c.entity === e.entity)?.id
          ).filter(Boolean);
          
          if (conflictIds.length > 0) {
            await db.sync_queue
              .bulkUpdate(conflictIds.map(id => ({ key: id, changes: { status: 'conflict_detected' } })));
          }
          
          console.warn(`⚠️ ${conflicts.length} conflicts detected - server has newer versions`);
        }

        // Cleanup synced entries older than 48h
        const cutoff = Date.now() - 48 * 60 * 60 * 1000;
        await db.sync_queue
          .where('timestamp').below(cutoff)
          .and(item => item.status === 'synced')
          .delete();

        return { 
          pushed: processed.length, 
          failed: (response.data.errors || []).length - conflicts.length,
          conflicts: conflicts.length
        };
      }

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

      // Handle rate limiting
      if (error.response?.status === 429) {
        console.warn('⚠️ Rate limited - backing off sync');
        await db.sync_queue
          .where('id').anyOf(pendingChanges.map(c => c.id!))
          .modify({ status: 'rate_limited' });
        return { pushed: 0, failed: 0, conflicts: 0 };
      }

      // Mark as failed with error message
      await db.sync_queue
        .where('id').anyOf(pendingChanges.map(c => c.id!))
        .modify({ status: 'failed', error: error.message });
      return { pushed: 0, failed: pendingChanges.length, conflicts: 0 };
    }
  }

  return { pushed: 0, failed: 0, conflicts: 0 };
}

// ─────────────────────────────────────────────
// PULL: Fetch only records changed since last sync
// ─────────────────────────────────────────────
export async function pullUpdates(): Promise<{ total: number }> {
  if (!isOnline()) {
    console.warn('⚠️ Offline — pullUpdates skipped');
    return { total: 0 };
  }

  const lastSync = typeof window !== 'undefined'
    ? localStorage.getItem(LAST_SYNC_KEY) || ''
    : '';

  let response: any;
  let attempt = 0;

  while (attempt < MAX_SYNC_RETRIES) {
    try {
      response = await syncApi.get('/sync/pull', { params: { lastSync } });
      break;
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.error === "invalid_lastSync_format") {
        console.warn("Resetting invalid sync timestamp");
        localStorage.removeItem(LAST_SYNC_KEY);
        response = await syncApi.get('/sync/pull', { params: { lastSync: '' } });
        break;
      }

      if (isNetworkError(err)) {
        attempt += 1;
        if (attempt < MAX_SYNC_RETRIES) {
          console.warn(`⚠️ Network issue during pull, retrying (${attempt}/${MAX_SYNC_RETRIES})`);
          await delay(RETRY_BASE_MS * attempt);
          continue;
        }
        console.warn('⚠️ Pull skipped — network unavailable');
        return { total: 0 };
      }

      throw err;
    }
  }

  const { updates, timestamp } = response.data;

  if (!updates) return { total: 0 };

  const tableMap: Record<string, string> = {
    products: 'products',
    sales: 'sales',
    sale_items: 'sale_items',
    stocks: 'stocks',
    purchases: 'purchases',
    purchase_items: 'purchase_items',
    expenses: 'expenses',
    expense_categories: 'expense_categories',
    customers: 'customers',
    suppliers: 'suppliers',
    supplier_transactions: 'supplier_transactions',
    transfers: 'transfers',
    adjustments: 'adjustments',
    shops: 'shops',
  };

  let total = 0;

  for (const [backendKey, dexieTable] of Object.entries(tableMap)) {
    const records: any[] = updates[backendKey] || [];
    if (records.length === 0) continue;

    try {
      const toUpsert = records.filter(r => r.id && !r.is_deleted);
      const toDelete = records.filter(r => r.id && r.is_deleted).map(r => r.id);

      if (toUpsert.length > 0) {
        await (db as any)[dexieTable].bulkPut(toUpsert);
        total += toUpsert.length;
      }
      if (toDelete.length > 0) {
        await (db as any)[dexieTable].bulkDelete(toDelete);
      }

      console.log(`  ✓ ${dexieTable}: ${toUpsert.length} upserted, ${toDelete.length} deleted`);
    } catch (err: any) {
      // Skip failing table — don't let one bad table block the rest
      console.warn(`⚠️ Could not sync table "${dexieTable}":`, err.message);
    }
  }

  if (typeof window !== 'undefined' && timestamp) {
    localStorage.setItem(LAST_SYNC_KEY, timestamp);
  }

  console.log(`📥 Pull complete — ${total} records synced`);
  return { total };
}

// ─────────────────────────────────────────────
// INITIAL SYNC — passes empty lastSync for full pull
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
    entity, entityId, operation, payload,
    timestamp: Date.now(),
    status: 'pending'
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
  return { pending, failed, synced, conflicts, total: pending + failed + synced + conflicts };
}

export { pullUpdates as pullFromServer, pushChanges as pushToServer };
