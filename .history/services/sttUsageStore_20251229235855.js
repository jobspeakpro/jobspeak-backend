// jobspeak-backend/services/sttUsageStore.js
// In-memory usage tracking with idempotency support
// Resets on deploy (acceptable for Railway)

// Limits per type
const LIMITS = {
  practice: 3, // 3 practice answers per day
  stt: -1,     // Unlimited STT (informational tracking only)
};

// Map structure: key = `${day}|${userKey}|${type}`, value = { used: number, attemptIds: Set<string> }
const usageStore = new Map();

/**
 * Get today's date as YYYY-MM-DD (UTC)
 */
const getToday = () => {
  return new Date().toISOString().slice(0, 10);
};

/**
 * Get or initialize usage entry for a userKey on a given day and type
 * @param {string} userKey - User identifier
 * @param {string} type - Usage type ("practice" or "stt")
 * @param {string} day - Date string (YYYY-MM-DD), defaults to today
 * @returns {Object} - { used: number, attemptIds: Set<string> }
 */
const getOrInit = (userKey, type = "practice", day = null) => {
  const today = day || getToday();
  const key = `${today}|${userKey}|${type}`;

  if (!usageStore.has(key)) {
    usageStore.set(key, { used: 0, attemptIds: new Set() });

    // Only log new user initialization for practice to reduce noise
    if (type === "practice") {
      console.log(`[USAGE INIT] New user: ${userKey}, type: ${type}, date: ${today}, starting at 0/${LIMITS[type]}`);
    }
  }

  return usageStore.get(key);
};

/**
 * Get current usage for a userKey
 * @param {string} userKey - User identifier
 * @param {string} type - Usage type ("practice" or "stt"), defaults to "practice"
 * @returns {Object} - { used: number, limit: number, remaining: number, blocked: boolean }
 */
export const getUsage = (userKey, type = "practice") => {
  const entry = getOrInit(userKey, type);
  const limit = LIMITS[type] !== undefined ? LIMITS[type] : LIMITS.practice;

  const used = entry.used;
  // If limit is -1 (unlimited), remaining is also -1
  const remaining = limit === -1 ? -1 : Math.max(0, limit - used);
  // If limit is -1, never blocked
  const blocked = limit === -1 ? false : used >= limit;

  return {
    used,
    limit,
    remaining,
    blocked,
  };
};

/**
 * Record a successful attempt with idempotency
 * @param {string} userKey - User identifier
 * @param {string} attemptId - Unique attempt identifier (UUID)
 * @param {string} type - Usage type ("practice" or "stt"), defaults to "practice"
 * @returns {Object} - { used: number, limit: number, remaining: number, blocked: boolean, wasNew: boolean }
 */
export const recordAttempt = (userKey, attemptId, type = "practice") => {
  const entry = getOrInit(userKey, type);

  // Check if this attemptId was already recorded (idempotency)
  const wasNew = !entry.attemptIds.has(attemptId);

  if (wasNew) {
    entry.attemptIds.add(attemptId);
    entry.used += 1;
  }

  const limit = LIMITS[type] !== undefined ? LIMITS[type] : LIMITS.practice;
  const used = entry.used;
  const remaining = limit === -1 ? -1 : Math.max(0, limit - used);
  const blocked = limit === -1 ? false : used >= limit;

  return {
    used,
    limit,
    remaining,
    blocked,
    wasNew,
  };
};

/**
 * Check if user is blocked (has reached limit)
 * @param {string} userKey - User identifier
 * @param {string} type - Usage type ("practice" or "stt"), defaults to "practice"
 * @returns {boolean} - true if blocked
 */
export const isBlocked = (userKey, type = "practice") => {
  const usage = getUsage(userKey, type);
  return usage.blocked;
};

