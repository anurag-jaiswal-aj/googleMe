import { adminVerify } from '../api/index.js';

let _verifiedToken = null;
let _verificationPromise = null;
const _listeners = new Set();
let _storageListenerAttached = false;

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}

export function subscribeToAdminAuth(listener) {
  _listeners.add(listener);
  ensureStorageListener();
  return () => {
    _listeners.delete(listener);
  };
}

export function notifyAdminAuthChange() {
  for (const listener of _listeners) {
    try {
      listener();
    } catch {
      // Safe fallback
    }
  }
}

export function handleStorageEvent(event) {
  if (!event || event.key === 'adminToken' || event.key === null) {
    const storage = getStorage();
    const currentToken = storage ? storage.getItem('adminToken') : null;
    if (!currentToken || currentToken !== _verifiedToken) {
      _verifiedToken = null;
    }
    notifyAdminAuthChange();
  }
}

function ensureStorageListener() {
  if (_storageListenerAttached) return;
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', handleStorageEvent);
    _storageListenerAttached = true;
  }
}

// Auto-attach storage listener if in browser environment
ensureStorageListener();

/**
 * Returns true if the provided token matches the token verified in memory
 * during this browser session.
 */
export function isTokenSessionVerified(expectedToken) {
  const storage = getStorage();
  const token = expectedToken || (storage ? storage.getItem('adminToken') : null);
  return Boolean(token && token === _verifiedToken);
}

/**
 * Authoritatively verifies the admin token with the server.
 * Returns true if valid, false if missing, expired, invalid, or network failed.
 * Fail-closed: Never treats network errors or missing tokens as authorized.
 * Guards against stale in-flight responses if token changed or was removed.
 */
export async function verifyAdminSession(verifyFn = adminVerify) {
  const storage = getStorage();
  const token = storage ? storage.getItem('adminToken') : null;
  if (!token) {
    _verifiedToken = null;
    return false;
  }

  // Fast path: already verified this exact token during this session
  if (token === _verifiedToken) {
    return true;
  }

  // Deduplicate in-flight verification requests
  if (_verificationPromise) {
    return _verificationPromise;
  }

  _verificationPromise = Promise.resolve()
    .then(() => (typeof verifyFn === 'function' ? verifyFn() : Promise.resolve(null)))
    .then((res) => {
      // Stale response guard: check whether storage token was removed or replaced while request was in-flight
      const currentToken = storage ? storage.getItem('adminToken') : null;
      if (!currentToken || currentToken !== token) {
        _verifiedToken = null;
        return false;
      }
      if (res?.valid) {
        _verifiedToken = token;
        return true;
      }
      _verifiedToken = null;
      if (storage) {
        storage.removeItem('adminToken');
      }
      return false;
    })
    .catch((err) => {
      _verifiedToken = null;
      // If server explicitly rejected with 401, evict the stale token
      if (err?.response?.status === 401 && storage) {
        storage.removeItem('adminToken');
      }
      return false;
    })
    .finally(() => {
      _verificationPromise = null;
    });

  return _verificationPromise;
}

/**
 * Manually set verified admin token in memory (called upon successful login).
 */
export function setVerifiedAdminToken(token) {
  _verifiedToken = token || null;
  notifyAdminAuthChange();
}

/**
 * Clear verified admin token in memory (called upon logout).
 */
export function clearVerifiedAdminSession() {
  _verifiedToken = null;
  notifyAdminAuthChange();
}
