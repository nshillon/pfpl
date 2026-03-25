// api/stripe-checkout.js
// Creates a Stripe Checkout session for Pro plan subscription
// Required env vars:
//   STRIPE_SECRET_KEY
//   STRIPE_PRO_PRICE_ID    (your Stripe Price ID for the Pro plan)
//   APP_URL                (e.g. https://predictivefpl.com)

import Stripe from "stripe";
import { getAdminClient } from "./lib/supabase-admin.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.APP_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId, email } = req.body;

  if (!userId || !email) {
    return res.status(400).json({ error: "userId and email are required" });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = getAdminClient();
  const appUrl = process.env.APP_URL || "https://predictivefpl.com";

  try {
    // Get or create Stripe customer
    let { data: user } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    let customerId = user?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { clerk_user_id: userId } });
      customerId = customer.id;
      await supabase.from("users").update({ stripe_customer_id: customerId }).eq("id", userId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
      success_url: `${appUrl}/dashboard?upgrade=success`,
      cancel_url: `${appUrl}/pricing?upgrade=canceled`,
      metadata: { clerk_user_id: userId },
      subscription_data: {
        metadata: { clerk_user_id: userId },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("[stripe-checkout] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
