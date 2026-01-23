// jobspeak-backend/services/sttUsageStore.js
// Persistent usage tracking with Supabase/Postgres
// Replaces in-memory storage to ensure rate limiting works across deployments

import { getSupabase } from './supabase.js';

// Limits per type
const LIMITS = {
  practice: 3, // 3 practice answers per day
  stt: -1,     // Unlimited STT (informational tracking only)
};

/**
 * Get today's date as YYYY-MM-DD (UTC)
 */
const getToday = () => {
  return new Date().toISOString().slice(0, 10);
};

/**
 * Get current usage for a userKey
 * @param {string} userKey - User identifier
 * @param {string} type - Usage type ("practice" or "stt"), defaults to "practice"
 * @returns {Object} - { used: number, limit: number, remaining: number, blocked: boolean }
 */
export const getUsage = async (userKey, type = "practice") => {
  const supabase = getSupabase();
  const today = getToday();
  const limit = LIMITS[type] !== undefined ? LIMITS[type] : LIMITS.practice;

  try {
    // Query Supabase for today's usage
    const { data, error } = await supabase
      .from('practice_usage_daily')
      .select('used, attempt_ids')
      .eq('identity_key', userKey)
      .eq('date', today)
      .eq('type', type)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[USAGE] Error fetching usage:', error);
      throw error;
    }

    const used = data?.used || 0;
    const remaining = limit === -1 ? -1 : Math.max(0, limit - used);
    const blocked = limit === -1 ? false : used >= limit;

    return {
      used,
      limit,
      remaining,
      blocked,
    };
  } catch (error) {
    console.error('[USAGE] getUsage error:', error);
    // Return safe defaults on error
    return {
      used: 0,
      limit,
      remaining: limit === -1 ? -1 : limit,
      blocked: false,
    };
  }
};

/**
 * Record a successful attempt with idempotency
 * @param {string} userKey - User identifier
 * @param {string} attemptId - Unique attempt identifier (UUID)
 * @param {string} type - Usage type ("practice" or "stt"), defaults to "practice"
 * @returns {Object} - { used: number, limit: number, remaining: number, blocked: boolean, wasNew: boolean }
 */
export const recordAttempt = async (userKey, attemptId, type = "practice") => {
  const supabase = getSupabase();
  const today = getToday();
  const limit = LIMITS[type] !== undefined ? LIMITS[type] : LIMITS.practice;

  try {
    // First, try to get existing record
    const { data: existing, error: fetchError } = await supabase
      .from('practice_usage_daily')
      .select('used, attempt_ids')
      .eq('identity_key', userKey)
      .eq('date', today)
      .eq('type', type)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[USAGE] Error fetching existing record:', fetchError);
      throw fetchError;
    }

    let attemptIds = existing?.attempt_ids || [];
    const wasNew = !attemptIds.includes(attemptId);

    if (wasNew) {
      attemptIds.push(attemptId);
      const newUsed = (existing?.used || 0) + 1;

      // Upsert the record
      const { error: upsertError } = await supabase
        .from('practice_usage_daily')
        .upsert({
          identity_key: userKey,
          date: today,
          type,
          used: newUsed,
          attempt_ids: attemptIds,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'identity_key,date,type'
        });

      if (upsertError) {
        console.error('[USAGE] Error upserting record:', upsertError);
        throw upsertError;
      }

      const remaining = limit === -1 ? -1 : Math.max(0, limit - newUsed);
      const blocked = limit === -1 ? false : newUsed >= limit;

      console.log(`[USAGE] Recorded attempt for ${userKey}: ${newUsed}/${limit} (${type})`);

      return {
        used: newUsed,
        limit,
        remaining,
        blocked,
        wasNew: true,
      };
    } else {
      // Idempotent - attempt already recorded
      const used = existing?.used || 0;
      const remaining = limit === -1 ? -1 : Math.max(0, limit - used);
      const blocked = limit === -1 ? false : used >= limit;

      console.log(`[USAGE] Idempotent attempt for ${userKey}: ${used}/${limit} (${type})`);

      return {
        used,
        limit,
        remaining,
        blocked,
        wasNew: false,
      };
    }
  } catch (error) {
    console.error('[USAGE] recordAttempt error:', error);
    // Return safe defaults on error
    return {
      used: 0,
      limit,
      remaining: limit === -1 ? -1 : limit,
      blocked: false,
      wasNew: false,
    };
  }
};

/**
 * Check if user is blocked (has reached limit)
 * @param {string} userKey - User identifier
 * @param {string} type - Usage type ("practice" or "stt"), defaults to "practice"
 * @returns {boolean} - true if blocked
 */
export const isBlocked = async (userKey, type = "practice") => {
  const usage = await getUsage(userKey, type);
  return usage.blocked;
};
