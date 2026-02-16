
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function listPrices() {
    console.log("Fetching Stripe Prices...");
    const monthlyId = process.env.STRIPE_PRICE_ID_MONTHLY;
    const annualId = process.env.STRIPE_PRICE_ID_ANNUAL;

    if (monthlyId) {
        try {
            const price = await stripe.prices.retrieve(monthlyId);
            console.log(`Monthly (${monthlyId}): ${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}`);
        } catch (e) { console.error("Error fetching monthly:", e.message); }
    }

    if (annualId) {
        try {
            const price = await stripe.prices.retrieve(annualId);
            console.log(`Annual (${annualId}): ${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}`);
        } catch (e) { console.error("Error fetching annual:", e.message); }
    }
}

listPrices();
