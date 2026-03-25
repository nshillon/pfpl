// api/admin-users.js
// Vercel serverless function — fetches user list from Clerk Backend API
// Required env var: CLERK_SECRET_KEY (set in Vercel project settings)

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const secretKey = process.env.CLERK_SECRET_KEY;

  // Debug: surface missing key clearly
  if (!secretKey) {
    console.error("[admin-users] CLERK_SECRET_KEY is not set in environment variables");
    return res.status(500).json({
      error: "Server misconfiguration: CLERK_SECRET_KEY is missing.",
      hint: "Add CLERK_SECRET_KEY to your Vercel project environment variables at vercel.com/[team]/[project]/settings/environment-variables",
    });
  }

  try {
    // Fetch up to 500 users from Clerk
    const clerkRes = await fetch(
      "https://api.clerk.com/v1/users?limit=500&order_by=-created_at",
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!clerkRes.ok) {
      const errBody = await clerkRes.text();
      console.error("[admin-users] Clerk API error:", clerkRes.status, errBody);
      return res.status(clerkRes.status).json({
        error: `Clerk API returned ${clerkRes.status}`,
        detail: errBody,
      });
    }

    const users = await clerkRes.json();

    // Shape the data — only expose what the admin UI needs
    const shaped = users.map((u) => ({
      id: u.id,
      email: u.email_addresses?.[0]?.email_address ?? "(no email)",
      firstName: u.first_name ?? "",
      lastName: u.last_name ?? "",
      username: u.username ?? null,
      imageUrl: u.image_url ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at,
      banned: u.banned ?? false,
    }));

    return res.status(200).json({ users: shaped, total: shaped.length });
  } catch (err) {
    console.error("[admin-users] Unexpected error:", err);
    return res.status(500).json({ error: "Failed to fetch users", detail: err.message });
  }
}
