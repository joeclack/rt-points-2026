import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?.trim()
    .replace(/\/rest\/v1\/?$/, "")
    .replace(/\/+$/, "");
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error("Supabase admin credentials are not configured");
  }

  return createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";
  const url = configuredUrl.startsWith("http")
    ? configuredUrl
    : `https://${configuredUrl}`;

  return url.replace(/\/+$/, "");
}
