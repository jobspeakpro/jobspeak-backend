// jobspeak-backend/services/db.js
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { getTodayUTC } from "./dateUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use stable writable path for Railway compatibility
// Create data directory if it doesn't exist, with fallback to process.cwd()
let dataDir = path.join(process.cwd(), "data");
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log("Created data directory:", dataDir);
  }
  // Verify directory is writable
  fs.accessSync(dataDir, fs.constants.W_OK);
} catch (error) {
  console.warn("Failed to create/access data directory, using process.cwd() as fallback:", error.message);
  // Fallback to process.cwd() if data directory creation/access fails
  dataDir = process.cwd();
}

const dbPath = path.join(dataDir, "sessions.db");

// Initialize database with error handling
let db;
try {
  db = new Database(dbPath);
  console.log("Database initialized at:", dbPath);
} catch (error) {
  console.error("Failed to initialize database:", error.message);
  console.error("Database path:", dbPath);
  // Re-throw to prevent app from starting with broken database
  throw new Error(`Database initialization failed: ${error.message}`);
}

// Create sessions table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userKey TEXT NOT NULL,
    transcript TEXT NOT NULL,
    aiResponse TEXT NOT NULL,
    score INTEGER,
    createdAt TEXT NOT NULL,
    idempotencyKey TEXT UNIQUE
  );
  
  CREATE INDEX IF NOT EXISTS idx_userKey_createdAt ON sessions(userKey, createdAt DESC);
  CREATE INDEX IF NOT EXISTS idx_idempotencyKey ON sessions(idempotencyKey);

  CREATE TABLE IF NOT EXISTS subscriptions (
    userKey TEXT PRIMARY KEY,
    isPro INTEGER NOT NULL DEFAULT 0,
    stripeCustomerId TEXT,
    stripeSubscriptionId TEXT,
    status TEXT,
    currentPeriodEnd TEXT
  );

  CREATE TABLE IF NOT EXISTS webhook_events (
    eventId TEXT PRIMARY KEY,
    eventType TEXT NOT NULL,
    processedAt TEXT NOT NULL,
    subscriptionId TEXT,
    userKey TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_webhook_eventId ON webhook_events(eventId);
  CREATE INDEX IF NOT EXISTS idx_webhook_subscriptionId ON webhook_events(subscriptionId);

  CREATE TABLE IF NOT EXISTS tts_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userKey TEXT NOT NULL,
    date TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(userKey, date)
  );

  CREATE INDEX IF NOT EXISTS idx_tts_userKey_date ON tts_usage(userKey, date);
`);

export const saveSession = (userKey, transcript, aiResponse, score = null, idempotencyKey = null) => {
  const stmt = db.prepare(`
    INSERT INTO sessions (userKey, transcript, aiResponse, score, createdAt, idempotencyKey)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  // Ensure createdAt is always ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
  const createdAt = new Date().toISOString();
  
  try {
    const result = stmt.run(userKey, transcript, aiResponse, score, createdAt, idempotencyKey);
    
    // Return session with all required fields: userKey, transcript, aiResponse, score, createdAt (ISO)
    return {
      id: result.lastInsertRowid,
      userKey,
      transcript,
      aiResponse,
      score,
      createdAt, // ISO format
      idempotencyKey,
    };
  } catch (error) {
    // If idempotency key conflict, return existing session only if userKey matches
    if (idempotencyKey && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const existing = db.prepare(`
        SELECT id, userKey, transcript, aiResponse, score, createdAt, idempotencyKey
        FROM sessions
        WHERE idempotencyKey = ? AND userKey = ?
      `).get(idempotencyKey, userKey);
      
      if (existing) {
        // Ensure createdAt is ISO format in returned session
        return {
          ...existing,
          createdAt: existing.createdAt, // Already stored as ISO, but ensure consistency
        };
      }
      // If idempotency key exists but userKey doesn't match, throw error (security: prevent session leakage)
      throw new Error("Idempotency key conflict with different userKey");
    }
    throw error;
  }
};

/**
 * Save session with idempotency check
 * Returns existing session if idempotencyKey already exists, otherwise creates new
 */
export const saveSessionWithIdempotency = (userKey, transcript, aiResponse, score = null, idempotencyKey) => {
  if (!idempotencyKey) {
    // No idempotency key provided, save normally
    return saveSession(userKey, transcript, aiResponse, score);
  }
  
  // Check if session with this idempotency key already exists for this userKey
  // CRITICAL: Always verify userKey to prevent session leakage
  const existing = db.prepare(`
    SELECT id, userKey, transcript, aiResponse, score, createdAt, idempotencyKey
    FROM sessions
    WHERE idempotencyKey = ? AND userKey = ?
  `).get(idempotencyKey, userKey);
  
  if (existing) {
    return existing; // Return existing session (idempotent) - only if userKey matches
  }
  
  // Save new session with idempotency key
  return saveSession(userKey, transcript, aiResponse, score, idempotencyKey);
};

export const getSessions = (userKey, limit = 10) => {
  const stmt = db.prepare(`
    SELECT id, userKey, transcript, aiResponse, score, createdAt
    FROM sessions
    WHERE userKey = ?
    ORDER BY createdAt DESC
    LIMIT ?
  `);
  
  // Returns sessions ordered by newest first (createdAt DESC)
  // createdAt is stored as ISO format TEXT in SQLite
  return stmt.all(userKey, limit);
};

