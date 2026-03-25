// api/lib/supabase-admin.js
// Server-side Supabase client using SERVICE ROLE key (bypasses RLS)
// NEVER expose SUPABASE_SERVICE_ROLE_KEY to the frontend
// Required env vars (Vercel server-side only):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";

export function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
