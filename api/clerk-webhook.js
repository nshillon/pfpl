// api/clerk-webhook.js
// Syncs Clerk user creation/updates into Supabase `users` table
// Setup: Clerk Dashboard → Webhooks → add endpoint:
//   https://predictivefpl.com/api/clerk-webhook
//   Events: user.created, user.updated
// Required env vars: CLERK_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { Webhook } from "svix";
import { getAdminClient } from "./lib/supabase-admin.js";

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: "CLERK_WEBHOOK_SECRET not set" });

  const rawBody = await getRawBody(req);
  const wh = new Webhook(secret);

  let event;
  try {
    event = wh.verify(rawBody, {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });
  } catch (err) {
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  const { type, data } = event;
  const supabase = getAdminClient();

  if (type === "user.created" || type === "user.updated") {
    const { id, email_addresses, first_name, last_name } = data;
    const email = email_addresses?.[0]?.email_address ?? "";

    const { error } = await supabase.from("users").upsert(
      { id, email, first_name: first_name ?? "", last_name: last_name ?? "" },
      { onConflict: "id" }
    );

    if (error) {
      console.error("[clerk-webhook] Supabase upsert error:", error);
      return res.status(500).json({ error: "DB upsert failed" });
    }

    console.log(`[clerk-webhook] Synced user ${id} (${type})`);
  }

  return res.status(200).json({ received: true });
}
