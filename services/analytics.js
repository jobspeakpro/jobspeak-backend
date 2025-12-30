// jobspeak-backend/services/analytics.js
import { recordAnalyticsEvent } from "./db.js";

/**
 * Track analytics event (non-blocking, never throws)
 * Events are logged to DB and can be swapped to external provider later
 * 
 * @param {string} eventName - Event name (e.g., 'practice_page_view', 'stt_success')
 * @param {Object} properties - Event properties (userKey, error_type, plan, etc.)
 * @param {string} userKey - Optional user identifier
 */
export function trackEvent(eventName, properties = {}, userKey = null) {
  // Never block the request if tracking fails
  try {
    // Resolve userKey from properties if not provided
    const resolvedUserKey = userKey || properties.userKey || properties.userId || null;

    // Record to database (non-blocking)
    recordAnalyticsEvent(eventName, properties, resolvedUserKey);
  } catch (error) {
    // Silently fail - analytics should never break UX
    console.warn(`[ANALYTICS] Failed to track event ${eventName}:`, error.message);
  }
}

/**
 * Helper to track STT events
 */
export function trackSTT(eventType, userKey, errorType = null) {
  trackEvent(`stt_${eventType}`, {
    userKey,
    error_type: errorType,
  }, userKey);
}

/**
 * Helper to track TTS events
 */
export function trackTTS(eventType, userKey, errorType = null) {
  trackEvent(`tts_${eventType}`, {
    userKey,
    error_type: errorType,
  }, userKey);
}

/**
 * Helper to track rewrite/improve events
 */
export function trackRewrite(eventType, userKey, errorType = null) {
  trackEvent(`rewrite_${eventType}`, {
    userKey,
    error_type: errorType,
  }, userKey);
}

/**
 * Helper to track billing events
 */
export function trackBilling(eventType, userKey, plan = null, errorType = null) {
  trackEvent(`checkout_${eventType}`, {
    userKey,
    plan,
    error_type: errorType,
  }, userKey);
}

/**
 * Helper to track upgrade clicks
 */
export function trackUpgrade(userKey, plan) {
  trackEvent("upgrade_click", {
    userKey,
    plan, // 'monthly' or 'annual'
  }, userKey);
}

/**
 * Helper to track limit hits
 */
export function trackLimitHit(userKey, limitType = "daily") {
  trackEvent("limit_hit", {
    userKey,
    limit_type: limitType,
  }, userKey);
}

