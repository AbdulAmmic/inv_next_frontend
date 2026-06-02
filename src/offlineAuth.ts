/**
 * offlineAuth.ts
 *
 * Offline-first authentication layer.
 *
 * Flow:
 *  1. Try online login → success → cache credentials locally → proceed
 *  2. Try online login → network error → check local credential cache
 *     → hash matches → restore session from cache → proceed
 *     → hash mismatch → show "wrong password" error
 *
 * Security:
 *  - Passwords are NEVER stored in plain text.
 *  - SHA-256 hash via native Web Crypto API (zero extra packages).
 *  - Credential cache is stored in localStorage under a single key.
 */

const OFFLINE_CRED_KEY = 'tuhanas_offline_cred';

export interface CachedCredential {
  email: string;
  passwordHash: string;       // SHA-256 hex
  user: any;                  // last known user profile
  access_token: string;       // last valid token
  refresh_token: string;
  cachedAt: string;           // ISO date
}

// ─────────────────────────────────────────────
// Hash a password using SHA-256 (browser built-in)
// ─────────────────────────────────────────────
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────────
// Save credentials to cache after successful online login
// ─────────────────────────────────────────────
export async function cacheLoginCredentials(
  email: string,
  password: string,
  user: any,
  access_token: string,
  refresh_token: string
): Promise<void> {
  try {
    const cleanEmail = email.toLowerCase().trim();
    const passwordHash = await sha256(cleanEmail + ':' + password);
    const cred: CachedCredential = {
      email: cleanEmail,
      passwordHash,
      user,
      access_token,
      refresh_token,
      cachedAt: new Date().toISOString(),
    };
    
    // Cache under a user-specific key so multiple accounts can log in offline on the same machine
    const userKey = `${OFFLINE_CRED_KEY}_${cleanEmail}`;
    localStorage.setItem(userKey, JSON.stringify(cred));
    
    // Also save to default key as fallback
    localStorage.setItem(OFFLINE_CRED_KEY, JSON.stringify(cred));
    console.log('🔐 Offline credentials cached.');
  } catch (e) {
    console.warn('Could not cache offline credentials:', e);
  }
}

// ─────────────────────────────────────────────
// Verify credentials against the local cache
// ─────────────────────────────────────────────
export async function verifyOfflineLogin(
  email: string,
  password: string
): Promise<{ success: true; data: CachedCredential } | { success: false; reason: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const userKey = `${OFFLINE_CRED_KEY}_${cleanEmail}`;
  let raw = localStorage.getItem(userKey);
  
  if (!raw) {
    // Fallback to legacy single key if it matches the email
    const legacyRaw = localStorage.getItem(OFFLINE_CRED_KEY);
    if (legacyRaw) {
      try {
        const legacyCred = JSON.parse(legacyRaw);
        if (legacyCred.email === cleanEmail) {
          raw = legacyRaw;
        }
      } catch {}
    }
  }

  if (!raw) {
    return { success: false, reason: 'No offline record for this email. Please login online first.' };
  }

  let cred: CachedCredential;
  try {
    cred = JSON.parse(raw);
  } catch {
    return { success: false, reason: 'Corrupted offline data. Please login online.' };
  }

  if (cred.email !== cleanEmail) {
    return { success: false, reason: 'No offline record for this email.' };
  }

  const enteredHash = await sha256(cleanEmail + ':' + password);
  if (enteredHash !== cred.passwordHash) {
    return { success: false, reason: 'Incorrect password.' };
  }

  return { success: true, data: cred };
}

// ─────────────────────────────────────────────
// Check if a network error is an offline/connection error
// ─────────────────────────────────────────────
export function isNetworkError(err: any): boolean {
  if (!err) return false;
  // Axios network error (no response from server)
  if (err.code === 'ERR_NETWORK') return true;
  if (err.code === 'ECONNABORTED') return true;
  if (err.message === 'Network Error') return true;
  // No response at all (server unreachable)
  if (err.response === undefined && err.request !== undefined) return true;
  // Browser offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  return false;
}

// ─────────────────────────────────────────────
export function clearOfflineCredentials(): void {
  // Remove the generic/legacy key
  localStorage.removeItem(OFFLINE_CRED_KEY);
  // Remove all per-user keys (tuhanas_offline_cred_<email>)
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(OFFLINE_CRED_KEY + '_')) {
      toRemove.push(key);
    }
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
}

// ─────────────────────────────────────────────
// Check if any credentials are cached
// ─────────────────────────────────────────────
export function hasOfflineCredentials(): boolean {
  return !!localStorage.getItem(OFFLINE_CRED_KEY);
}