export const getSessionById = (id, userKey) => {
  const stmt = db.prepare(`
    SELECT id, userKey, transcript, aiResponse, score, createdAt
    FROM sessions
    WHERE id = ? AND userKey = ?
  `);
  
  // Validates userKey - only returns session if both id and userKey match
  // createdAt is stored as ISO format TEXT in SQLite
  return stmt.get(id, userKey);
};

/**
 * Check if a session exists by ID (without userKey filter)
 * Used to distinguish between "not found" (404) and "userKey mismatch" (403)
 */
export const sessionExistsById = (id) => {
  const stmt = db.prepare(`
    SELECT id FROM sessions WHERE id = ?
  `);
  return !!stmt.get(id);
};

// Subscription functions
export const getSubscription = (userKey) => {
  const stmt = db.prepare(`
    SELECT userKey, isPro, stripeCustomerId, stripeSubscriptionId, status, currentPeriodEnd
    FROM subscriptions
    WHERE userKey = ?
  `);
  
  const row = stmt.get(userKey);
  if (!row) return null;
  
  return {
    userKey: row.userKey,
    isPro: Boolean(row.isPro),
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    status: row.status,
    currentPeriodEnd: row.currentPeriodEnd,
  };
};

export const upsertSubscription = (userKey, subscriptionData) => {
  const stmt = db.prepare(`
    INSERT INTO subscriptions (userKey, isPro, stripeCustomerId, stripeSubscriptionId, status, currentPeriodEnd)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(userKey) DO UPDATE SET
      isPro = excluded.isPro,
      stripeCustomerId = excluded.stripeCustomerId,
      stripeSubscriptionId = excluded.stripeSubscriptionId,
      status = excluded.status,
      currentPeriodEnd = excluded.currentPeriodEnd
  `);
  
  stmt.run(
    userKey,
    subscriptionData.isPro ? 1 : 0,
    subscriptionData.stripeCustomerId || null,
    subscriptionData.stripeSubscriptionId || null,
    subscriptionData.status || null,
    subscriptionData.currentPeriodEnd || null
  );
};

export const updateSubscriptionStatus = (stripeSubscriptionId, status, currentPeriodEnd) => {
  const stmt = db.prepare(`
    UPDATE subscriptions
    SET status = ?, currentPeriodEnd = ?, isPro = ?
    WHERE stripeSubscriptionId = ?
  `);
  
  // isPro is true only if status is active/trialing AND period hasn't ended
  let isPro = status === "active" || status === "trialing";
  if (currentPeriodEnd) {
    const periodEnd = new Date(currentPeriodEnd);
    const now = new Date();
    if (periodEnd < now) {
      isPro = false; // Expired subscriptions are not Pro
    }
  }
  
  stmt.run(status, currentPeriodEnd, isPro ? 1 : 0, stripeSubscriptionId);
};

export const getSubscriptionByStripeId = (stripeSubscriptionId) => {
  const stmt = db.prepare(`
    SELECT userKey, isPro, stripeCustomerId, stripeSubscriptionId, status, currentPeriodEnd
    FROM subscriptions
    WHERE stripeSubscriptionId = ?
  `);
  
  const row = stmt.get(stripeSubscriptionId);
  if (!row) return null;
  
  return {
    userKey: row.userKey,
    isPro: Boolean(row.isPro),
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    status: row.status,
    currentPeriodEnd: row.currentPeriodEnd,
  };
};

// Usage tracking functions
export const getTodaySessionCount = (userKey) => {
  // Get today's date in UTC (YYYY-MM-DD) - resets at midnight UTC
  const todayUTC = getTodayUTC();
  
  // Query sessions where the date part (YYYY-MM-DD) of createdAt matches today
  // createdAt is stored as ISO UTC string, so we extract the date part for comparison
  // This ensures consistent daily reset at midnight UTC regardless of server timezone
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM sessions
    WHERE userKey = ? AND substr(createdAt, 1, 10) = ?
  `);
  
  const row = stmt.get(userKey, todayUTC);
  return row ? row.count : 0;
};

// Webhook event tracking for idempotency
export const isWebhookEventProcessed = (eventId) => {
  const stmt = db.prepare(`
    SELECT eventId FROM webhook_events WHERE eventId = ?
  `);
  const row = stmt.get(eventId);
  return !!row;
};

export const recordWebhookEvent = (eventId, eventType, subscriptionId = null, userKey = null) => {
  // Idempotent insert: if eventId already exists, ignore (prevents duplicate processing)
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO webhook_events (eventId, eventType, processedAt, subscriptionId, userKey)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const processedAt = new Date().toISOString();
  stmt.run(eventId, eventType, processedAt, subscriptionId, userKey);
};

// TTS usage tracking functions
export const getTodayTTSCount = (userKey) => {
  // Get today's date in UTC (YYYY-MM-DD) - resets at midnight UTC
  const todayUTC = getTodayUTC();
  
  // Query TTS usage for today
  const stmt = db.prepare(`
    SELECT count FROM tts_usage
    WHERE userKey = ? AND date = ?
  `);
  
  const row = stmt.get(userKey, todayUTC);
  return row ? row.count : 0;
};

export const incrementTodayTTSCount = (userKey) => {
  // Get today's date in UTC (YYYY-MM-DD)
  const todayUTC = getTodayUTC();
  
  // Insert or update: increment count for today
  const stmt = db.prepare(`
    INSERT INTO tts_usage (userKey, date, count)
    VALUES (?, ?, 1)
    ON CONFLICT(userKey, date) DO UPDATE SET
      count = count + 1
  `);
  
  stmt.run(userKey, todayUTC);
  
  // Return the new count
  return getTodayTTSCount(userKey);
};

export default db;

