/**
 * syncEngine.ts
 *
 * Hybrid sync engine:
 * - PULL: Uses /sync/pull (incremental, delta-based) — only fetches changed records
 * - PUSH: Uses /sync/push (sends only queued changes, nothing extra)
 * - getQueueStats() → returns pending/synced/failed counts for UI
 */

import { db, SyncQueueEntry } from './db';
import { api } from './apiCalls';

const LAST_SYNC_KEY = 'last_sync_timestamp';

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
    const response = await api.post('/sync/push', {
      changes: pendingChanges.map(c => ({
        entity: c.entity,
        entityId: c.entityId,
        operation: c.operation,
        payload: c.payload,      // Only the changed fields, not full record
        timestamp: c.timestamp
      }))
    });

    if (response.data.success) {
      // Mark all as synced
      await db.sync_queue
        .where('id')
        .anyOf(pendingChanges.map(c => c.id!))
        .modify({ status: 'synced' });

      // Cleanup synced entries older than 48h
      const cutoff = Date.now() - 48 * 60 * 60 * 1000;
      await db.sync_queue
        .where('timestamp')
        .below(cutoff)
        .and(item => item.status === 'synced')
        .delete();

      return { pushed: pendingChanges.length, failed: 0 };
    }

    return { pushed: 0, failed: pendingChanges.length };
  } catch (error: any) {
    console.error('Push sync failed:', error);
    await db.sync_queue
      .where('id')
      .anyOf(pendingChanges.map(c => c.id!))
      .modify({ status: 'failed', error: error.message });
    return { pushed: 0, failed: pendingChanges.length };
  }
}

// ─────────────────────────────────────────────
// PULL: Fetch only records changed since last sync
// Uses the backend /sync/pull which does delta filtering
// ─────────────────────────────────────────────
export async function pullUpdates(): Promise<void> {
  const lastSync = typeof window !== 'undefined'
    ? localStorage.getItem(LAST_SYNC_KEY) || ''
    : '';

  try {
    const response = await api.get('/sync/pull', {
      params: { lastSync },
      timeout: 120000,  // 120s — Render free tier can take ~60s to wake + data fetch
    });

    const { updates, timestamp } = response.data;

    if (!updates) {
      console.warn('⚠️ /sync/pull returned no updates object');
      return;
    }

    // Table map: backend key → Dexie table name
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
    };

    let totalUpserted = 0;
    let totalDeleted = 0;

    for (const [backendKey, dexieTable] of Object.entries(tableMap)) {
      const records: any[] = updates[backendKey] || [];
      if (records.length === 0) continue;

      for (const record of records) {
        if (!record.id) continue;

        if (record.is_deleted) {
          await (db as any)[dexieTable].delete(record.id);
          totalDeleted++;
        } else {
          // Conflict resolution: only update if server record is newer
          const local = await (db as any)[dexieTable].get(record.id);
          if (local?.updated_at && local.updated_at > record.updated_at) {
            continue; // Local is newer — skip
          }
          await (db as any)[dexieTable].put(record);
          totalUpserted++;
        }
      }
    }

    // Save sync timestamp for next incremental pull
    if (typeof window !== 'undefined' && timestamp) {
      localStorage.setItem(LAST_SYNC_KEY, timestamp);
    }

    console.log(`📥 Pull complete — ${totalUpserted} updated, ${totalDeleted} deleted`);
  } catch (error: any) {
    console.error('Pull sync failed:', error?.response?.status, error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────
// INITIAL SYNC — clears lastSync so full data is pulled
// ─────────────────────────────────────────────
export async function performInitialSync(): Promise<void> {
  console.log('🚀 Performing full initial pull from server...');
  // Clear lastSync → tells backend to return ALL records
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LAST_SYNC_KEY);
  }
  await pullUpdates();
  console.log('✅ Initial sync complete');
}

// ─────────────────────────────────────────────
// QUEUE: Add a change to the sync queue
// Only call this when a real user action creates/updates/deletes data
// ─────────────────────────────────────────────
export async function queueChange(
  entity: string,
  entityId: string,
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: any   // Only pass the fields that actually changed
): Promise<void> {
  await db.sync_queue.add({
    entity,
    entityId,
    operation,
    payload,
    timestamp: Date.now(),
    status: 'pending'
  });
}

// ─────────────────────────────────────────────
// STATS: Return queue counts for the UI banner
// ─────────────────────────────────────────────
export async function getQueueStats(): Promise<{
  pending: number;
  failed: number;
  synced: number;
  total: number;
}> {
  const [pending, failed, synced] = await Promise.all([
    db.sync_queue.where('status').equals('pending').count(),
    db.sync_queue.where('status').equals('failed').count(),
    db.sync_queue.where('status').equals('synced').count(),
  ]);
  return { pending, failed, synced, total: pending + failed + synced };
}

// ─────────────────────────────────────────────
// Re-exports for compatibility
// ─────────────────────────────────────────────
export { pullUpdates as pullFromServer, pushChanges as pushToServer };
