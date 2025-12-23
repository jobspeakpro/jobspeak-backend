// jobspeak-backend/routes/billing.js
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import { resolveUserKey } from "../middleware/resolveUserKey.js";
import { getSubscription, upsertSubscription, updateSubscriptionStatus, getSubscriptionByStripeId, isWebhookEventProcessed, recordWebhookEvent, getTodaySessionCount } from "../services/db.js";

dotenv.config();

const router = express.Router();

// Initialize Stripe - env var required, no fallback
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY is required in environment variables");
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Free tier daily limit for "Fix my answer" feature
const FREE_DAILY_LIMIT = 3;

// POST /api/billing/create-checkout-session
router.post("/billing/create-checkout-session", async (req, res) => {
  try {
    // Resolve userKey from multiple sources (header, body, query, form-data) - optional
    const userKey = resolveUserKey(req);

    // Accept input from JSON body OR query OR form-data
    // Try to get plan/priceType/priceId/interval from multiple sources
    const plan = req.body?.plan || req.query?.plan || req.body?.fields?.plan;
    const priceType = req.body?.priceType || req.query?.priceType || req.body?.fields?.priceType;
    const priceId = req.body?.priceId || req.query?.priceId || req.body?.fields?.priceId;
    const interval = req.body?.interval || req.query?.interval || req.body?.fields?.interval;

    // Debug logging BEFORE validation (to help diagnose 400 errors)
    console.log("[CHECKOUT DEBUG] Request details:", {
      contentType: req.headers["content-type"],
      body: req.body,
      query: req.query,
      bodyFields: req.body?.fields || null,
      resolvedUserKey: userKey || null,
      plan,
      priceType,
      priceId,
      interval,
    });

    // Determine the billing interval/plan from various input formats
    // Accept: plan, priceType, interval, or priceId (if priceId is provided, we'll use it directly)
    let billingInterval = null;
    
    if (priceId) {
      // If priceId is provided directly, we'll use it - no need to determine interval
      // But we still need to validate it exists
    } else if (plan === "annual" || priceType === "annual" || interval === "year" || interval === "annual") {
      billingInterval = "annual";
    } else if (plan === "monthly" || priceType === "monthly" || interval === "month" || interval === "monthly") {
      billingInterval = "monthly";
    }

    // Validate required fields - require ONLY the minimum needed to create checkout
    // Need either: priceId OR (plan/priceType/interval that maps to monthly/annual)
    if (!priceId && !billingInterval) {
      // Enhanced debug logging on 400 error
      const debugInfo = {
        contentType: req.headers["content-type"] || "not set",
        receivedFields: {
          body: Object.keys(req.body || {}),
          query: Object.keys(req.query || {}),
          bodyFields: req.body?.fields ? Object.keys(req.body.fields) : null,
          headers: {
            "x-user-key": req.header("x-user-key") ? "present" : "missing",
          },
        },
        resolvedValues: {
          plan,
          priceType,
          priceId,
          interval,
          userKey: userKey || null,
        },
      };
      console.error("[CHECKOUT ERROR] Missing required field: need plan, priceType, interval, or priceId", debugInfo);
      return res.status(400).json({ 
        error: "Missing plan, priceType, interval, or priceId",
        debug: debugInfo,
      });
    }

    // Validate all required environment variables upfront - return 400 with clear messages
    const missingVars = [];
    
    if (!process.env.STRIPE_SECRET_KEY) {
      missingVars.push("STRIPE_SECRET_KEY");
    }
    
    if (!process.env.STRIPE_PRICE_ID_MONTHLY) {
      missingVars.push("STRIPE_PRICE_ID_MONTHLY");
    }
    
    if (!process.env.STRIPE_PRICE_ID_ANNUAL) {
      missingVars.push("STRIPE_PRICE_ID_ANNUAL");
    }
    
    if (!process.env.FRONTEND_URL) {
      missingVars.push("FRONTEND_URL");
    }
    
    if (missingVars.length > 0) {
      console.error("❌ Missing required environment variables:", missingVars.join(", "));
      return res.status(400).json({ 
        error: "Missing required environment variables",
        missing: missingVars,
        message: `The following environment variables are required but not set: ${missingVars.join(", ")}`
      });
    }

    // Verify Stripe is initialized (should be true if STRIPE_SECRET_KEY is set)
    if (!stripe) {
      console.error("❌ Stripe not initialized despite STRIPE_SECRET_KEY being set");
      return res.status(500).json({ error: "Stripe initialization failed" });
    }

    const MONTHLY_PRICE_ID = process.env.STRIPE_PRICE_ID_MONTHLY;
    const ANNUAL_PRICE_ID = process.env.STRIPE_PRICE_ID_ANNUAL;
    const FRONTEND_URL = process.env.FRONTEND_URL;

    // Determine the actual priceId to use
    let finalPriceId;
    if (priceId) {
      // Use provided priceId directly
      finalPriceId = priceId;
    } else {
      // Map billing interval to priceId
      finalPriceId = billingInterval === "annual" ? ANNUAL_PRICE_ID : MONTHLY_PRICE_ID;
    }

    // Get or create Stripe customer (only if userKey is provided)
    let customerId = null;
    const sessionMetadata = {};
    
    if (userKey && userKey.trim().length > 0) {
      const trimmedUserKey = userKey.trim();
      sessionMetadata.userKey = trimmedUserKey;
      
      const existingSub = getSubscription(trimmedUserKey);
      if (existingSub?.stripeCustomerId) {
        customerId = existingSub.stripeCustomerId;
      } else {
        const customer = await stripe.customers.create({
          metadata: { userKey: trimmedUserKey },
        });
        customerId = customer.id;
        
        // Save customer ID
        upsertSubscription(trimmedUserKey, {
          isPro: false,
          stripeCustomerId: customerId,
        });
      }
    }

    // Build success and cancel URLs using FRONTEND_URL
    const successUrl = `${FRONTEND_URL}?success=true`;
    const cancelUrl = `${FRONTEND_URL}?canceled=true`;

    // Build session creation options
    const sessionOptions = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    // Only add customer if we have one
    if (customerId) {
      sessionOptions.customer = customerId;
    }

    // Only add metadata if we have userKey
    if (Object.keys(sessionMetadata).length > 0) {
      sessionOptions.metadata = sessionMetadata;
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);

    console.log("✅ Stripe checkout session created:", session.id, userKey ? `for userKey: ${userKey.trim()}` : "without userKey");
    
    // Always return { url } on success
    return res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe checkout session error:", err?.message || err);
    res.status(500).json({
      error: err?.message || "Failed to create checkout session",
    });
  }
});

