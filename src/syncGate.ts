/**
 * syncGate.ts
 *
 * Global sync gate — ensures all Dexie reads wait for the initial
 * server pull to complete on a fresh device.
 *
 * Flow:
 *  1. App starts → sync gate is OPEN only if Dexie already has data
 *  2. DashboardLayout does wakeServer + pullUpdates
 *  3. After pull → markSyncReady() → gate opens → all pending reads execute
 *
 * On subsequent loads (Dexie already has data) → gate is immediately open.
 */

const EVENT = 'tuhanas:sync-ready';

// Module-level flag — persists across component re-renders
let _ready = false;

export function isSyncReady(): boolean {
  return _ready;
}

export function markSyncReady(): void {
  _ready = true;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT));
  }
}

/**
 * Wait until sync is ready (or up to timeoutMs).
 * Returns immediately if already ready.
 */
export function waitForSync(timeoutMs = 30000): Promise<void> {
  if (_ready) return Promise.resolve();
  if (typeof window === 'undefined') return Promise.resolve();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      // Timeout — open the gate anyway so pages don't hang forever
      _ready = true;
      resolve();
    }, timeoutMs);

    window.addEventListener(EVENT, () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}
