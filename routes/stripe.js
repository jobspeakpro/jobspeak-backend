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

    const MONTHLY_PRICE_ID = process.env.STRIPE_PRICE_ID_MONTHLY;
    const ANNUAL_PRICE_ID = process.env.STRIPE_PRICE_ID_ANNUAL;

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("❌ Missing STRIPE_SECRET_KEY in env");
      return res
        .status(500)
        .json({ error: "Backend missing STRIPE_SECRET_KEY" });
    }

    if (!MONTHLY_PRICE_ID || !ANNUAL_PRICE_ID) {
      console.error("❌ Missing Stripe price IDs in env");
      return res
        .status(500)
        .json({ error: "Stripe price IDs not configured in backend" });
    }

    const priceToUse = plan === "annual" ? ANNUAL_PRICE_ID : MONTHLY_PRICE_ID;

    console.log("➡ Creating Stripe session with plan:", plan);
    console.log("➡ Using price ID:", priceToUse);

    if (!stripe) {
      return res.status(500).json({ error: "Stripe not initialized" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceToUse,
          quantity: 1,
        },
      ],
      success_url: process.env.SUCCESS_URL,
      cancel_url: process.env.CANCEL_URL,
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