// GET /api/billing/status?userKey=
router.get("/billing/status", async (req, res) => {
  try {
    // Resolve userKey from multiple sources (header, body, query, form-data)
    const userKey = resolveUserKey(req);

    // Validate userKey - return 400 on missing field
    if (!userKey) {
      return res.status(400).json({ error: "Missing userKey" });
    }

    // Get subscription from database (keyed by userKey) - reads latest data
    const subscription = getSubscription(userKey.trim());

    if (!subscription) {
      // No subscription - free user, calculate usage
      const used = getTodaySessionCount(userKey.trim());
      const remaining = Math.max(0, FREE_DAILY_LIMIT - used);
      return res.json({ 
        isPro: false, 
        status: null, 
        currentPeriodEnd: null,
        usage: {
          used,
          limit: FREE_DAILY_LIMIT,
          remaining,
        },
      });
    }

    // If we have a Stripe subscription ID, optionally verify with Stripe for accuracy
    // This ensures we return the most up-to-date status immediately after webhook
    // Ensure stable schema: all values explicitly set (never undefined)
    let finalStatus = subscription.status || null;
    let finalIsPro = Boolean(subscription.isPro);
    let finalPeriodEnd = subscription.currentPeriodEnd || null;

    if (subscription.stripeSubscriptionId && stripe) {
      try {
        // Retrieve fresh subscription data from Stripe (source of truth)
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
        
        // Update our local state if Stripe has different data (handles race conditions)
        if (stripeSubscription.status !== subscription.status) {
          const isActive = stripeSubscription.status === "active" || stripeSubscription.status === "trialing";
          const currentPeriodEnd = stripeSubscription.current_period_end 
            ? new Date(stripeSubscription.current_period_end * 1000).toISOString() 
            : null;
          
          // Sync database with Stripe truth
          upsertSubscription(userKey.trim(), {
            isPro: isActive,
            stripeCustomerId: stripeSubscription.customer,
            stripeSubscriptionId: stripeSubscription.id,
            status: stripeSubscription.status,
            currentPeriodEnd: currentPeriodEnd,
          });
          
          finalStatus = stripeSubscription.status;
          finalIsPro = isActive;
          finalPeriodEnd = currentPeriodEnd;
        } else {
          // Status matches, but verify period end and isPro calculation
          const currentPeriodEnd = stripeSubscription.current_period_end 
            ? new Date(stripeSubscription.current_period_end * 1000).toISOString() 
            : null;
          
          const isActive = stripeSubscription.status === "active" || stripeSubscription.status === "trialing";
          let calculatedIsPro = isActive;
          
          // Check if period has ended
          if (currentPeriodEnd) {
            const periodEnd = new Date(currentPeriodEnd);
            const now = new Date();
            if (periodEnd < now) {
              calculatedIsPro = false;
            }
          }
          
          // Update if calculation differs
          if (calculatedIsPro !== subscription.isPro || currentPeriodEnd !== subscription.currentPeriodEnd) {
            upsertSubscription(userKey.trim(), {
              isPro: calculatedIsPro,
              stripeCustomerId: stripeSubscription.customer,
              stripeSubscriptionId: stripeSubscription.id,
              status: stripeSubscription.status,
              currentPeriodEnd: currentPeriodEnd,
            });
            finalIsPro = calculatedIsPro;
            finalPeriodEnd = currentPeriodEnd;
          }
        }
      } catch (stripeErr) {
        // If Stripe API call fails, fall back to database values
        console.warn(`[BILLING STATUS] Failed to verify with Stripe for ${userKey}:`, stripeErr.message);
      }
    }

    // Final validation: ensure isPro matches status and period end
    if (finalPeriodEnd) {
      const periodEnd = new Date(finalPeriodEnd);
      const now = new Date();
      if (periodEnd < now) {
        finalIsPro = false;
        if (finalStatus !== "expired" && finalStatus !== "canceled") {
          finalStatus = "expired";
        }
      }
    }
    
    // Ensure isPro matches status truth (only active/trialing = true)
    if (finalStatus !== "active" && finalStatus !== "trialing") {
      finalIsPro = false;
    }

    // Calculate usage information for free users
    let usageInfo = null;
    if (!finalIsPro) {
      const used = getTodaySessionCount(userKey.trim());
      const remaining = Math.max(0, FREE_DAILY_LIMIT - used);
      usageInfo = {
        used,
        limit: FREE_DAILY_LIMIT,
        remaining,
      };
    } else {
      // Pro users have unlimited access
      usageInfo = {
        used: 0,
        limit: -1, // -1 means unlimited
        remaining: -1,
      };
    }

    // Return subscription status with usage information
    // Schema: { isPro: boolean, status: string|null, currentPeriodEnd: string|null, usage: { used, limit, remaining } }
    return res.json({
      isPro: Boolean(finalIsPro),
      status: finalStatus || null,
      currentPeriodEnd: finalPeriodEnd || null,
      usage: usageInfo,
    });
  } catch (err) {
    console.error("❌ Billing status error:", err?.message || err);
    // Return stable schema even on error
    res.status(500).json({ 
      isPro: false, 
      status: null, 
      currentPeriodEnd: null,
      usage: {
        used: 0,
        limit: FREE_DAILY_LIMIT,
        remaining: FREE_DAILY_LIMIT,
      },
    });
  }
});

