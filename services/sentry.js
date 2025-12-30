// jobspeak-backend/services/sentry.js
import * as Sentry from "@sentry/node";

// Profiling is optional - will be loaded dynamically if available
let nodeProfilingIntegration = null;

/**
 * Initialize Sentry for error monitoring
 * - Only initializes if SENTRY_DSN is set
 * - Scrubs sensitive data (Authorization headers, API keys)
 * - Configures sourcemaps for production
 */
export async function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || "development";
  const release = process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || undefined;

  if (!dsn) {
    console.log("⚠️  Sentry DSN not configured - error monitoring disabled");
    return null;
  }

  // Try to load profiling integration if available (optional dependency)
  try {
    const profilingModule = await import("@sentry/profiling-node");
    nodeProfilingIntegration = profilingModule.nodeProfilingIntegration;
  } catch (e) {
    // Profiling not available, that's okay - continue without it
  }

  try {
    const sentryConfig = {
      dsn,
      environment,
      release,
      
      // Performance monitoring
      tracesSampleRate: environment === "production" ? 0.1 : 1.0, // 10% in prod, 100% in dev

      // Source maps - Vercel integration handles uploads automatically
      // If not using Vercel integration, configure source maps manually:
      // https://docs.sentry.io/platforms/javascript/guides/nodejs/sourcemaps/

      // Profiling (optional, only if @sentry/profiling-node is installed)
      ...(nodeProfilingIntegration ? {
        profilesSampleRate: environment === "production" ? 0.1 : 1.0,
        integrations: [
          nodeProfilingIntegration(),
        ],
      } : {}),

      // Data scrubbing - never log secrets
      beforeSend(event, hint) {
        // Scrub Authorization headers
        if (event.request?.headers) {
          if (event.request.headers.Authorization) {
            event.request.headers.Authorization = "[REDACTED]";
          }
          if (event.request.headers["x-api-key"]) {
            event.request.headers["x-api-key"] = "[REDACTED]";
          }
        }

        // Scrub sensitive data from extra context
        if (event.extra) {
          // Remove any API keys that might have been logged
          Object.keys(event.extra).forEach(key => {
            if (typeof event.extra[key] === "string" && 
                (key.toLowerCase().includes("key") || 
                 key.toLowerCase().includes("secret") ||
                 key.toLowerCase().includes("token"))) {
              event.extra[key] = "[REDACTED]";
            }
          });
        }

        return event;
      },

      // Ignore certain errors (optional)
      ignoreErrors: [
        // Network errors that are expected
        "ECONNREFUSED",
        "ETIMEDOUT",
        "ENOTFOUND",
      ],
    };

    Sentry.init(sentryConfig);

    console.log("✅ Sentry initialized successfully");
    return Sentry;
  } catch (error) {
    console.error("❌ Failed to initialize Sentry:", error.message);
    return null;
  }
}

/**
 * Capture exception with context
 * @param {Error} error - The error to capture
 * @param {Object} context - Additional context (userKey, route, requestId, etc.)
 */
export function captureException(error, context = {}) {
  if (!process.env.SENTRY_DSN) {
    return; // Sentry not configured, skip
  }

  Sentry.withScope((scope) => {
    // Add user context
    if (context.userKey || context.userId) {
      scope.setUser({
        id: context.userKey || context.userId,
      });
    }

    // Add tags
    if (context.route) {
      scope.setTag("route", context.route);
    }
    if (context.requestId) {
      scope.setTag("requestId", context.requestId);
    }
    if (context.errorType) {
      scope.setTag("errorType", context.errorType);
    }

    // Add extra context (will be scrubbed by beforeSend)
    if (context.extra) {
      Object.keys(context.extra).forEach(key => {
        scope.setExtra(key, context.extra[key]);
      });
    }

    Sentry.captureException(error);
  });
}

/**
 * Capture message (non-error events)
 * @param {string} message - Message to log
 * @param {string} level - 'info', 'warning', 'error', etc.
 * @param {Object} context - Additional context
 */
export function captureMessage(message, level = "info", context = {}) {
  if (!process.env.SENTRY_DSN) {
    return; // Sentry not configured, skip
  }

  Sentry.withScope((scope) => {
    if (context.userKey || context.userId) {
      scope.setUser({
        id: context.userKey || context.userId,
      });
    }

    if (context.route) {
      scope.setTag("route", context.route);
    }

    if (context.extra) {
      Object.keys(context.extra).forEach(key => {
        scope.setExtra(key, context.extra[key]);
      });
    }

    Sentry.captureMessage(message, level);
  });
}

/**
 * Express request handler for Sentry
 * Must be added before other middleware
 * Safe fallback if Sentry.Handlers is undefined (Sentry v8+)
 */
export const sentryRequestHandler = 
  (process.env.SENTRY_DSN && Sentry.Handlers?.requestHandler)
    ? Sentry.Handlers.requestHandler()
    : (req, res, next) => next();

/**
 * Express error handler for Sentry
 * Must be added before errorHandler middleware
 * Safe fallback if Sentry.Handlers is undefined (Sentry v8+)
 */
export const sentryErrorHandler = 
  (process.env.SENTRY_DSN && Sentry.Handlers?.errorHandler)
    ? Sentry.Handlers.errorHandler({
        // Don't crash on Sentry errors
        shouldHandleError(error) {
          return true;
        },
      })
    : (err, req, res, next) => next(err);

export default Sentry;

