// api/admin-email.js
// Email marketing tool for admin — sends to all users or segments
// Uses Resend (resend.com) — free tier: 3,000 emails/month
// Required env vars: RESEND_API_KEY, ADMIN_USER_ID, CLERK_SECRET_KEY
// 
// POST body: { subject, body, segment: 'all' | 'pro' | 'free', preview }
//   preview: true → returns recipients list without sending

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.APP_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Admin auth check — caller must pass their Clerk userId
  const { subject, htmlBody, textBody, segment = "all", preview = false, adminUserId } = req.body;

  if (!adminUserId || adminUserId !== process.env.ADMIN_USER_ID) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!subject || !htmlBody) {
    return res.status(400).json({ error: "subject and htmlBody are required" });
  }

  // Fetch users from Clerk
  const clerkRes = await fetch(
    "https://api.clerk.com/v1/users?limit=500&order_by=-created_at",
    { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } }
  );
  if (!clerkRes.ok) {
    return res.status(502).json({ error: "Failed to fetch users from Clerk" });
  }
  const clerkUsers = await clerkRes.json();

  // Build recipients list
  let recipients = clerkUsers
    .map((u) => ({
      email: u.email_addresses?.[0]?.email_address,
      name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Manager",
      id: u.id,
    }))
    .filter((u) => !!u.email);

  // Filter by segment (if using Supabase for plan data)
  // If you have Supabase, uncomment below:
  // if (segment !== 'all') {
  //   const { data } = await getAdminClient().from('users').select('id, plan').eq('plan', segment);
  //   const ids = new Set((data || []).map(u => u.id));
  //   recipients = recipients.filter(r => ids.has(r.id));
  // }

  if (preview) {
    return res.status(200).json({
      preview: true,
      segment,
      recipientCount: recipients.length,
      recipients: recipients.slice(0, 10), // only show first 10 in preview
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "RESEND_API_KEY not configured" });
  }

  // Send via Resend
  const results = { sent: 0, failed: 0, errors: [] };

  // Batch in groups of 50 to respect rate limits
  const BATCH = 50;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (r) => {
        try {
          const personalised = htmlBody
            .replace(/\{\{name\}\}/g, r.name)
            .replace(/\{\{email\}\}/g, r.email);

          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM || "pFPL <noreply@predictivefpl.com>",
              to: [r.email],
              subject,
              html: personalised,
              text: textBody || personalised.replace(/<[^>]+>/g, ""),
            }),
          });
          if (resp.ok) results.sent++;
          else {
            results.failed++;
            results.errors.push({ email: r.email, status: resp.status });
          }
        } catch (err) {
          results.failed++;
          results.errors.push({ email: r.email, error: err.message });
        }
      })
    );
    // Small delay between batches
    if (i + BATCH < recipients.length) await sleep(500);
  }

  console.log(`[admin-email] Sent ${results.sent}/${recipients.length} emails (segment: ${segment})`);
  return res.status(200).json({ ...results, total: recipients.length, segment });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
