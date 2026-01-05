// jobspeak-backend/services/db.js
// IN-MEMORY STORAGE (no better-sqlite3 dependency)
// This replaces SQLite with in-memory Maps to enable Railway deployments
// Trade-off: Data resets on restart, but deployments work reliably

import crypto from "crypto";
import { getTodayUTC } from "./dateUtils.js";

console.log("[DB] Using in-memory storage (no SQLite dependency)");

// In-memory storage
const sessions = new Map(); // key: id, value: session object
const subscriptions = new Map(); // key: userKey, value: subscription object
const webhookEvents = new Set(); // set of eventIds
const ttsUsage = new Map(); // key: `${userKey}:${date}`, value: count
const sttUsage = new Map(); // key: `${userKey}:${date}`, value: count
const analyticsEvents = []; // array of event objects
const questionHistory = new Map(); // key: userKey, value: array of {questionId, seenAt}
const mockInterviews = new Map(); // key: id, value: interview object
const mockInterviewAttempts = new Map(); // key: userKey, value: {used, used_at}
const idempotencyKeys = new Map(); // key: idempotencyKey, value: sessionId

let sessionIdCounter = 1;

export const saveSession = (userKey, transcript, aiResponse, score = null, idempotencyKey = null) => {
  const createdAt = new Date().toISOString();

  // Check idempotency
  if (idempotencyKey) {
    const existingId = idempotencyKeys.get(idempotencyKey);
    if (existingId) {
      const existing = sessions.get(existingId);
      if (existing && existing.userKey === userKey) {
        return existing; // Return existing session
      }
      throw new Error("Idempotency key conflict with different userKey");
    }
  }

  const id = sessionIdCounter++;
  const session = {
    id,
    userKey,
    transcript,
    aiResponse,
    score,
    createdAt,
    idempotencyKey,
  };

  sessions.set(id, session);
  if (idempotencyKey) {
    idempotencyKeys.set(idempotencyKey, id);
  }

  return session;
};

export const saveSessionWithIdempotency = (userKey, transcript, aiResponse, score = null, idempotencyKey) => {
  if (!idempotencyKey) {
    return saveSession(userKey, transcript, aiResponse, score);
  }

  const existingId = idempotencyKeys.get(idempotencyKey);
  if (existingId) {
    const existing = sessions.get(existingId);
    if (existing && existing.userKey === userKey) {
      return existing;
    }
  }

  return saveSession(userKey, transcript, aiResponse, score, idempotencyKey);
};

export const getSessions = (userKey, limit = 10) => {
  const userSessions = Array.from(sessions.values())
    .filter(s => s.userKey === userKey)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);

  return userSessions;
};

export const getSessionById = (id, userKey) => {
  const session = sessions.get(id);
  if (session && session.userKey === userKey) {
    return session;
  }
  return null;
};

export const sessionExistsById = (id) => {
  return sessions.has(id);
};

// Subscription functions
export const getSubscription = (userKey) => {
  return subscriptions.get(userKey) || null;
};

export const upsertSubscription = (userKey, subscriptionData) => {
  const existing = subscriptions.get(userKey) || {};
  subscriptions.set(userKey, {
    userKey,
    isPro: subscriptionData.isPro || false,
    stripeCustomerId: subscriptionData.stripeCustomerId || existing.stripeCustomerId || null,
    stripeSubscriptionId: subscriptionData.stripeSubscriptionId || existing.stripeSubscriptionId || null,
    status: subscriptionData.status || existing.status || null,
    currentPeriodEnd: subscriptionData.currentPeriodEnd || existing.currentPeriodEnd || null,
  });
};

export const updateSubscriptionStatus = (stripeSubscriptionId, status, currentPeriodEnd) => {
  // Find subscription by stripeSubscriptionId
  for (const [userKey, sub] of subscriptions.entries()) {
    if (sub.stripeSubscriptionId === stripeSubscriptionId) {
      let isPro = status === "active" || status === "trialing";
      if (currentPeriodEnd) {
        const periodEnd = new Date(currentPeriodEnd);
        const now = new Date();
        if (periodEnd < now) {
          isPro = false;
        }
      }

      subscriptions.set(userKey, {
        ...sub,
        status,
        currentPeriodEnd,
        isPro,
      });
      return;
    }
  }
};

