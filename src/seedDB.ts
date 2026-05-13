/**
 * seedDB.ts
 * Seeds the local Dexie database from the bundled SQL-derived JSON.
 * Only runs once — tracked via localStorage flag "db_seeded_v4".
 * 
 * Tables seeded: products, stocks, sales, sale_items, purchases,
 * purchase_items, expenses, expense_categories, customers, suppliers,
 * transfers, shops, audit_logs
 */

import { db } from './db';

const SEED_FLAG = 'db_seeded_v4';

export interface SeedProgress {
  table: string;
  loaded: number;
  total: number;
  percent: number;
}

export async function seedDatabaseFromSQL(
  onProgress?: (p: SeedProgress) => void
): Promise<void> {
  if (typeof window === 'undefined') return;
  
  // Check if already seeded
  const already = localStorage.getItem(SEED_FLAG);
  if (already === 'true') {
    console.log('✅ DB already seeded, skipping.');
    return;
  }

  console.log('🌱 Seeding database from SQL dump...');

  // Dynamic import to keep bundle size reasonable
  const seedData = await import('./seed-data.json').then(m => m.default) as Record<string, any[]>;

  const tables: Array<{ key: string; table: any }> = [
    { key: 'shops',              table: db.shops },
    { key: 'products',           table: db.products },
    { key: 'customers',          table: db.customers },
    { key: 'suppliers',          table: db.suppliers },
    { key: 'expense_categories', table: db.expense_categories },
    { key: 'stocks',             table: db.stocks },
    { key: 'sales',              table: db.sales },
    { key: 'sale_items',         table: db.sale_items },
    { key: 'purchases',          table: db.purchases },
    { key: 'purchase_items',     table: db.purchase_items },
    { key: 'expenses',           table: db.expenses },
    { key: 'transfers',          table: db.transfers },
    { key: 'audit_logs',         table: db.audit_logs },
  ];

  const BATCH_SIZE = 200;
  let totalLoaded = 0;
  const grandTotal = tables.reduce((sum, t) => sum + (seedData[t.key]?.length || 0), 0);

  for (const { key, table } of tables) {
    const records: any[] = seedData[key] || [];
    if (records.length === 0) continue;

    console.log(`  → Seeding ${records.length} ${key}...`);
    
    // Batch insert for performance
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      await table.bulkPut(batch);
      totalLoaded += batch.length;

      if (onProgress) {
        onProgress({
          table: key,
          loaded: Math.min(i + BATCH_SIZE, records.length),
          total: records.length,
          percent: Math.round((totalLoaded / grandTotal) * 100)
        });
      }
    }
  }

  localStorage.setItem(SEED_FLAG, 'true');
  console.log(`✅ Seeding complete. ${totalLoaded} records loaded.`);
}

/**
 * Reset the seed flag (useful for admin "re-seed from server" action)
 */
export function resetSeedFlag() {
  localStorage.removeItem(SEED_FLAG);
}

/**
 * Check if DB has been seeded
 */
export function isDBSeeded(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SEED_FLAG) === 'true';
}
