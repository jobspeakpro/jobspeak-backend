// jobspeak-backend/services/sttUsageStore.js
// In-memory STT usage tracking with idempotency support
// Resets on deploy (acceptable for Railway)

const LIMIT = 3;

// Map structure: key = `${day}|${userKey}`, value = { used: number, attemptIds: Set<string> }
const usageStore = new Map();

/**
 * Get today's date as YYYY-MM-DD (UTC)
 */
const getToday = () => {
  return new Date().toISOString().slice(0, 10);
};

/**
 * Get or initialize usage entry for a userKey on a given day
 * @param {string} userKey - User identifier
 * @param {string} day - Date string (YYYY-MM-DD), defaults to today
 * @returns {Object} - { used: number, attemptIds: Set<string> }
 */
const getOrInit = (userKey, day = null) => {
  const today = day || getToday();
  const key = `${today}|${userKey}`;
  
  if (!usageStore.has(key)) {
    usageStore.set(key, { used: 0, attemptIds: new Set() });
  }
  
  return usageStore.get(key);
};

/**
 * Get current usage for a userKey
 * @param {string} userKey - User identifier
 * @returns {Object} - { used: number, limit: number, remaining: number, blocked: boolean }
 */
export const getUsage = (userKey) => {
  const entry = getOrInit(userKey);
  const used = entry.used;
  const remaining = Math.max(0, LIMIT - used);
  const blocked = used >= LIMIT;
  
  return {
    used,
    limit: LIMIT,
    remaining,
    blocked,
  };
};

/**
 * Record a successful STT attempt with idempotency
 * @param {string} userKey - User identifier
 * @param {string} attemptId - Unique attempt identifier (UUID)
 * @returns {Object} - { used: number, limit: number, remaining: number, blocked: boolean, wasNew: boolean }
 */
export const recordAttempt = (userKey, attemptId) => {
  const entry = getOrInit(userKey);
  
  // Check if this attemptId was already recorded (idempotency)
  const wasNew = !entry.attemptIds.has(attemptId);
  
  if (wasNew) {
    entry.attemptIds.add(attemptId);
    entry.used += 1;
  }
  
  const used = entry.used;
  const remaining = Math.max(0, LIMIT - used);
  const blocked = used >= LIMIT;
  
  return {
    used,
    limit: LIMIT,
    remaining,
    blocked,
    wasNew,
  };
};

/**
 * Check if user is blocked (has reached limit)
 * @param {string} userKey - User identifier
 * @returns {boolean} - true if blocked
 */
export const isBlocked = (userKey) => {
  const usage = getUsage(userKey);
  return usage.blocked;
};