export const getSubscriptionByStripeId = (stripeSubscriptionId) => {
  for (const sub of subscriptions.values()) {
    if (sub.stripeSubscriptionId === stripeSubscriptionId) {
      return sub;
    }
  }
  return null;
};

// Usage tracking functions
export const getTodaySessionCount = (userKey) => {
  const todayUTC = getTodayUTC();

  const count = Array.from(sessions.values())
    .filter(s => s.userKey === userKey && s.createdAt.substring(0, 10) === todayUTC)
    .length;

  return count;
};

// Webhook event tracking
export const isWebhookEventProcessed = (eventId) => {
  return webhookEvents.has(eventId);
};

export const recordWebhookEvent = (eventId, eventType, subscriptionId = null, userKey = null) => {
  webhookEvents.add(eventId);
};

// TTS usage tracking
export const getTodayTTSCount = (userKey) => {
  const todayUTC = getTodayUTC();
  const key = `${userKey}:${todayUTC}`;
  return ttsUsage.get(key) || 0;
};

export const incrementTodayTTSCount = (userKey) => {
  const todayUTC = getTodayUTC();
  const key = `${userKey}:${todayUTC}`;
  const current = ttsUsage.get(key) || 0;
  ttsUsage.set(key, current + 1);
  return current + 1;
};

// STT usage tracking
export const getTodaySTTCount = (userKey) => {
  const todayUTC = getTodayUTC();
  const key = `${userKey}:${todayUTC}`;
  return sttUsage.get(key) || 0;
};

export const incrementTodaySTTCount = (userKey) => {
  const todayUTC = getTodayUTC();
  const key = `${userKey}:${todayUTC}`;
  const current = sttUsage.get(key) || 0;
  sttUsage.set(key, current + 1);
  return current + 1;
};

// Analytics event tracking
export const recordAnalyticsEvent = (eventName, properties = {}, userKey = null) => {
  analyticsEvents.push({
    eventName,
    userKey: userKey || null,
    properties,
    createdAt: new Date().toISOString(),
  });
};

// Question History functions
export const recordQuestionSeen = (userKey, questionId) => {
  const history = questionHistory.get(userKey) || [];
  history.push({
    questionId,
    seenAt: new Date().toISOString(),
  });
  questionHistory.set(userKey, history);
};

export const getRecentQuestionIds = (userKey, limit = 20) => {
  const history = questionHistory.get(userKey) || [];
  return history
    .sort((a, b) => new Date(b.seenAt) - new Date(a.seenAt))
    .slice(0, limit)
    .map(h => h.questionId);
};

// Mock Interview functions
export const getMockInterviewAttempt = (userKey) => {
  return mockInterviewAttempts.get(userKey) || { used: 0, used_at: null };
};

export const markMockInterviewUsed = (userKey) => {
  const usedAt = new Date().toISOString();
  const attempt = { used: 1, used_at: usedAt };
  mockInterviewAttempts.set(userKey, attempt);
  return attempt;
};

export const saveMockInterview = (userKey, interviewType, overallScore) => {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const hiringRecommendation = calculateHiringRecommendation(overallScore);

  const interview = {
    id,
    user_key: userKey,
    interview_type: interviewType,
    overall_score: overallScore,
    hiring_recommendation: hiringRecommendation,
    created_at: createdAt,
  };

  mockInterviews.set(id, interview);
  return interview;
};

export const getMockInterviewCount = (userKey) => {
  return Array.from(mockInterviews.values())
    .filter(i => i.user_key === userKey)
    .length;
};

export const getLastMockInterview = (userKey) => {
  const interviews = Array.from(mockInterviews.values())
    .filter(i => i.user_key === userKey)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return interviews[0] || null;
};

export const calculateHiringRecommendation = (score) => {
  if (score >= 80) return 'strong_recommend';
  if (score >= 60) return 'recommend_with_reservations';
  return 'not_recommended_yet';
};

// Export a dummy default for compatibility
export default {
  close: () => console.log("[DB] In-memory storage (no close needed)"),
};
