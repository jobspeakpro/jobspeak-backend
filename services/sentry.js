// services/sentry.js — SAFE NO-OP FOR PROD
export function captureException(err, context = {}) {
  console.error("[SENTRY NOOP]", err, context);
}
export function captureMessage(msg, context = {}) {
  console.log("[SENTRY NOOP]", msg, context);
}
export function initSentry() {
  // no-op
}
export function sentryRequestHandler() {
  return (req, res, next) => next();
}
export function sentryErrorHandler() {
  return (err, req, res, next) => next(err);
}
