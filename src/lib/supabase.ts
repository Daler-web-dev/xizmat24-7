import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// =====================================================================
// Server-only Supabase client (service_role). This module imports
// "server-only", so any attempt to bundle it into client code is a build
// error. The service_role key bypasses RLS — it must never reach the browser.
// =====================================================================

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase env missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-only)."
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
