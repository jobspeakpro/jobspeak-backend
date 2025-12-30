import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// Initialize Stripe - handle missing env var gracefully (don't crash on boot)
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY is required in environment variables");
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// -------------------------
// CREATE CHECKOUT SESSION
// -------------------------
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { plan } = req.body;

    // Defensive logging: check which env vars are present (without printing secrets)
    console.log("🔍 Environment variables check:");
    console.log("  - STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY ? "✅ present" : "❌ missing");
    console.log("  - STRIPE_PRICE_ID_MONTHLY:", process.env.STRIPE_PRICE_ID_MONTHLY ? "✅ present" : "❌ missing");
    console.log("  - STRIPE_PRICE_ID_ANNUAL:", process.env.STRIPE_PRICE_ID_ANNUAL ? "✅ present" : "❌ missing");
    console.log("  - FRONTEND_URL:", process.env.FRONTEND_URL ? "✅ present" : "❌ missing");
    console.log("  - SUCCESS_URL:", process.env.SUCCESS_URL ? "✅ present" : "❌ missing");
    console.log("  - CANCEL_URL:", process.env.CANCEL_URL ? "✅ present" : "❌ missing");

    // Validate required environment variables
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

    // Check for FRONTEND_URL or SUCCESS_URL/CANCEL_URL
    const hasFrontendUrl = !!process.env.FRONTEND_URL;
    const hasSuccessUrl = !!process.env.SUCCESS_URL;
    const hasCancelUrl = !!process.env.CANCEL_URL;

    if (!hasFrontendUrl && (!hasSuccessUrl || !hasCancelUrl)) {
      if (!hasFrontendUrl) {
        missingVars.push("FRONTEND_URL");
      }
      if (!hasSuccessUrl) {
        missingVars.push("SUCCESS_URL");
      }
      if (!hasCancelUrl) {
        missingVars.push("CANCEL_URL");
      }
    }

    if (missingVars.length > 0) {
      console.error("❌ Missing required environment variables:", missingVars.join(", "));
      return res.status(400).json({
        error: `Missing required environment variables: ${missingVars.join(", ")}`,
        missing: missingVars,
      });
    }

    const MONTHLY_PRICE_ID = process.env.STRIPE_PRICE_ID_MONTHLY;
    const ANNUAL_PRICE_ID = process.env.STRIPE_PRICE_ID_ANNUAL;

    const priceToUse = plan === "annual" ? ANNUAL_PRICE_ID : MONTHLY_PRICE_ID;

    console.log("➡ Creating Stripe session with plan:", plan);
    console.log("➡ Using price ID:", priceToUse);

    if (!stripe) {
      console.error("❌ Stripe not initialized");
      return res.status(500).json({ error: "Stripe not initialized" });
    }

    // Determine success and cancel URLs
    const successUrl = "https://www.jobspeakpro.com/dashboard?success=true";
    const cancelUrl = "https://www.jobspeakpro.com/pricing?canceled=true";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceToUse,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    console.log("✅ Stripe session created:", session.id);
    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe session error:", err?.message || err);
    res.status(500).json({
      error: err?.message || "Stripe session failed",
    });
  }
});

export default router;
