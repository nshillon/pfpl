// src/lib/supabase.js
// Supabase client — used throughout the app
// Required env vars (set in Vercel + .env.local):
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_ANON_KEY

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
