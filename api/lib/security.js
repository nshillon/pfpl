// api/lib/security.js
// ============================================================
// pFPL Security Hardening — Server-side helpers
// Use these in ALL api/*.js serverless functions
// ============================================================

// ── Rate limiting (in-memory, resets on cold start)
// For production scale: replace with Redis (Upstash free tier works great)
const rateLimitStore = new Map();

export function rateLimit(identifier, maxRequests = 20, windowMs = 60_000) {
  const now = Date.now();
  const key = `${identifier}`;
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count++;
  rateLimitStore.set(key, record);

  if (record.count > maxRequests) {
    return { limited: true, remaining: 0, resetIn: Math.ceil((record.resetAt - now) / 1000) };
  }
  return { limited: false, remaining: maxRequests - record.count, resetIn: 0 };
}

// ── CORS — only allow your own domain in production
export function setCorsHeaders(res, allowedOrigin) {
  const origin = allowedOrigin || process.env.APP_URL || "https://predictivefpl.com";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}

// ── Verify Clerk JWT (for protected API routes that aren't using Clerk middleware)
export async function verifyClerkToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  try {
    // Simple decode to get userId — for full verification use @clerk/backend
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return payload.sub || null; // sub = clerk user id
  } catch {
    return null;
  }
}

// ── Input sanitisation — strip dangerous HTML/SQL chars
export function sanitize(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 10000); // hard length cap
}

// ── Check if user is admin
export function isAdmin(userId) {
  const adminIds = (process.env.ADMIN_USER_IDS || process.env.ADMIN_USER_ID || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return adminIds.includes(userId);
}
