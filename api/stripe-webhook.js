// api/stripe-webhook.js
// Handles Stripe webhook events to keep DB in sync with subscription status
// Required env vars:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET   (from Stripe Dashboard > Webhooks)
//
// In Vercel: mark this function as NOT buffering body — add to vercel.json:
//   { "functions": { "api/stripe-webhook.js": { "bodyParser": false } } }
// OR use the config export below (Next.js style, works with Vercel)

import Stripe from "stripe";
import { getAdminClient } from "./lib/supabase-admin.js";

// Disable body parsing so we get raw body for signature verification
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = getAdminClient();
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  const sub = event.data.object;

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const userId = sub.metadata?.clerk_user_id;
        if (!userId) break;
        const isActive = sub.status === "active" || sub.status === "trialing";
        await supabase.from("users").update({
          plan: isActive ? "pro" : "free",
          stripe_subscription_id: sub.id,
          subscription_status: sub.status,
        }).eq("id", userId);
        console.log(`[stripe-webhook] Updated user ${userId} plan: ${isActive ? "pro" : "free"}`);
        break;
      }

      case "customer.subscription.deleted": {
        const userId = sub.metadata?.clerk_user_id;
        if (!userId) break;
        await supabase.from("users").update({
          plan: "free",
          stripe_subscription_id: null,
          subscription_status: "canceled",
        }).eq("id", userId);
        console.log(`[stripe-webhook] Canceled subscription for user ${userId}`);
        break;
      }

      default:
        // Ignore other events
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] DB update error:", err);
    return res.status(500).json({ error: "DB update failed" });
  }

  return res.status(200).json({ received: true });
}
