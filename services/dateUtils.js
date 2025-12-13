// jobspeak-backend/services/dateUtils.js
/**
 * Date utility functions for consistent daily limit calculations
 * All dates use UTC timezone for consistency across servers
 */

/**
 * Get the current UTC date as YYYY-MM-DD string
 * This represents "today" for daily limit calculations
 * Resets at midnight UTC
 */
export const getTodayUTC = () => {
  const now = new Date();
  return now.toISOString().split("T")[0]; // YYYY-MM-DD
};

/**
 * Check if two ISO UTC timestamps are on the same day (UTC)
 * @param {string} isoTimestamp1 - ISO timestamp string (e.g., "2024-01-15T10:30:00.000Z")
 * @param {string} isoTimestamp2 - ISO timestamp string (e.g., "2024-01-15T23:45:00.000Z")
 * @returns {boolean} - true if both timestamps are on the same UTC day
 */
export const isSameDay = (isoTimestamp1, isoTimestamp2) => {
  if (!isoTimestamp1 || !isoTimestamp2) {
    return false;
  }
  
  // Extract YYYY-MM-DD from ISO timestamps (UTC)
  const date1 = isoTimestamp1.split("T")[0];
  const date2 = isoTimestamp2.split("T")[0];
  
  return date1 === date2;
};

/**
 * Check if an ISO UTC timestamp is from today (UTC)
 * @param {string} isoTimestamp - ISO timestamp string
 * @returns {boolean} - true if timestamp is from today (UTC)
 */
export const isToday = (isoTimestamp) => {
  if (!isoTimestamp) {
    return false;
  }
  
  const today = getTodayUTC();
  const timestampDate = isoTimestamp.split("T")[0];
  
  return today === timestampDate;
};

