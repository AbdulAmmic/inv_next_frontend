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
export async function pushChanges(): Promise<{ pushed: number; failed: number }> {
  const pendingChanges = await db.sync_queue
    .where('status')
    .anyOf(['pending', 'failed'])
    .toArray();

  if (pendingChanges.length === 0) return { pushed: 0, failed: 0 };

  try {
    const response = await syncApi.post('/sync/push', {
      changes: pendingChanges.map(c => ({
        entity: c.entity,
        entityId: c.entityId,
        operation: c.operation,
        payload: c.payload,
        timestamp: c.timestamp
      }))
    });

    if (response.data.success) {
      await db.sync_queue
        .where('id').anyOf(pendingChanges.map(c => c.id!))
        .modify({ status: 'synced' });

      // Cleanup synced entries older than 48h
      const cutoff = Date.now() - 48 * 60 * 60 * 1000;
      await db.sync_queue
        .where('timestamp').below(cutoff)
        .and(item => item.status === 'synced')
        .delete();

      return { pushed: pendingChanges.length, failed: 0 };
    }
    return { pushed: 0, failed: pendingChanges.length };
  } catch (error: any) {
    await db.sync_queue
      .where('id').anyOf(pendingChanges.map(c => c.id!))
      .modify({ status: 'failed', error: error.message });
    return { pushed: 0, failed: pendingChanges.length };
  }
}

// ─────────────────────────────────────────────
// PULL: Fetch only records changed since last sync
// ─────────────────────────────────────────────
export async function pullUpdates(): Promise<{ total: number }> {
  const lastSync = typeof window !== 'undefined'
    ? localStorage.getItem(LAST_SYNC_KEY) || ''
    : '';

  let response;
  try {
    response = await syncApi.get('/sync/pull', { params: { lastSync } });
  } catch (err: any) {
    if (err.response?.status === 400 && err.response?.data?.error === "invalid_lastSync_format") {
      console.warn("Resetting invalid sync timestamp");
      localStorage.removeItem(LAST_SYNC_KEY);
    }
    throw err;
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
  const [pending, failed, synced] = await Promise.all([
    db.sync_queue.where('status').equals('pending').count(),
    db.sync_queue.where('status').equals('failed').count(),
    db.sync_queue.where('status').equals('synced').count(),
  ]);
  return { pending, failed, synced, total: pending + failed + synced };
}

export { pullUpdates as pullFromServer, pushChanges as pushToServer };