// POST /api/billing/webhook (signature verified)
router.post("/billing/webhook", async (req, res) => {
  const timestamp = new Date().toISOString();
  const sig = req.headers["stripe-signature"];

  // Log webhook receipt
  console.log(`[WEBHOOK RECEIPT] ${timestamp} - Received webhook request`);
  console.log(`[WEBHOOK RECEIPT] Signature present: ${!!sig}`);

  // Validate webhook secret env var - no fallback
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error(`[WEBHOOK ERROR] ${timestamp} - Missing STRIPE_WEBHOOK_SECRET`);
    return res.status(400).send("Webhook secret not configured");
  }

  if (!stripe) {
    console.error(`[WEBHOOK ERROR] ${timestamp} - Stripe not initialized`);
    return res.status(500).send("Stripe not initialized");
  }

  let event;

  // Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log(`[WEBHOOK VERIFIED] ${timestamp} - Event ID: ${event.id}, Type: ${event.type}`);
  } catch (err) {
    console.error(`[WEBHOOK ERROR] ${timestamp} - Signature verification failed:`, {
      error: err.message,
      signaturePresent: !!sig,
      bodyLength: req.body?.length || 0
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Check for duplicate event (idempotency) - prevent race conditions
    if (isWebhookEventProcessed(event.id)) {
      console.log(`[WEBHOOK IDEMPOTENT] ${timestamp} - Event ${event.id} already processed, skipping`);
      return res.json({ received: true, idempotent: true });
    }

    // Record event immediately to prevent race conditions (idempotent via INSERT OR IGNORE)
    // This ensures that even if processing fails, we won't reprocess the same event
    recordWebhookEvent(event.id, event.type, null, null);

    // Handle checkout.session.completed - subscription activated
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userKey = session.metadata?.userKey;

      console.log(`[WEBHOOK PROCESSING] ${timestamp} - checkout.session.completed`, {
        eventId: event.id,
        sessionId: session.id,
        userKey: userKey || "missing",
        subscriptionId: session.subscription || "missing"
      });

      if (!userKey) {
        console.error(`[WEBHOOK ERROR] ${timestamp} - Missing userKey in session metadata`, {
          eventId: event.id,
          sessionId: session.id
        });
        // Update event record with available data
        recordWebhookEvent(event.id, event.type, session.subscription || null, null);
        return res.json({ received: true, error: "Missing userKey" });
      }

      if (!session.subscription) {
        console.error(`[WEBHOOK ERROR] ${timestamp} - Missing subscription in session`, {
          eventId: event.id,
          sessionId: session.id,
          userKey
        });
        // Update event record with userKey
        recordWebhookEvent(event.id, event.type, null, userKey.trim());
        return res.json({ received: true, error: "Missing subscription" });
      }

      // Always retrieve fresh subscription data from Stripe (source of truth)
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      // Calculate isPro based on current Stripe status - ensure paid users get Pro status
      const isActive = subscription.status === "active" || subscription.status === "trialing";
      const currentPeriodEnd = subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString() 
        : null;
      
      // Store subscription in database keyed by userKey (idempotent via ON CONFLICT)
      // CRITICAL: Always set isPro correctly based on subscription status
      upsertSubscription(userKey.trim(), {
        isPro: isActive, // true if active or trialing
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: currentPeriodEnd,
      });

      // Update event record with final subscription data
      recordWebhookEvent(event.id, event.type, subscription.id, userKey.trim());

      console.log(`[WEBHOOK SUCCESS] ${timestamp} - Subscription activated`, {
        eventId: event.id,
        userKey: userKey.trim(),
        subscriptionId: subscription.id,
        status: subscription.status,
        isPro: isActive,
        currentPeriodEnd
      });
    } 
    // Handle customer.subscription.updated - handles expiration, renewal, status changes
    else if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      
      console.log(`[WEBHOOK PROCESSING] ${timestamp} - customer.subscription.updated`, {
        eventId: event.id,
        subscriptionId: subscription.id,
        status: subscription.status
      });

      // Always retrieve fresh subscription data from Stripe (source of truth)
      const freshSubscription = await stripe.subscriptions.retrieve(subscription.id);
      const existingSub = getSubscriptionByStripeId(freshSubscription.id);

      if (existingSub) {
        // Determine if subscription is active based on current Stripe status
        const isActive = freshSubscription.status === "active" || freshSubscription.status === "trialing";
        const currentPeriodEnd = freshSubscription.current_period_end 
          ? new Date(freshSubscription.current_period_end * 1000).toISOString() 
          : null;

        // Update subscription status (handles expiration when status becomes past_due, unpaid, etc.)
        updateSubscriptionStatus(
          freshSubscription.id,
          freshSubscription.status,
          currentPeriodEnd
        );

        // Also update isPro flag based on status (idempotent via ON CONFLICT)
        // CRITICAL: Always set isPro correctly based on subscription status
        upsertSubscription(existingSub.userKey, {
          isPro: isActive, // true if active or trialing
          stripeCustomerId: freshSubscription.customer,
          stripeSubscriptionId: freshSubscription.id,
          status: freshSubscription.status,
          currentPeriodEnd: currentPeriodEnd,
        });

        // Update event record with subscription data
        recordWebhookEvent(event.id, event.type, freshSubscription.id, existingSub.userKey);

        console.log(`[WEBHOOK SUCCESS] ${timestamp} - Subscription updated`, {
          eventId: event.id,
          subscriptionId: freshSubscription.id,
          userKey: existingSub.userKey,
          status: freshSubscription.status,
          isPro: isActive,
          currentPeriodEnd
        });
      } else {
        console.warn(`[WEBHOOK WARNING] ${timestamp} - Subscription not found in database`, {
          eventId: event.id,
          subscriptionId: subscription.id
        });
        // Update event record with subscription data
        recordWebhookEvent(event.id, event.type, subscription.id, null);
      }
    } 
    // Handle customer.subscription.deleted - subscription canceled
    else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      
      console.log(`[WEBHOOK PROCESSING] ${timestamp} - customer.subscription.deleted`, {
        eventId: event.id,
        subscriptionId: subscription.id
      });

      const existingSub = getSubscriptionByStripeId(subscription.id);

      if (existingSub) {
        // Handle cancel - set status to canceled and isPro to false
        updateSubscriptionStatus(subscription.id, "canceled", null);
        
        // Update isPro to false (idempotent via ON CONFLICT)
        // CRITICAL: Canceled subscriptions are not Pro
        upsertSubscription(existingSub.userKey, {
          isPro: false,
          stripeCustomerId: subscription.customer,
          stripeSubscriptionId: subscription.id,
          status: "canceled",
          currentPeriodEnd: null,
        });

        // Update event record with subscription data
        recordWebhookEvent(event.id, event.type, subscription.id, existingSub.userKey);

        console.log(`[WEBHOOK SUCCESS] ${timestamp} - Subscription canceled`, {
          eventId: event.id,
          subscriptionId: subscription.id,
          userKey: existingSub.userKey
        });
      } else {
        console.warn(`[WEBHOOK WARNING] ${timestamp} - Subscription not found for deletion`, {
          eventId: event.id,
          subscriptionId: subscription.id
        });
        recordWebhookEvent(event.id, event.type, subscription.id, null);
      }
    }
    // Handle other subscription events that indicate expiration
    else if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      
      console.log(`[WEBHOOK PROCESSING] ${timestamp} - invoice.payment_failed`, {
        eventId: event.id,
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription || "none"
      });

      if (invoice.subscription) {
        // Always retrieve fresh subscription data from Stripe
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const existingSub = getSubscriptionByStripeId(subscription.id);

        if (existingSub) {
          const currentPeriodEnd = subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000).toISOString() 
            : null;
          
          // Payment failed - update subscription status
          updateSubscriptionStatus(
            subscription.id,
            subscription.status,
            currentPeriodEnd
          );

          // Update isPro based on current status
          // CRITICAL: Always set isPro correctly based on subscription status
          const isActive = subscription.status === "active" || subscription.status === "trialing";
          upsertSubscription(existingSub.userKey, {
            isPro: isActive, // true if active or trialing
            stripeCustomerId: subscription.customer,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodEnd: currentPeriodEnd,
          });

          // Update event record with subscription data
          recordWebhookEvent(event.id, event.type, subscription.id, existingSub.userKey);

          console.log(`[WEBHOOK SUCCESS] ${timestamp} - Payment failed handled`, {
            eventId: event.id,
            subscriptionId: subscription.id,
            userKey: existingSub.userKey,
            status: subscription.status,
            isPro: isActive
          });
        } else {
          // Update event record with subscription data
          recordWebhookEvent(event.id, event.type, subscription.id, null);
        }
      } else {
        // Update event record (no subscription)
        recordWebhookEvent(event.id, event.type, null, null);
      }
    } else {
      // Unknown event type - log (event already recorded at start)
      console.log(`[WEBHOOK UNKNOWN] ${timestamp} - Unhandled event type: ${event.type}`, {
        eventId: event.id
      });
      // Event already recorded at start, no need to record again
    }

    console.log(`[WEBHOOK COMPLETE] ${timestamp} - Event ${event.id} processed successfully`);
    res.json({ received: true });
  } catch (err) {
    console.error(`[WEBHOOK ERROR] ${timestamp} - Processing failed:`, {
      eventId: event?.id || "unknown",
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;

